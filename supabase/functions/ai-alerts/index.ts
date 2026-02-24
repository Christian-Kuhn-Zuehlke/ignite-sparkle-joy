import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('ai-alerts');

interface Alert {
  id: string;
  type: 'low_stock' | 'delayed_order' | 'return_spike' | 'kpi_warning';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 30, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', { clientId, remaining: rateLimit.remaining });
    return rateLimitResponse(corsHeaders, rateLimit.resetIn);
  }

  try {
    const { companyId, generateAiInsight } = await req.json();
    logger.info('Generating alerts', { companyId, generateAiInsight });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const alerts: Alert[] = [];
    const now = new Date();

    // 1. Check for low stock items
    const { data: lowStockItems } = await supabase
      .from('inventory')
      .select('sku, name, on_hand, reserved, available, low_stock_threshold')
      .eq('company_id', companyId)
      .not('low_stock_threshold', 'is', null);

    if (lowStockItems) {
      for (const item of lowStockItems) {
        const available = item.available ?? (item.on_hand - item.reserved);
        if (available <= item.low_stock_threshold) {
          const severity = available <= 0 ? 'critical' : available <= item.low_stock_threshold / 2 ? 'warning' : 'info';
          alerts.push({
            id: `low_stock_${item.sku}`,
            type: 'low_stock',
            severity,
            title: available <= 0 ? 'Artikel ausverkauft!' : 'Niedriger Lagerbestand',
            message: `${item.name} (${item.sku}): ${available} verfügbar, Schwellwert: ${item.low_stock_threshold}`,
            data: { sku: item.sku, available, threshold: item.low_stock_threshold },
            createdAt: now.toISOString(),
          });
        }
      }
    }

    // 2. Check for delayed orders (older than 2 days without shipping)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const { data: delayedOrders } = await supabase
      .from('orders')
      .select('id, source_no, order_date, status, ship_to_name')
      .eq('company_id', companyId)
      .in('status', ['received', 'putaway', 'picking', 'packing'])
      .lt('order_date', twoDaysAgo.toISOString().split('T')[0]);

    if (delayedOrders && delayedOrders.length > 0) {
      for (const order of delayedOrders) {
        const orderDate = new Date(order.order_date);
        const daysOld = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        const severity = daysOld >= 5 ? 'critical' : daysOld >= 3 ? 'warning' : 'info';
        
        alerts.push({
          id: `delayed_${order.id}`,
          type: 'delayed_order',
          severity,
          title: daysOld >= 5 ? 'Kritisch verzögerte Bestellung!' : 'Bestellung verzögert',
          message: `Bestellung ${order.source_no} für ${order.ship_to_name} ist seit ${daysOld} Tagen im Status "${order.status}"`,
          data: { orderId: order.id, sourceNo: order.source_no, daysOld, status: order.status },
          createdAt: now.toISOString(),
        });
      }
    }

    // 3. Check for return spikes (more than 5 returns in last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { count: returnCount } = await supabase
      .from('returns')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('return_date', sevenDaysAgo.toISOString().split('T')[0]);

    if (returnCount && returnCount > 5) {
      alerts.push({
        id: `return_spike_${now.toISOString()}`,
        type: 'return_spike',
        severity: returnCount > 10 ? 'warning' : 'info',
        title: 'Erhöhte Retourenquote',
        message: `${returnCount} Retouren in den letzten 7 Tagen - bitte prüfen`,
        data: { returnCount, period: '7 days' },
        createdAt: now.toISOString(),
      });
    }

    // 4. Check KPI performance
    const { data: kpis } = await supabase
      .from('company_kpis')
      .select('id, name, target_value, warning_threshold, unit')
      .eq('company_id', companyId)
      .eq('is_active', true);

    const { data: latestMeasurements } = await supabase
      .from('kpi_measurements')
      .select('kpi_id, measured_value, period_end')
      .eq('company_id', companyId)
      .order('period_end', { ascending: false })
      .limit(10);

    if (kpis && latestMeasurements) {
      for (const kpi of kpis) {
        const measurement = latestMeasurements.find(m => m.kpi_id === kpi.id);
        if (measurement && kpi.warning_threshold) {
          if (measurement.measured_value < kpi.warning_threshold) {
            const severity = measurement.measured_value < kpi.target_value * 0.8 ? 'critical' : 'warning';
            alerts.push({
              id: `kpi_${kpi.id}`,
              type: 'kpi_warning',
              severity,
              title: 'KPI unter Zielwert',
              message: `${kpi.name}: ${measurement.measured_value.toFixed(1)}${kpi.unit === 'percent' ? '%' : ''} (Ziel: ${kpi.target_value}${kpi.unit === 'percent' ? '%' : ''})`,
              data: { kpiId: kpi.id, measured: measurement.measured_value, target: kpi.target_value },
              createdAt: now.toISOString(),
            });
          }
        }
      }
    }

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Generate AI insight if requested and there are alerts
    let aiInsight = null;
    if (generateAiInsight && alerts.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (LOVABLE_API_KEY) {
        const alertSummary = alerts.map(a => `- [${a.severity.toUpperCase()}] ${a.title}: ${a.message}`).join('\n');
        
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'Du bist ein Fulfillment-Experte. Analysiere die Alerts und gib eine kurze, prägnante Handlungsempfehlung in 2-3 Sätzen auf Deutsch. Fokussiere auf die wichtigsten Maßnahmen.'
              },
              {
                role: 'user',
                content: `Aktuelle Alerts:\n${alertSummary}\n\nWas sind die wichtigsten Maßnahmen?`
              }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          aiInsight = data.choices?.[0]?.message?.content;
        }
      }
    }

    logger.info('Alerts generated', { companyId, alertCount: alerts.length });

    return new Response(JSON.stringify({ alerts, aiInsight, count: alerts.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Failed to generate alerts', error instanceof Error ? error : new Error(String(error)));
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
