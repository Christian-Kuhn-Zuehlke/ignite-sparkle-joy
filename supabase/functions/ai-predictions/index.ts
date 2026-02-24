import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('ai-predictions');

interface Prediction {
  type: 'order_volume' | 'return_rate' | 'stockout_risk' | 'sla_risk';
  title: string;
  prediction: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  details: string;
  recommendations: string[];
  data?: Record<string, unknown>;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 20, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    return rateLimitResponse(corsHeaders, rateLimit.resetIn);
  }

  try {
    const { companyId, predictionTypes = ['all'] } = await req.json();
    logger.info('Generating predictions', { companyId, predictionTypes });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const predictions: Prediction[] = [];
    const now = new Date();
    const shouldInclude = (type: string) => predictionTypes.includes('all') || predictionTypes.includes(type);

    // 1. ORDER VOLUME PREDICTION
    if (shouldInclude('order_volume')) {
      // Get last 30 days orders
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('order_date')
        .eq('company_id', companyId)
        .gte('order_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Get previous 30 days for trend
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const { data: previousOrders } = await supabase
        .from('orders')
        .select('order_date')
        .eq('company_id', companyId)
        .gte('order_date', sixtyDaysAgo.toISOString().split('T')[0])
        .lt('order_date', thirtyDaysAgo.toISOString().split('T')[0]);

      const recentCount = recentOrders?.length || 0;
      const previousCount = previousOrders?.length || 0;
      const avgDaily = recentCount / 30;
      const predictedNext7Days = Math.round(avgDaily * 7);
      
      const trend = recentCount > previousCount * 1.1 ? 'up' : recentCount < previousCount * 0.9 ? 'down' : 'stable';
      const changePercent = previousCount > 0 ? Math.round(((recentCount - previousCount) / previousCount) * 100) : 0;

      predictions.push({
        type: 'order_volume',
        title: 'Order-Volumen Prognose',
        prediction: predictedNext7Days,
        confidence: 0.75,
        trend,
        details: `Erwartete Orders nächste 7 Tage: ~${predictedNext7Days}. Trend: ${changePercent >= 0 ? '+' : ''}${changePercent}% vs. Vorperiode.`,
        recommendations: trend === 'up' 
          ? ['Kapazität prüfen', 'Lagerverfügbarkeit sicherstellen']
          : trend === 'down' 
          ? ['Marketing-Aktionen prüfen', 'Saisonale Faktoren berücksichtigen']
          : ['Aktuelle Kapazität beibehalten'],
        data: { avgDaily, recentCount, previousCount, changePercent }
      });
    }

    // 2. RETURN RATE PREDICTION
    if (shouldInclude('return_rate')) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Orders in last 30 days
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('order_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Returns in last 30 days
      const { count: returnCount } = await supabase
        .from('returns')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('return_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Get return lines for top returned items
      const { data: topReturnedItems } = await supabase
        .from('return_lines')
        .select('sku, name, quantity, return_id, returns!inner(company_id)')
        .eq('returns.company_id', companyId)
        .order('quantity', { ascending: false })
        .limit(5);

      const returnRate = orderCount && orderCount > 0 ? ((returnCount || 0) / orderCount) * 100 : 0;
      const trend = returnRate > 15 ? 'up' : returnRate < 5 ? 'down' : 'stable';

      predictions.push({
        type: 'return_rate',
        title: 'Retouren-Prognose',
        prediction: Math.round(returnRate * 10) / 10,
        confidence: 0.7,
        trend,
        details: `Aktuelle Retourenquote: ${returnRate.toFixed(1)}%. ${returnCount || 0} Retouren bei ${orderCount || 0} Bestellungen.`,
        recommendations: returnRate > 15 
          ? ['Top-Retouren-Artikel prüfen', 'Produktbeschreibungen verbessern', 'Größentabellen aktualisieren']
          : returnRate > 10
          ? ['Retouren-Gründe analysieren', 'Qualitätskontrolle verstärken']
          : ['Weiter so! Quote ist gut'],
        data: { returnRate, orderCount, returnCount, topItems: topReturnedItems?.slice(0, 3) }
      });
    }

    // 3. STOCKOUT RISK PREDICTION
    if (shouldInclude('stockout_risk')) {
      // Low stock items
      const { data: lowStockItems } = await supabase
        .from('inventory')
        .select('sku, name, on_hand, reserved, available, low_stock_threshold')
        .eq('company_id', companyId)
        .not('low_stock_threshold', 'is', null);

      const criticalItems = lowStockItems?.filter(item => {
        const available = item.available ?? (item.on_hand - item.reserved);
        return available <= (item.low_stock_threshold || 0);
      }) || [];

      const outOfStockItems = criticalItems.filter(item => {
        const available = item.available ?? (item.on_hand - item.reserved);
        return available <= 0;
      });

      const riskScore = criticalItems.length > 10 ? 0.9 : criticalItems.length > 5 ? 0.7 : criticalItems.length > 0 ? 0.4 : 0.1;

      predictions.push({
        type: 'stockout_risk',
        title: 'Stockout-Risiko',
        prediction: criticalItems.length,
        confidence: 0.85,
        trend: criticalItems.length > 5 ? 'up' : 'stable',
        details: `${criticalItems.length} Artikel unter Schwellwert, davon ${outOfStockItems.length} ausverkauft.`,
        recommendations: criticalItems.length > 0
          ? [`Nachbestellung für ${criticalItems.slice(0, 3).map(i => i.sku).join(', ')} prüfen`, 'Lieferanten kontaktieren']
          : ['Keine kritischen Lagerbestände'],
        data: { 
          criticalCount: criticalItems.length, 
          outOfStockCount: outOfStockItems.length,
          riskScore,
          topCritical: criticalItems.slice(0, 5).map(i => ({ sku: i.sku, name: i.name, available: i.available ?? (i.on_hand - i.reserved) }))
        }
      });
    }

    // 4. SLA RISK PREDICTION
    if (shouldInclude('sla_risk')) {
      // Orders at risk (in processing stages for too long)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const { data: riskyOrders } = await supabase
        .from('orders')
        .select('id, source_no, order_date, status, ship_to_name')
        .eq('company_id', companyId)
        .in('status', ['received', 'putaway', 'picking', 'packing'])
        .lt('order_date', oneDayAgo.toISOString().split('T')[0]);

      const criticalOrders = riskyOrders?.filter(o => {
        const orderDate = new Date(o.order_date);
        const hoursOld = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
        return hoursOld > 48;
      }) || [];

      predictions.push({
        type: 'sla_risk',
        title: 'SLA-Risiko',
        prediction: riskyOrders?.length || 0,
        confidence: 0.9,
        trend: (riskyOrders?.length || 0) > 5 ? 'up' : 'stable',
        details: `${riskyOrders?.length || 0} Bestellungen mit SLA-Risiko, davon ${criticalOrders.length} kritisch (>48h).`,
        recommendations: criticalOrders.length > 0
          ? ['Kritische Bestellungen priorisieren', 'Kapazität erhöhen']
          : riskyOrders?.length ? ['Bestellungen im Auge behalten']
          : ['Alle SLAs werden eingehalten'],
        data: { 
          atRiskCount: riskyOrders?.length || 0,
          criticalCount: criticalOrders.length,
          topRisky: riskyOrders?.slice(0, 5).map(o => ({ id: o.id, sourceNo: o.source_no, status: o.status }))
        }
      });
    }

    // Generate AI Summary if we have predictions
    let aiSummary = null;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY && predictions.length > 0) {
      const predictionSummary = predictions.map(p => 
        `- ${p.title}: ${p.details} (Trend: ${p.trend}, Konfidenz: ${Math.round(p.confidence * 100)}%)`
      ).join('\n');

      try {
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
                content: 'Du bist ein Fulfillment-Analyst. Fasse die Prognosen kurz zusammen (2-3 Sätze) und gib die wichtigste Handlungsempfehlung auf Deutsch.'
              },
              {
                role: 'user',
                content: `Aktuelle Prognosen:\n${predictionSummary}\n\nWas ist die wichtigste Erkenntnis?`
              }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          aiSummary = data.choices?.[0]?.message?.content;
        }
      } catch (e) {
        logger.warn('AI summary generation failed', { error: e instanceof Error ? e.message : String(e) });
      }
    }

    logger.info('Predictions generated', { companyId, count: predictions.length });

    return new Response(JSON.stringify({ predictions, aiSummary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Prediction generation failed', error instanceof Error ? error : new Error(String(error)));
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
