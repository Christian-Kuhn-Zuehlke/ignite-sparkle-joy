import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AOVTrendResult {
  companyId: string;
  companyName: string;
  currentAOV: number;
  previousAOV: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  alertTriggered: boolean;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { companyId, thresholdPercent = 10 } = await req.json().catch(() => ({}));

    console.log(`AOV Trend Monitor started for company: ${companyId || 'all'}, threshold: ${thresholdPercent}%`);

    // Get current month AOV
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

    // Build query for current month
    let currentQuery = supabase
      .from('orders')
      .select('company_id, order_amount')
      .gte('order_date', currentMonthStart)
      .not('order_amount', 'is', null);

    let previousQuery = supabase
      .from('orders')
      .select('company_id, order_amount')
      .gte('order_date', previousMonthStart)
      .lt('order_date', currentMonthStart)
      .not('order_amount', 'is', null);

    if (companyId) {
      currentQuery = currentQuery.eq('company_id', companyId);
      previousQuery = previousQuery.eq('company_id', companyId);
    }

    const [currentResult, previousResult] = await Promise.all([
      currentQuery,
      previousQuery
    ]);

    if (currentResult.error) throw currentResult.error;
    if (previousResult.error) throw previousResult.error;

    // Group by company and calculate AOV
    const currentByCompany: Record<string, number[]> = {};
    const previousByCompany: Record<string, number[]> = {};

    for (const order of currentResult.data || []) {
      if (!currentByCompany[order.company_id]) {
        currentByCompany[order.company_id] = [];
      }
      currentByCompany[order.company_id].push(order.order_amount);
    }

    for (const order of previousResult.data || []) {
      if (!previousByCompany[order.company_id]) {
        previousByCompany[order.company_id] = [];
      }
      previousByCompany[order.company_id].push(order.order_amount);
    }

    // Get company names
    const companyIds = [...new Set([...Object.keys(currentByCompany), ...Object.keys(previousByCompany)])];
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')
      .in('id', companyIds);

    const companyNameMap: Record<string, string> = {};
    for (const company of companies || []) {
      companyNameMap[company.id] = company.name;
    }

    // Calculate trends and trigger alerts
    const results: AOVTrendResult[] = [];
    const alertsToSend: Array<{ companyId: string; companyName: string; changePercent: number; currentAOV: number; previousAOV: number }> = [];

    for (const cId of companyIds) {
      const currentAmounts = currentByCompany[cId] || [];
      const previousAmounts = previousByCompany[cId] || [];

      if (currentAmounts.length === 0 || previousAmounts.length === 0) continue;

      const currentAOV = currentAmounts.reduce((a, b) => a + b, 0) / currentAmounts.length;
      const previousAOV = previousAmounts.reduce((a, b) => a + b, 0) / previousAmounts.length;
      const changePercent = ((currentAOV - previousAOV) / previousAOV) * 100;

      const trend = changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable';
      const alertTriggered = changePercent <= -thresholdPercent;

      results.push({
        companyId: cId,
        companyName: companyNameMap[cId] || cId,
        currentAOV: Math.round(currentAOV * 100) / 100,
        previousAOV: Math.round(previousAOV * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        trend,
        alertTriggered
      });

      if (alertTriggered) {
        alertsToSend.push({
          companyId: cId,
          companyName: companyNameMap[cId] || cId,
          changePercent: Math.round(changePercent * 100) / 100,
          currentAOV: Math.round(currentAOV * 100) / 100,
          previousAOV: Math.round(previousAOV * 100) / 100
        });
      }
    }

    // Send notifications for triggered alerts
    for (const alert of alertsToSend) {
      console.log(`Sending AOV decline alert for ${alert.companyName}: ${alert.changePercent}%`);

      // Log to audit_logs as a notification
      await supabase.from('audit_logs').insert({
        action: 'create',
        resource_type: 'kpi',
        company_id: alert.companyId,
        details: {
          type: 'aov_decline_warning',
          title: 'AOV Trend-Warnung',
          message: `Durchschnittlicher Bestellwert ist um ${Math.abs(alert.changePercent)}% gesunken (${alert.previousAOV} → ${alert.currentAOV} CHF)`,
          severity: alert.changePercent <= -20 ? 'critical' : 'warning',
          currentAOV: alert.currentAOV,
          previousAOV: alert.previousAOV,
          changePercent: alert.changePercent
        }
      });

      // Also send push notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            companyId: alert.companyId,
            notificationType: 'notify_sla_warning',
            title: '⚠️ AOV Trend-Warnung',
            body: `Bestellwert gesunken: ${alert.previousAOV} → ${alert.currentAOV} CHF (${alert.changePercent}%)`,
            url: '/kpis'
          })
        });
      } catch (e) {
        console.error('Failed to send push notification:', e);
      }
    }

    console.log(`AOV Trend Monitor completed. ${results.length} companies analyzed, ${alertsToSend.length} alerts triggered`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        alertsTriggered: alertsToSend.length,
        threshold: thresholdPercent
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('AOV Trend Monitor error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
