import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('order-performance');

interface ProcessingStage {
  stage: string;
  avgDuration: number; // hours
  minDuration: number;
  maxDuration: number;
  orderCount: number;
  bottleneckScore: number; // 0-1, higher = more bottleneck
}

interface CarrierPerformance {
  carrier: string;
  orderCount: number;
  avgDeliveryTime: number; // days
  onTimeRate: number; // percentage
}

interface PerformanceMetrics {
  summary: {
    totalOrders: number;
    avgProcessingTime: number; // hours
    onTimeRate: number; // percentage
    slaBreaches: number;
    atRiskOrders: number;
  };
  stages: ProcessingStage[];
  carriers: CarrierPerformance[];
  trends: {
    date: string;
    avgProcessingTime: number;
    orderCount: number;
    onTimeRate: number;
  }[];
  bottlenecks: {
    stage: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: string;
    recommendation: string;
  }[];
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
    const { companyId, days = 30 } = await req.json();
    logger.info('Fetching order performance', { companyId, days });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString().split('T')[0];

    // 1. Get order events for duration analysis
    const { data: orderEvents } = await supabase
      .from('order_events')
      .select('order_id, event_type, old_status, new_status, occurred_at, duration_seconds')
      .eq('company_id', companyId)
      .eq('event_type', 'status_change')
      .gte('occurred_at', startDate.toISOString())
      .order('occurred_at', { ascending: true });

    // 2. Get orders for overall stats
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, order_date, posted_shipment_date, shipping_agent_code, created_at')
      .eq('company_id', companyId)
      .gte('order_date', startDateStr);

    // 3. Calculate stage durations
    const stageDurations = new Map<string, number[]>();
    const stageTransitions = [
      { from: 'received', to: 'putaway', stage: 'Eingang → Einlagerung' },
      { from: 'putaway', to: 'picking', stage: 'Einlagerung → Picking' },
      { from: 'picking', to: 'packing', stage: 'Picking → Packing' },
      { from: 'packing', to: 'ready_to_ship', stage: 'Packing → Versandbereit' },
      { from: 'ready_to_ship', to: 'shipped', stage: 'Versandbereit → Versendet' },
    ];

    // Group events by order
    const eventsByOrder = new Map<string, typeof orderEvents>();
    orderEvents?.forEach(event => {
      const existing = eventsByOrder.get(event.order_id) || [];
      existing.push(event);
      eventsByOrder.set(event.order_id, existing);
    });

    // Calculate durations per stage
    eventsByOrder.forEach((events) => {
      if (!events) return;
      events.forEach(event => {
        if (event.duration_seconds && event.old_status && event.new_status) {
          const transition = stageTransitions.find(t => t.from === event.old_status);
          if (transition) {
            const durations = stageDurations.get(transition.stage) || [];
            durations.push(event.duration_seconds / 3600); // Convert to hours
            stageDurations.set(transition.stage, durations);
          }
        }
      });
    });

    // Calculate stage statistics
    const stages: ProcessingStage[] = stageTransitions.map(transition => {
      const durations = stageDurations.get(transition.stage) || [];
      const avgDuration = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0;
      const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
      const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
      
      // Bottleneck score based on variance and average
      const variance = durations.length > 0 
        ? durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length 
        : 0;
      const bottleneckScore = Math.min(1, (avgDuration / 24 + Math.sqrt(variance) / 12) / 2);

      return {
        stage: transition.stage,
        avgDuration: Math.round(avgDuration * 10) / 10,
        minDuration: Math.round(minDuration * 10) / 10,
        maxDuration: Math.round(maxDuration * 10) / 10,
        orderCount: durations.length,
        bottleneckScore: Math.round(bottleneckScore * 100) / 100,
      };
    });

    // 4. Calculate carrier performance
    const carrierStats = new Map<string, { count: number; deliveryTimes: number[]; onTime: number }>();
    
    orders?.forEach(order => {
      if (order.shipping_agent_code && order.posted_shipment_date && order.order_date) {
        const carrier = order.shipping_agent_code;
        const stats = carrierStats.get(carrier) || { count: 0, deliveryTimes: [], onTime: 0 };
        
        const orderDate = new Date(order.order_date);
        const shipDate = new Date(order.posted_shipment_date);
        const deliveryDays = (shipDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        
        stats.count++;
        stats.deliveryTimes.push(deliveryDays);
        if (deliveryDays <= 3) stats.onTime++; // Assume 3 days SLA
        
        carrierStats.set(carrier, stats);
      }
    });

    const carriers: CarrierPerformance[] = Array.from(carrierStats.entries())
      .map(([carrier, stats]) => ({
        carrier,
        orderCount: stats.count,
        avgDeliveryTime: stats.deliveryTimes.length > 0 
          ? Math.round((stats.deliveryTimes.reduce((a, b) => a + b, 0) / stats.deliveryTimes.length) * 10) / 10 
          : 0,
        onTimeRate: stats.count > 0 ? Math.round((stats.onTime / stats.count) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.orderCount - a.orderCount);

    // 5. Calculate daily trends
    const dailyStats = new Map<string, { count: number; processingTimes: number[]; onTime: number }>();
    
    orders?.forEach(order => {
      const date = order.order_date;
      const stats = dailyStats.get(date) || { count: 0, processingTimes: [], onTime: 0 };
      stats.count++;
      
      if (order.posted_shipment_date && order.order_date) {
        const orderDate = new Date(order.order_date);
        const shipDate = new Date(order.posted_shipment_date);
        const processingHours = (shipDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
        stats.processingTimes.push(processingHours);
        if (processingHours <= 72) stats.onTime++; // 3 days = 72 hours
      }
      
      dailyStats.set(date, stats);
    });

    const trends = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        avgProcessingTime: stats.processingTimes.length > 0 
          ? Math.round((stats.processingTimes.reduce((a, b) => a + b, 0) / stats.processingTimes.length) * 10) / 10 
          : 0,
        orderCount: stats.count,
        onTimeRate: stats.count > 0 ? Math.round((stats.onTime / stats.count) * 1000) / 10 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Last 14 days

    // 6. Identify bottlenecks
    const bottlenecks: PerformanceMetrics['bottlenecks'] = stages
      .filter(s => s.bottleneckScore > 0.3)
      .sort((a, b) => b.bottleneckScore - a.bottleneckScore)
      .slice(0, 3)
      .map(stage => {
        const severity: 'low' | 'medium' | 'high' | 'critical' = stage.bottleneckScore > 0.7 ? 'critical' 
          : stage.bottleneckScore > 0.5 ? 'high' 
          : stage.bottleneckScore > 0.3 ? 'medium' 
          : 'low';
        
        return {
          stage: stage.stage,
          severity,
          impact: `Durchschnittlich ${stage.avgDuration}h, bis zu ${stage.maxDuration}h`,
          recommendation: stage.avgDuration > 8 
            ? 'Prozess-Optimierung empfohlen, Kapazität prüfen' 
            : 'Monitoring verstärken',
        };
      });

    // 7. Calculate summary
    const totalOrders = orders?.length || 0;
    const allProcessingTimes = trends.flatMap(t => t.avgProcessingTime ? [t.avgProcessingTime] : []);
    const avgProcessingTime = allProcessingTimes.length > 0 
      ? Math.round((allProcessingTimes.reduce((a, b) => a + b, 0) / allProcessingTimes.length) * 10) / 10 
      : 0;
    
    const shippedOrders = orders?.filter(o => o.status === 'shipped' || o.status === 'delivered').length || 0;
    const onTimeOrders = orders?.filter(o => {
      if (!o.posted_shipment_date || !o.order_date) return false;
      const processingDays = (new Date(o.posted_shipment_date).getTime() - new Date(o.order_date).getTime()) / (1000 * 60 * 60 * 24);
      return processingDays <= 3;
    }).length || 0;
    
    const onTimeRate = shippedOrders > 0 ? Math.round((onTimeOrders / shippedOrders) * 1000) / 10 : 0;
    
    const atRiskOrders = orders?.filter(o => {
      if (['shipped', 'delivered'].includes(o.status)) return false;
      const orderAge = (now.getTime() - new Date(o.order_date).getTime()) / (1000 * 60 * 60);
      return orderAge > 48; // More than 48 hours old
    }).length || 0;

    const slaBreaches = orders?.filter(o => {
      if (!o.posted_shipment_date || !o.order_date) return false;
      const processingDays = (new Date(o.posted_shipment_date).getTime() - new Date(o.order_date).getTime()) / (1000 * 60 * 60 * 24);
      return processingDays > 3;
    }).length || 0;

    const metrics: PerformanceMetrics = {
      summary: {
        totalOrders,
        avgProcessingTime,
        onTimeRate,
        slaBreaches,
        atRiskOrders,
      },
      stages,
      carriers,
      trends,
      bottlenecks,
    };

    // Generate AI summary
    let aiSummary = null;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY && totalOrders > 0) {
      try {
        const summaryText = `
          Performance-Daten (${days} Tage):
          - ${totalOrders} Bestellungen, ${onTimeRate}% pünktlich
          - Durchschnittliche Bearbeitungszeit: ${avgProcessingTime}h
          - SLA-Verstöße: ${slaBreaches}, At-Risk: ${atRiskOrders}
          - Bottlenecks: ${bottlenecks.map(b => `${b.stage} (${b.severity})`).join(', ') || 'keine'}
          - Top Carrier: ${carriers[0]?.carrier || 'n/a'} (${carriers[0]?.onTimeRate || 0}% pünktlich)
        `;

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
                content: 'Du bist ein Fulfillment-Performance-Analyst. Fasse die Daten kurz zusammen (2-3 Sätze) und gib die wichtigste Optimierungsempfehlung auf Deutsch.'
              },
              { role: 'user', content: summaryText }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          aiSummary = data.choices?.[0]?.message?.content;
        }
      } catch (e) {
        logger.warn('AI summary failed', { error: e instanceof Error ? e.message : String(e) });
      }
    }

    logger.info('Performance metrics generated', { companyId, totalOrders, stages: stages.length });

    return new Response(JSON.stringify({ metrics, aiSummary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Performance analysis failed', error instanceof Error ? error : new Error(String(error)));
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
