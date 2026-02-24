// Shared Agent Tools
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Tool, AgentContext } from './types.ts';

// Helper to get Supabase client
function getSupabase() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

// ============================================
// ORDER TOOLS
// ============================================

export const queryOrdersTool: Tool = {
  name: 'queryOrders',
  description: 'Query orders with filters. Returns matching orders.',
  parameters: [
    { name: 'companyId', type: 'string', required: false, description: 'Filter by company ID' },
    { name: 'status', type: 'array', required: false, description: 'Filter by status (array)' },
    { name: 'olderThanHours', type: 'number', required: false, description: 'Orders older than X hours' },
    { name: 'limit', type: 'number', required: false, description: 'Max results (default 100)' },
  ],
  execute: async (params, context) => {
    const supabase = getSupabase();
    const companyId = (params.companyId as string) || context.companyId;
    const status = params.status as string[] | undefined;
    const olderThanHours = params.olderThanHours as number | undefined;
    const limit = (params.limit as number) || 100;
    
    let query = supabase
      .from('orders')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (status && status.length > 0) {
      query = query.in('status', status);
    }
    
    if (olderThanHours) {
      const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
      query = query.lt('created_at', cutoff.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Query failed: ${error.message}`);
    return data;
  },
};

export const createAlertTool: Tool = {
  name: 'createAlert',
  description: 'Create an alert/notification for the team',
  parameters: [
    { name: 'title', type: 'string', required: true, description: 'Alert title' },
    { name: 'message', type: 'string', required: true, description: 'Alert message' },
    { name: 'severity', type: 'string', required: true, description: 'low, medium, high, critical' },
    { name: 'orderId', type: 'string', required: false, description: 'Related order ID' },
  ],
  execute: async (params, context) => {
    const supabase = getSupabase();
    
    // Log to audit_logs as an alert
    const { error } = await supabase.from('audit_logs').insert({
      action: 'create',
      resource_type: 'order',
      resource_id: params.orderId as string || null,
      company_id: context.companyId,
      details: {
        alert: true,
        title: params.title,
        message: params.message,
        severity: params.severity,
        source: 'agent',
      },
    });
    
    if (error) throw new Error(`Failed to create alert: ${error.message}`);
    
    console.log(`[ALERT] ${params.severity}: ${params.title} - ${params.message}`);
    return { success: true, alert: params };
  },
};

export const logAgentActionTool: Tool = {
  name: 'logAgentAction',
  description: 'Log an agent action for transparency and debugging',
  parameters: [
    { name: 'action', type: 'string', required: true, description: 'Action name' },
    { name: 'details', type: 'object', required: false, description: 'Action details' },
    { name: 'severity', type: 'string', required: false, description: 'info, warning, error, success' },
  ],
  execute: async (params, context) => {
    const supabase = getSupabase();
    
    const { error } = await supabase.from('audit_logs').insert({
      action: 'create',
      resource_type: 'order',
      company_id: context.companyId,
      details: {
        agent_action: true,
        action_name: params.action,
        action_details: params.details || {},
        severity: params.severity || 'info',
      },
    });
    
    if (error) throw new Error(`Failed to log action: ${error.message}`);
    return { logged: true };
  },
};

// ============================================
// SLA TOOLS
// ============================================

export const calculateSLARiskTool: Tool = {
  name: 'calculateSLARisk',
  description: 'Calculate SLA risk for an order based on age, status, and company SLA rules',
  parameters: [
    { name: 'orderId', type: 'string', required: true, description: 'Order ID' },
  ],
  execute: async (params, context) => {
    const supabase = getSupabase();
    const orderId = params.orderId as string;
    
    // Get order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError || !order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    
    // Calculate hours since order was created
    const createdAt = new Date(order.created_at);
    const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    
    // Get company SLA settings (if any)
    const { data: kpis } = await supabase
      .from('company_kpis')
      .select('*')
      .eq('company_id', order.company_id)
      .eq('kpi_type', 'delivery_time_sla')
      .eq('is_active', true)
      .limit(1);
    
    // Default SLA thresholds (hours)
    const slaThreshold = kpis?.[0]?.target_value || 48; // Default: 48 hours
    const warningThreshold = kpis?.[0]?.warning_threshold || 36; // Default: 36 hours
    
    // Calculate risk factors
    const riskFactors: string[] = [];
    let risk = 0;
    
    // Factor 1: Age
    if (hoursOld > slaThreshold) {
      risk += 0.5;
      riskFactors.push(`Order is ${Math.round(hoursOld)}h old, exceeds SLA of ${slaThreshold}h`);
    } else if (hoursOld > warningThreshold) {
      risk += 0.3;
      riskFactors.push(`Order is ${Math.round(hoursOld)}h old, approaching SLA warning threshold`);
    }
    
    // Factor 2: Status
    const statusProgress: Record<string, number> = {
      'received': 0,
      'putaway': 0.1,
      'picking': 0.3,
      'packing': 0.6,
      'ready_to_ship': 0.8,
      'shipped': 0.95,
      'delivered': 1,
    };
    
    const expectedProgress = Math.min(hoursOld / slaThreshold, 1);
    const actualProgress = statusProgress[order.status] || 0;
    
    if (actualProgress < expectedProgress - 0.2) {
      risk += 0.3;
      riskFactors.push(`Status "${order.status}" is behind expected progress`);
    }
    
    // Factor 3: High value orders
    if (order.order_amount && order.order_amount > 1000) {
      risk += 0.1;
      riskFactors.push(`High-value order (${order.order_amount} CHF)`);
    }
    
    // Normalize risk to 0-1
    risk = Math.min(risk, 1);
    
    // Determine urgency
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (risk > 0.8) urgency = 'critical';
    else if (risk > 0.6) urgency = 'high';
    else if (risk > 0.3) urgency = 'medium';
    
    // Generate recommendation
    let recommendation = 'Order is on track.';
    if (urgency === 'critical') {
      recommendation = 'IMMEDIATE ACTION REQUIRED: Order is at critical SLA risk. Escalate to team lead.';
    } else if (urgency === 'high') {
      recommendation = 'PRIORITY: Order needs attention. Consider expediting processing.';
    } else if (urgency === 'medium') {
      recommendation = 'MONITOR: Order is approaching SLA limits. Keep an eye on progress.';
    }
    
    return {
      orderId,
      risk,
      factors: riskFactors,
      recommendation,
      urgency,
      hoursOld: Math.round(hoursOld * 10) / 10,
      slaThreshold,
      status: order.status,
    };
  },
};

// ============================================
// NOTIFICATION TOOLS  
// ============================================

export const sendInternalNotificationTool: Tool = {
  name: 'sendInternalNotification',
  description: 'Send an internal notification (logged to audit, no actual push/email)',
  parameters: [
    { name: 'title', type: 'string', required: true, description: 'Notification title' },
    { name: 'message', type: 'string', required: true, description: 'Notification message' },
    { name: 'priority', type: 'string', required: false, description: 'low, medium, high' },
    { name: 'targetRole', type: 'string', required: false, description: 'Target role (admin, msd_csm, etc.)' },
  ],
  execute: async (params, context) => {
    const supabase = getSupabase();
    
    const { error } = await supabase.from('audit_logs').insert({
      action: 'create',
      resource_type: 'order',
      company_id: context.companyId,
      details: {
        notification: true,
        title: params.title,
        message: params.message,
        priority: params.priority || 'medium',
        target_role: params.targetRole,
        source: 'agent',
      },
    });
    
    if (error) throw new Error(`Failed to send notification: ${error.message}`);
    
    console.log(`[NOTIFICATION] ${params.priority || 'medium'}: ${params.title}`);
    return { sent: true };
  },
};

// Export all tools
export const allTools: Tool[] = [
  queryOrdersTool,
  createAlertTool,
  logAgentActionTool,
  calculateSLARiskTool,
  sendInternalNotificationTool,
];
