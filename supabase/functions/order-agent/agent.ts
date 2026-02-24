// Order Management Agent
// Überwacht Bestellungen, erkennt SLA-Risiken, priorisiert automatisch

import { BaseAgent } from '../_shared/agent-framework/base-agent.ts';
import type { 
  AgentContext, 
  Observation, 
  Thought,
  Tool,
  OrderWithRisk,
} from '../_shared/agent-framework/types.ts';
import { 
  queryOrdersTool, 
  createAlertTool, 
  calculateSLARiskTool,
  sendInternalNotificationTool,
  logAgentActionTool,
} from '../_shared/agent-framework/tools.ts';

export class OrderManagementAgent extends BaseAgent {
  name = 'Order Management Agent';
  description = 'Intelligente Bestellungs-Verwaltung mit SLA-Aware-Priorisierung und Anomalie-Erkennung';
  
  tools: Tool[] = [
    queryOrdersTool,
    createAlertTool,
    calculateSLARiskTool,
    sendInternalNotificationTool,
    logAgentActionTool,
  ];
  
  // Observe active orders and detect issues
  async observe(context: AgentContext): Promise<Observation[]> {
    const observations: Observation[] = [];
    
    // Define order type for this function
    interface OrderRecord {
      id: string;
      source_no: string;
      company_id: string;
      status: string;
      order_date: string;
      created_at: string;
      order_amount: number | null;
      ship_to_name: string;
    }
    
    // 1. Get all active (non-delivered) orders
    const { data: activeOrders, error } = await this.supabase
      .from('orders')
      .select('id, source_no, company_id, status, order_date, created_at, order_amount, ship_to_name')
      .eq('company_id', context.companyId)
      .not('status', 'in', '(shipped,delivered)')
      .order('created_at', { ascending: true })
      .limit(200) as { data: OrderRecord[] | null; error: unknown };
    
    if (error) {
      this.log('error', 'Failed to fetch orders', { error: String(error) });
      return observations;
    }
    
    if (!activeOrders || activeOrders.length === 0) {
      this.log('info', 'No active orders found');
      return observations;
    }
    
    this.log('info', `Analyzing ${activeOrders.length} active orders`);
    
    // 2. Analyze each order for SLA risk
    const ordersWithRisk: OrderWithRisk[] = [];
    
    for (const order of activeOrders) {
      const createdAt = new Date(order.created_at);
      const hoursOld = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      
      // Simple risk calculation
      const riskFactors: string[] = [];
      let risk = 0;
      
      // Age-based risk
      if (hoursOld > 72) {
        risk += 0.5;
        riskFactors.push(`Sehr alt (${Math.round(hoursOld)}h)`);
      } else if (hoursOld > 48) {
        risk += 0.3;
        riskFactors.push(`Alt (${Math.round(hoursOld)}h)`);
      } else if (hoursOld > 24) {
        risk += 0.1;
        riskFactors.push(`24+ Stunden alt`);
      }
      
      // Status-based risk
      const statusRisk: Record<string, number> = {
        'received': 0.2,
        'putaway': 0.15,
        'picking': 0.1,
        'packing': 0.05,
        'ready_to_ship': 0,
      };
      
      if (hoursOld > 24 && ['received', 'putaway'].includes(order.status)) {
        risk += statusRisk[order.status] || 0;
        riskFactors.push(`Noch in frühem Status: ${order.status}`);
      }
      
      // High value risk
      if (order.order_amount && order.order_amount > 500) {
        risk += 0.1;
        riskFactors.push(`Hoher Wert: ${order.order_amount} CHF`);
      }
      
      risk = Math.min(risk, 1);
      
      let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (risk > 0.7) priority = 'critical';
      else if (risk > 0.5) priority = 'high';
      else if (risk > 0.3) priority = 'medium';
      
      ordersWithRisk.push({
        id: order.id,
        source_no: order.source_no,
        company_id: order.company_id,
        status: order.status,
        order_date: order.order_date,
        created_at: order.created_at,
        order_amount: order.order_amount,
        ship_to_name: order.ship_to_name,
        slaRisk: risk,
        riskFactors,
        priority,
        hoursInCurrentStatus: hoursOld,
      });
    }
    
    // 3. Create observations for high-risk orders
    const criticalOrders = ordersWithRisk.filter(o => o.priority === 'critical');
    const highRiskOrders = ordersWithRisk.filter(o => o.priority === 'high');
    const mediumRiskOrders = ordersWithRisk.filter(o => o.priority === 'medium');
    
    // Summary observation
    observations.push({
      type: 'order_summary',
      data: {
        totalActive: activeOrders.length,
        critical: criticalOrders.length,
        high: highRiskOrders.length,
        medium: mediumRiskOrders.length,
        low: ordersWithRisk.filter(o => o.priority === 'low').length,
      },
      confidence: 1.0,
      timestamp: new Date(),
      source: 'order_analysis',
    });
    
    // Individual critical order observations
    for (const order of criticalOrders) {
      observations.push({
        type: 'critical_order',
        data: order,
        confidence: 0.95,
        timestamp: new Date(),
        source: 'sla_risk_analysis',
      });
    }
    
    // Batch high-risk observation
    if (highRiskOrders.length > 0) {
      observations.push({
        type: 'high_risk_orders',
        data: {
          count: highRiskOrders.length,
          orders: highRiskOrders.slice(0, 5), // Top 5
        },
        confidence: 0.9,
        timestamp: new Date(),
        source: 'sla_risk_analysis',
      });
    }
    
    // 4. Detect anomalies
    // Anomaly: Sudden spike in orders
    const recentOrders = activeOrders.filter(o => {
      const age = (Date.now() - new Date(o.created_at).getTime()) / (1000 * 60 * 60);
      return age < 4; // Last 4 hours
    });
    
    if (recentOrders.length > 10) {
      observations.push({
        type: 'order_spike',
        data: {
          recentCount: recentOrders.length,
          message: `${recentOrders.length} Bestellungen in den letzten 4 Stunden`,
        },
        confidence: 0.8,
        timestamp: new Date(),
        source: 'anomaly_detection',
      });
    }
    
    // Anomaly: Orders stuck in same status too long
    const stuckOrders = ordersWithRisk.filter(o => 
      o.hoursInCurrentStatus > 24 && 
      ['received', 'putaway'].includes(o.status)
    );
    
    if (stuckOrders.length > 3) {
      observations.push({
        type: 'stuck_orders',
        data: {
          count: stuckOrders.length,
          orders: stuckOrders.slice(0, 3),
          message: `${stuckOrders.length} Bestellungen stecken fest`,
        },
        confidence: 0.85,
        timestamp: new Date(),
        source: 'anomaly_detection',
      });
    }
    
    return observations;
  }
  
  // Fallback thinking without AI
  protected thinkWithoutAI(observations: Observation[]): Thought[] {
    const thoughts: Thought[] = [];
    
    for (const obs of observations) {
      switch (obs.type) {
        case 'critical_order': {
          const order = obs.data as OrderWithRisk;
          thoughts.push({
            reasoning: `Bestellung ${order.source_no} hat kritisches SLA-Risiko (${(order.slaRisk * 100).toFixed(0)}%). ` +
              `Faktoren: ${order.riskFactors.join(', ')}. Sofortige Aktion erforderlich.`,
            confidence: 0.9,
            actions: [
              {
                type: 'create_alert',
                tool: 'createAlert',
                params: {
                  title: `SLA-Risiko: ${order.source_no}`,
                  message: `Bestellung ${order.source_no} ist kritisch. ${order.riskFactors.join('. ')}.`,
                  severity: 'critical',
                  orderId: order.id,
                },
                priority: 10,
              },
              {
                type: 'notify_team',
                tool: 'sendInternalNotification',
                params: {
                  title: `⚠️ Kritische Bestellung: ${order.source_no}`,
                  message: `Bestellung ${order.source_no} für ${order.ship_to_name} benötigt sofortige Aufmerksamkeit. ` +
                    `Status: ${order.status}, Alter: ${Math.round(order.hoursInCurrentStatus)}h`,
                  priority: 'high',
                  targetRole: 'msd_ma',
                },
                priority: 9,
              },
            ],
          });
          break;
        }
        
        case 'high_risk_orders': {
          const data = obs.data as { count: number; orders: OrderWithRisk[] };
          thoughts.push({
            reasoning: `${data.count} Bestellungen mit hohem Risiko gefunden. Team sollte informiert werden.`,
            confidence: 0.8,
            actions: [
              {
                type: 'create_alert',
                tool: 'createAlert',
                params: {
                  title: `${data.count} Bestellungen mit hohem SLA-Risiko`,
                  message: `Es gibt ${data.count} Bestellungen die beobachtet werden sollten: ` +
                    data.orders.map(o => o.source_no).join(', '),
                  severity: 'high',
                },
                priority: 7,
              },
            ],
          });
          break;
        }
        
        case 'stuck_orders': {
          const data = obs.data as { count: number; orders: OrderWithRisk[]; message: string };
          thoughts.push({
            reasoning: `${data.count} Bestellungen stecken in frühen Status fest. Möglicher Prozess-Engpass.`,
            confidence: 0.85,
            actions: [
              {
                type: 'create_alert',
                tool: 'createAlert',
                params: {
                  title: `Prozess-Engpass: ${data.count} Bestellungen stecken fest`,
                  message: data.message + `. Bestellungen: ${data.orders.map(o => o.source_no).join(', ')}`,
                  severity: 'medium',
                },
                priority: 6,
              },
            ],
          });
          break;
        }
        
        case 'order_spike': {
          const data = obs.data as { recentCount: number; message: string };
          thoughts.push({
            reasoning: `Ungewöhnlich hohe Anzahl neuer Bestellungen (${data.recentCount} in 4h). Team informieren.`,
            confidence: 0.75,
            actions: [
              {
                type: 'notify_spike',
                tool: 'sendInternalNotification',
                params: {
                  title: `📈 Bestell-Spike: ${data.recentCount} neue Bestellungen`,
                  message: data.message + `. Kapazität prüfen!`,
                  priority: 'medium',
                  targetRole: 'msd_ma',
                },
                priority: 5,
              },
            ],
          });
          break;
        }
        
        case 'order_summary': {
          const summary = obs.data as { 
            totalActive: number; 
            critical: number; 
            high: number; 
            medium: number;
            low: number;
          };
          
          // Only log if there are no issues
          if (summary.critical === 0 && summary.high === 0) {
            thoughts.push({
              reasoning: `Alle ${summary.totalActive} aktiven Bestellungen sind auf Kurs. Keine Aktion erforderlich.`,
              confidence: 0.95,
              actions: [
                {
                  type: 'log_status',
                  tool: 'logAgentAction',
                  params: {
                    action: 'order_health_check',
                    details: summary,
                    severity: 'success',
                  },
                  priority: 1,
                },
              ],
            });
          }
          break;
        }
      }
    }
    
    return thoughts;
  }
}
