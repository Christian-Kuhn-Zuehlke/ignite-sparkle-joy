import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { companyId, forecastDays = 30 } = await req.json();

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'companyId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating forecasts for company ${companyId}`);

    // Fetch inventory with limit
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select('sku, name, on_hand, available')
      .eq('company_id', companyId)
      .or('on_hand.gt.0,available.gt.0')
      .limit(10000);

    if (invError) {
      console.error('Error fetching inventory:', invError);
      throw invError;
    }
    console.log(`Fetched ${inventory?.length || 0} inventory items with stock`);

    // Fetch recent orders to calculate demand - use DB aggregation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Use the aggregation function for efficient demand calculation
    const { data: demandData, error: demandError } = await supabase
      .rpc('get_abc_sku_aggregates', {
        p_company_id: companyId,
        p_period_start: thirtyDaysAgo.toISOString()
      });

    if (demandError) {
      console.error('Error fetching demand data:', demandError);
      throw demandError;
    }
    console.log(`Fetched demand data for ${demandData?.length || 0} SKUs`);

    // Fetch ABC classifications if available
    const { data: abcData } = await supabase
      .from('abc_classifications')
      .select('sku, abc_class, total_revenue')
      .eq('company_id', companyId);

    const abcMap = new Map(abcData?.map(a => [a.sku, a]) || []);

    // Build demand map from aggregated data
    const skuDemand = new Map<string, { quantity: number; revenue: number; orderCount: number }>();
    
    for (const row of (demandData || [])) {
      skuDemand.set(row.sku, {
        quantity: Number(row.units_sold) || 0,
        revenue: Number(row.total_revenue) || 0,
        orderCount: Number(row.order_count) || 0
      });
    }
    console.log(`Built demand map with ${skuDemand.size} SKUs`);

    const alerts: Array<{
      company_id: string;
      sku: string;
      product_name: string;
      abc_class: string | null;
      current_stock: number;
      avg_daily_demand: number;
      days_until_stockout: number;
      stockout_probability: number;
      estimated_revenue_at_risk: number;
      alert_severity: string;
    }> = [];

    const suggestions: Array<{
      company_id: string;
      sku: string;
      product_name: string;
      current_stock: number;
      avg_daily_demand: number;
      days_of_stock_remaining: number;
      stockout_date: string;
      stockout_probability: number;
      suggested_order_quantity: number;
      order_by_date: string;
      reasoning: string;
      priority: string;
      factors: object;
    }> = [];

    // Generate alerts and suggestions for each inventory item
    for (const item of (inventory || [])) {
      const demand = skuDemand.get(item.sku);
      const avgDailyDemand = demand ? demand.quantity / 30 : 0;
      const currentStock = item.available ?? item.on_hand;
      const abc = abcMap.get(item.sku);

      if (avgDailyDemand <= 0) continue; // Skip items with no demand

      const daysUntilStockout = avgDailyDemand > 0 
        ? Math.floor(currentStock / avgDailyDemand) 
        : 999;

      // Calculate stockout probability based on days remaining
      let stockoutProbability = 0;
      if (daysUntilStockout <= 0) stockoutProbability = 0.99;
      else if (daysUntilStockout <= 7) stockoutProbability = 0.90;
      else if (daysUntilStockout <= 14) stockoutProbability = 0.75;
      else if (daysUntilStockout <= 21) stockoutProbability = 0.50;
      else if (daysUntilStockout <= 30) stockoutProbability = 0.25;

      // Adjust for ABC class
      if (abc?.abc_class === 'A') stockoutProbability = Math.min(1, stockoutProbability * 1.2);

      // Calculate revenue at risk (next 30 days)
      const dailyRevenue = demand ? demand.revenue / 30 : 0;
      const daysAtRisk = Math.max(0, 30 - daysUntilStockout);
      const revenueAtRisk = dailyRevenue * daysAtRisk;

      // Create stock-out alert if risk is significant
      if (daysUntilStockout <= 14 || (abc?.abc_class === 'A' && daysUntilStockout <= 21)) {
        const severity = daysUntilStockout <= 7 ? 'critical' : 
                        daysUntilStockout <= 14 ? 'warning' : 'info';

        alerts.push({
          company_id: companyId,
          sku: item.sku,
          product_name: item.name,
          abc_class: abc?.abc_class || null,
          current_stock: currentStock,
          avg_daily_demand: avgDailyDemand,
          days_until_stockout: daysUntilStockout,
          stockout_probability: stockoutProbability,
          estimated_revenue_at_risk: revenueAtRisk,
          alert_severity: severity
        });
      }

      // Create replenishment suggestion
      if (daysUntilStockout <= 30) {
        // Calculate target coverage based on ABC class
        // A-items (fast movers): 60 days = 2 months
        // B-items (medium): 45 days = 1.5 months
        // C-items (slow movers): 90 days = 3 months (less frequent orders)
        const targetDaysOfStock = abc?.abc_class === 'A' ? 60 
          : abc?.abc_class === 'B' ? 45 
          : 90;
        
        // Calculate order quantity based on actual demand
        // Formula: (Target Days * Daily Demand) - Current Stock
        const demandForPeriod = avgDailyDemand * targetDaysOfStock;
        let suggestedQty = Math.ceil(demandForPeriod);
        
        // Ensure minimum order of 5 units (for very slow movers)
        suggestedQty = Math.max(suggestedQty, 5);
        
        // For items with decent demand, round up to practical quantities
        if (avgDailyDemand >= 1) {
          // Round to nearest 10 for medium demand, 50 for high demand
          if (avgDailyDemand >= 10) {
            suggestedQty = Math.ceil(suggestedQty / 50) * 50;
          } else if (avgDailyDemand >= 3) {
            suggestedQty = Math.ceil(suggestedQty / 10) * 10;
          }
        }
        
        // Calculate order-by date (assuming 7 days lead time)
        const leadTimeDays = 7;
        const orderByDate = new Date();
        orderByDate.setDate(orderByDate.getDate() + Math.max(0, daysUntilStockout - leadTimeDays));

        const stockoutDate = new Date();
        stockoutDate.setDate(stockoutDate.getDate() + daysUntilStockout);

        const priority = daysUntilStockout <= 7 ? 'critical' :
                        daysUntilStockout <= 14 ? 'high' :
                        daysUntilStockout <= 21 ? 'medium' : 'low';

        suggestions.push({
          company_id: companyId,
          sku: item.sku,
          product_name: item.name,
          current_stock: currentStock,
          avg_daily_demand: avgDailyDemand,
          days_of_stock_remaining: daysUntilStockout,
          stockout_date: stockoutDate.toISOString().split('T')[0],
          stockout_probability: stockoutProbability,
          suggested_order_quantity: suggestedQty,
          order_by_date: orderByDate.toISOString().split('T')[0],
          reasoning: generateReasoning(item.name, abc?.abc_class, daysUntilStockout, avgDailyDemand, suggestedQty),
          priority,
          factors: {
            abc_class: abc?.abc_class,
            avg_daily_demand: avgDailyDemand,
            target_days_of_stock: targetDaysOfStock,
            lead_time_days: leadTimeDays
          }
        });
      }
    }

    // Clear old active alerts and pending suggestions
    await Promise.all([
      supabase
        .from('stockout_alerts')
        .delete()
        .eq('company_id', companyId)
        .eq('status', 'active'),
      supabase
        .from('replenishment_suggestions')
        .delete()
        .eq('company_id', companyId)
        .eq('status', 'pending')
    ]);

    // Insert new alerts and suggestions
    const results = await Promise.all([
      alerts.length > 0 
        ? supabase.from('stockout_alerts').insert(alerts)
        : Promise.resolve({ error: null }),
      suggestions.length > 0
        ? supabase.from('replenishment_suggestions').insert(suggestions)
        : Promise.resolve({ error: null })
    ]);

    if (results[0].error) console.error('Error inserting alerts:', results[0].error);
    if (results[1].error) console.error('Error inserting suggestions:', results[1].error);

    console.log(`Generated ${alerts.length} alerts and ${suggestions.length} suggestions`);

    return new Response(
      JSON.stringify({
        success: true,
        alertsGenerated: alerts.length,
        suggestionsGenerated: suggestions.length,
        criticalAlerts: alerts.filter(a => a.alert_severity === 'critical').length,
        totalRevenueAtRisk: alerts.reduce((s, a) => s + a.estimated_revenue_at_risk, 0)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Forecast error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateReasoning(
  productName: string,
  abcClass: string | null,
  daysRemaining: number,
  avgDailyDemand: number,
  suggestedQty: number
): string {
  const classInfo = abcClass 
    ? `${productName} ist ein ${abcClass}-Artikel mit ` 
    : `${productName} hat `;

  if (daysRemaining <= 7) {
    return `${classInfo}kritisch niedrigem Bestand. Bei durchschnittlich ${avgDailyDemand.toFixed(1)} Verkäufen/Tag ist ein Stockout in ${daysRemaining} Tagen wahrscheinlich. Empfohlene Menge: ${suggestedQty} Stück für 30+ Tage Reichweite.`;
  } else if (daysRemaining <= 14) {
    return `${classInfo}Bestand für ca. ${daysRemaining} Tage. Um Lieferengpässe zu vermeiden, empfehlen wir die Nachbestellung von ${suggestedQty} Stück unter Berücksichtigung der Lieferzeit.`;
  } else {
    return `${classInfo}noch ausreichend Bestand für ${daysRemaining} Tage. Frühzeitige Nachbestellung von ${suggestedQty} Stück sichert durchgehende Verfügbarkeit.`;
  }
}