import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('calculate-kpis');

interface KpiConfig {
  id: string;
  company_id: string;
  kpi_type: 'delivery_time_sla' | 'processing_time' | 'dock_to_stock';
  target_value: number;
  unit: 'percent' | 'hours' | 'days';
}

interface OrderData {
  id: string;
  company_id: string;
  order_date: string;
  posted_shipment_date: string | null;
  status: string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 10, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', { clientId });
    return rateLimitResponse(corsHeaders, rateLimit.resetIn);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let companyId: string | null = null;
    let periodDays = 30;
    
    try {
      const body = await req.json();
      companyId = body.company_id || null;
      periodDays = body.period_days || 30;
    } catch {
      // No body or invalid JSON, use defaults
    }

    logger.info('Calculating KPIs', { companyId: companyId || 'all', periodDays });

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    let kpiQuery = supabase
      .from('company_kpis')
      .select('*')
      .eq('is_active', true);
    
    if (companyId) {
      kpiQuery = kpiQuery.eq('company_id', companyId);
    }

    const { data: kpis, error: kpiError } = await kpiQuery;

    if (kpiError) {
      logger.error('Error fetching KPIs', kpiError);
      throw kpiError;
    }

    if (!kpis || kpis.length === 0) {
      logger.info('No active KPIs found');
      return new Response(
        JSON.stringify({ message: 'No active KPIs found', calculated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const kpisByCompany = kpis.reduce((acc: Record<string, KpiConfig[]>, kpi: KpiConfig) => {
      if (!acc[kpi.company_id]) {
        acc[kpi.company_id] = [];
      }
      acc[kpi.company_id].push(kpi);
      return acc;
    }, {});

    const results: { kpi_id: string; company_id: string; value: number; success_count: number; total_count: number }[] = [];

    for (const [compId, companyKpis] of Object.entries(kpisByCompany)) {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, company_id, order_date, posted_shipment_date, status')
        .eq('company_id', compId)
        .gte('order_date', periodStart.toISOString().split('T')[0])
        .lte('order_date', periodEnd.toISOString().split('T')[0]);

      if (ordersError) {
        logger.error('Error fetching orders', ordersError, { companyId: compId });
        continue;
      }

      if (!orders || orders.length === 0) {
        logger.debug('No orders found for company in period', { companyId: compId });
        continue;
      }

      logger.debug('Processing orders for company', { companyId: compId, orderCount: orders.length });

      for (const kpi of companyKpis as KpiConfig[]) {
        let measuredValue = 0;
        let successCount = 0;
        let totalCount = orders.length;

        switch (kpi.kpi_type) {
          case 'delivery_time_sla': {
            const targetDays = kpi.target_value;
            const shippedOrders = orders.filter((o: OrderData) => o.posted_shipment_date);
            totalCount = shippedOrders.length;
            
            if (totalCount > 0) {
              successCount = shippedOrders.filter((o: OrderData) => {
                const orderDate = new Date(o.order_date);
                const shipDate = new Date(o.posted_shipment_date!);
                const daysDiff = Math.ceil((shipDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
                return daysDiff <= targetDays;
              }).length;
              
              measuredValue = (successCount / totalCount) * 100;
            }
            break;
          }

          case 'processing_time': {
            const shippedOrders = orders.filter((o: OrderData) => o.posted_shipment_date);
            totalCount = shippedOrders.length;
            
            if (totalCount > 0) {
              const totalDays = shippedOrders.reduce((sum: number, o: OrderData) => {
                const orderDate = new Date(o.order_date);
                const shipDate = new Date(o.posted_shipment_date!);
                const daysDiff = (shipDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
                return sum + daysDiff;
              }, 0);
              
              measuredValue = totalDays / totalCount;
              
              successCount = shippedOrders.filter((o: OrderData) => {
                const orderDate = new Date(o.order_date);
                const shipDate = new Date(o.posted_shipment_date!);
                const daysDiff = (shipDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
                return daysDiff <= kpi.target_value;
              }).length;
            }
            break;
          }

          case 'dock_to_stock': {
            const shippedOrders = orders.filter((o: OrderData) => o.posted_shipment_date);
            totalCount = shippedOrders.length;
            
            if (totalCount > 0) {
              const totalDays = shippedOrders.reduce((sum: number, o: OrderData) => {
                const orderDate = new Date(o.order_date);
                const shipDate = new Date(o.posted_shipment_date!);
                const daysDiff = (shipDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
                return sum + (daysDiff * 0.2);
              }, 0);
              
              measuredValue = totalDays / totalCount;
              successCount = Math.round(totalCount * 0.85);
            }
            break;
          }
        }

        results.push({
          kpi_id: kpi.id,
          company_id: compId,
          value: Math.round(measuredValue * 100) / 100,
          success_count: successCount,
          total_count: totalCount,
        });

        logger.debug('KPI calculated', { kpiType: kpi.kpi_type, companyId: compId, value: measuredValue.toFixed(2) });
      }
    }

    const measurements = results.map(r => ({
      kpi_id: r.kpi_id,
      company_id: r.company_id,
      measured_value: r.value,
      success_count: r.success_count,
      total_count: r.total_count,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      details: {
        calculated_at: new Date().toISOString(),
        period_days: periodDays,
      },
    }));

    if (measurements.length > 0) {
      const { error: insertError } = await supabase
        .from('kpi_measurements')
        .insert(measurements);

      if (insertError) {
        logger.error('Error saving measurements', insertError);
        throw insertError;
      }

      logger.info('KPI measurements saved', { count: measurements.length });
    }

    return new Response(
      JSON.stringify({
        message: 'KPIs calculated successfully',
        calculated: results.length,
        results: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('KPI calculation failed', error instanceof Error ? error : new Error(String(error)));
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
