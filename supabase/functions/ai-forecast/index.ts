import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('ai-forecast');

interface ForecastData {
  orders: { date: string; actual: number; predicted?: number }[];
  inventory: { sku: string; name: string; current: number; predictedDemand: number; daysUntilStockout: number | null; recommendation: string }[];
  returns: { date: string; actual: number; predicted?: number }[];
  insights: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 20, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', { clientId });
    return rateLimitResponse(corsHeaders, rateLimit.resetIn);
  }

  try {
    const { companyId, language = 'de' } = await req.json();
    logger.info('Generating forecast', { companyId, language });
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Get historical order data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: orders } = await supabase
      .from('orders')
      .select('order_date, order_amount')
      .eq('company_id', companyId)
      .gte('order_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('order_date', { ascending: true });

    // Get historical returns data
    const { data: returns } = await supabase
      .from('returns')
      .select('return_date, amount')
      .eq('company_id', companyId)
      .gte('return_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('return_date', { ascending: true });

    // Get inventory data
    const { data: inventory } = await supabase
      .from('inventory')
      .select('sku, name, on_hand, reserved, available, low_stock_threshold')
      .eq('company_id', companyId);

    // Aggregate orders by date
    const ordersByDate: Record<string, number> = {};
    orders?.forEach(o => {
      const date = o.order_date;
      ordersByDate[date] = (ordersByDate[date] || 0) + 1;
    });

    // Aggregate returns by date
    const returnsByDate: Record<string, number> = {};
    returns?.forEach(r => {
      const date = r.return_date;
      returnsByDate[date] = (returnsByDate[date] || 0) + 1;
    });

    // Calculate daily averages and trends
    const orderDates = Object.keys(ordersByDate).sort();
    const orderCounts = orderDates.map(d => ordersByDate[d]);
    const avgOrdersPerDay = orderCounts.length > 0 
      ? orderCounts.reduce((a, b) => a + b, 0) / orderCounts.length 
      : 0;

    const returnDates = Object.keys(returnsByDate).sort();
    const returnCounts = returnDates.map(d => returnsByDate[d]);
    const avgReturnsPerDay = returnCounts.length > 0 
      ? returnCounts.reduce((a, b) => a + b, 0) / returnCounts.length 
      : 0;

    // Simple trend calculation (linear regression slope)
    const calculateTrend = (values: number[]): number => {
      if (values.length < 2) return 0;
      const n = values.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = values.reduce((a, b) => a + b, 0);
      const sumXY = values.reduce((acc, val, i) => acc + i * val, 0);
      const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
      return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    };

    const orderTrend = calculateTrend(orderCounts);
    const returnTrend = calculateTrend(returnCounts);

    // Generate forecast for next 7 days
    const forecastDays = 7;
    const orderForecast: { date: string; actual: number; predicted?: number }[] = [];
    const returnForecast: { date: string; actual: number; predicted?: number }[] = [];

    // Add historical data
    orderDates.forEach(date => {
      orderForecast.push({ date, actual: ordersByDate[date] });
    });
    returnDates.forEach(date => {
      returnForecast.push({ date, actual: returnsByDate[date] });
    });

    // Add predictions
    const today = new Date();
    for (let i = 1; i <= forecastDays; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(futureDate.getDate() + i);
      const dateStr = futureDate.toISOString().split('T')[0];
      
      const predictedOrders = Math.max(0, Math.round(avgOrdersPerDay + orderTrend * (orderCounts.length + i)));
      const predictedReturns = Math.max(0, Math.round(avgReturnsPerDay + returnTrend * (returnCounts.length + i)));
      
      orderForecast.push({ date: dateStr, actual: 0, predicted: predictedOrders });
      returnForecast.push({ date: dateStr, actual: 0, predicted: predictedReturns });
    }

    // Recommendation translations
    const recommendations: Record<string, { ok: string; urgent: string; soon: string; watch: string }> = {
      de: { ok: 'Bestand OK', urgent: 'Dringend nachbestellen!', soon: 'Bald nachbestellen', watch: 'Im Auge behalten' },
      en: { ok: 'Stock OK', urgent: 'Reorder urgently!', soon: 'Reorder soon', watch: 'Keep an eye on' },
      fr: { ok: 'Stock OK', urgent: 'Commander urgemment!', soon: 'Commander bientôt', watch: 'À surveiller' },
      it: { ok: 'Stock OK', urgent: 'Riordinare urgente!', soon: 'Riordinare presto', watch: 'Tenere d\'occhio' },
      es: { ok: 'Stock OK', urgent: '¡Reordenar urgente!', soon: 'Reordenar pronto', watch: 'Vigilar' },
    };
    const rec = recommendations[language] || recommendations.en;

    // Inventory forecast
    const inventoryForecast = inventory?.map(item => {
      const available = item.available ?? (item.on_hand - item.reserved);
      const dailyDemand = avgOrdersPerDay * 0.1;
      const daysUntilStockout = dailyDemand > 0 ? Math.floor(available / dailyDemand) : null;
      
      let recommendation = rec.ok;
      if (daysUntilStockout !== null) {
        if (daysUntilStockout <= 7) {
          recommendation = rec.urgent;
        } else if (daysUntilStockout <= 14) {
          recommendation = rec.soon;
        } else if (daysUntilStockout <= 30) {
          recommendation = rec.watch;
        }
      }

      return {
        sku: item.sku,
        name: item.name,
        current: available,
        predictedDemand: Math.round(dailyDemand * 7),
        daysUntilStockout,
        recommendation,
      };
    }) || [];

    // Sort by urgency
    inventoryForecast.sort((a, b) => {
      if (a.daysUntilStockout === null) return 1;
      if (b.daysUntilStockout === null) return -1;
      return a.daysUntilStockout - b.daysUntilStockout;
    });

    // Generate AI insights
    let insights = '';
    if (LOVABLE_API_KEY) {
      // Language-specific prompts
      const langPrompts: Record<string, { system: string; trendUp: string; trendDown: string; stable: string }> = {
        de: {
          system: 'Du bist ein Fulfillment-Analyst. Gib eine kurze, prägnante Prognose und Handlungsempfehlung in 3-4 Sätzen auf Deutsch. Fokussiere auf konkrete Zahlen und Aktionen.',
          trendUp: 'steigend', trendDown: 'fallend', stable: 'stabil',
        },
        en: {
          system: 'You are a fulfillment analyst. Provide a concise forecast and recommendation in 3-4 sentences in English. Focus on specific numbers and actions.',
          trendUp: 'rising', trendDown: 'falling', stable: 'stable',
        },
        fr: {
          system: 'Vous êtes un analyste en fulfillment. Fournissez une prévision et une recommandation concises en 3-4 phrases en français. Concentrez-vous sur les chiffres et les actions.',
          trendUp: 'en hausse', trendDown: 'en baisse', stable: 'stable',
        },
        it: {
          system: 'Sei un analista di fulfillment. Fornisci una previsione e una raccomandazione concise in 3-4 frasi in italiano. Concentrati su numeri e azioni specifiche.',
          trendUp: 'in aumento', trendDown: 'in calo', stable: 'stabile',
        },
        es: {
          system: 'Eres un analista de fulfillment. Proporciona un pronóstico y recomendación concisos en 3-4 oraciones en español. Enfócate en números y acciones concretas.',
          trendUp: 'en alza', trendDown: 'en baja', stable: 'estable',
        },
      };
      const langPrompt = langPrompts[language] || langPrompts.en;
      const trendLabel = orderTrend > 0.1 ? langPrompt.trendUp : orderTrend < -0.1 ? langPrompt.trendDown : langPrompt.stable;

      const dataContext = `
Orders last 30 days: ${orders?.length || 0}
Average per day: ${avgOrdersPerDay.toFixed(1)}
Trend: ${trendLabel}

Returns last 30 days: ${returns?.length || 0}
Average per day: ${avgReturnsPerDay.toFixed(1)}
Return rate: ${orders?.length ? ((returns?.length || 0) / orders.length * 100).toFixed(1) : 0}%

Critical inventory items: ${inventoryForecast.filter(i => i.daysUntilStockout !== null && i.daysUntilStockout <= 14).length}
`;

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
                content: langPrompt.system
              },
              {
                role: 'user',
                content: `Analyze this fulfillment data and provide a forecast for next week:\n${dataContext}`
              }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          insights = data.choices?.[0]?.message?.content || '';
        }
      } catch (e) {
        logger.error('AI insights generation failed', e instanceof Error ? e : new Error(String(e)));
      }
    }

    const forecast: ForecastData = {
      orders: orderForecast.slice(-14),
      returns: returnForecast.slice(-14),
      inventory: inventoryForecast.slice(0, 10),
      insights,
    };

    logger.info('Forecast generated', { companyId });

    return new Response(JSON.stringify(forecast), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Forecasting failed', error instanceof Error ? error : new Error(String(error)));
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
