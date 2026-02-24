import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface InventoryItem {
  sku: string;
  name: string;
  on_hand: number;
  created_at: string;
}

interface OrderLine {
  sku: string;
  quantity: number;
  price: number | null;
}

interface SKUMetrics {
  sku: string;
  productName: string;
  totalRevenue: number;
  orderCount: number;
  unitsSold: number;
  currentStock: number;
  daysInWarehouse: number;
  returnCount: number;
  returnRate: number;
}

const BATCH_SIZE = 500;
// Removed artificial limits - now using DB aggregation which is much more efficient

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const companyId = body.companyId;
    // Ensure periodDays is never null - default to 90 if not provided or null
    const periodDays = body.periodDays ?? 90;
    const aThreshold = body.aThreshold ?? 80;
    const bThreshold = body.bThreshold ?? 95;

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'companyId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting ABC analysis for company ${companyId}, period: ${periodDays} days`);

    // Create analysis run record
    const { data: runData, error: runError } = await supabase
      .from('abc_analysis_runs')
      .insert({
        company_id: companyId,
        analysis_period_days: periodDays,
        a_threshold_percent: aThreshold,
        b_threshold_percent: bThreshold,
        status: 'running'
      })
      .select()
      .single();

    if (runError) {
      console.error('Error creating analysis run:', runError);
      throw runError;
    }

    const runId = runData.id;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // Use database function for efficient aggregation - processes ALL data without memory issues
    console.log('Calling database function for SKU aggregation...');
    
    const { data: skuAggregates, error: aggError } = await supabase
      .rpc('get_abc_sku_aggregates', {
        p_company_id: companyId,
        p_period_start: periodStart.toISOString()
      });
    
    if (aggError) {
      console.error('Error calling aggregation function:', aggError);
      throw aggError;
    }
    
    console.log(`Database returned ${skuAggregates?.length || 0} aggregated SKUs`);
    
    // Get unique SKUs from aggregates
    const activeSKUs = new Set((skuAggregates || []).map((s: any) => s.sku));
    console.log(`Found ${activeSKUs.size} unique SKUs with orders`);
    
    // Fetch inventory for active SKUs in chunks
    console.log('Fetching inventory for active SKUs...');
    const inventory: InventoryItem[] = [];
    const skuArray = Array.from(activeSKUs) as string[];
    
    for (let i = 0; i < skuArray.length; i += BATCH_SIZE) {
      const chunk = skuArray.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('inventory')
        .select('sku, name, on_hand, created_at')
        .eq('company_id', companyId)
        .in('sku', chunk);
      
      if (!error && data) {
        inventory.push(...(data as InventoryItem[]));
      }
    }
    console.log(`Found ${inventory.length} inventory items for active SKUs`);

    // Skip returns processing
    console.log('Skipping returns analysis (simplified)');

    // Build SKU metrics map
    const skuMetrics = new Map<string, SKUMetrics>();

    // Initialize from inventory
    const inventoryMap = new Map<string, InventoryItem>();
    for (const item of inventory) {
      inventoryMap.set(item.sku, item);
    }

    // Process aggregated data (already summed by database)
    for (const agg of (skuAggregates || []) as Array<{sku: string; total_revenue: number; order_count: number; units_sold: number}>) {
      const invItem = inventoryMap.get(agg.sku);
      const daysInWarehouse = invItem 
        ? Math.floor((Date.now() - new Date(invItem.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      skuMetrics.set(agg.sku, {
        sku: agg.sku,
        productName: invItem?.name || agg.sku,
        totalRevenue: Number(agg.total_revenue) || 0,
        orderCount: Number(agg.order_count) || 0,
        unitsSold: Number(agg.units_sold) || 0,
        currentStock: invItem?.on_hand || 0,
        daysInWarehouse,
        returnCount: 0,
        returnRate: 0
      });
    }

    // Returns processing skipped - table schema doesn't support item-level returns

    // Calculate return rates
    for (const [_, metrics] of skuMetrics) {
      if (metrics.unitsSold > 0) {
        metrics.returnRate = (metrics.returnCount / metrics.unitsSold) * 100;
      }
    }

    // Sort by revenue and classify
    const sortedSKUs = Array.from(skuMetrics.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const totalRevenue = sortedSKUs.reduce((sum, s) => sum + s.totalRevenue, 0);
    
    let cumulativeRevenue = 0;
    const classifications: Array<{
      company_id: string;
      sku: string;
      product_name: string;
      abc_class: string;
      total_revenue: number;
      revenue_share_percent: number;
      order_count: number;
      units_sold: number;
      current_stock: number;
      avg_days_in_warehouse: number;
      return_rate_percent: number;
      days_of_stock: number | null;
      stockout_risk_score: number;
      overstock_risk_score: number;
      trending_direction: string;
    }> = [];

    let aCount = 0, bCount = 0, cCount = 0;

    for (const sku of sortedSKUs) {
      cumulativeRevenue += sku.totalRevenue;
      const cumulativePercent = totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 0;
      const revenueShare = totalRevenue > 0 ? (sku.totalRevenue / totalRevenue) * 100 : 0;

      let abcClass: string;
      if (cumulativePercent <= aThreshold) {
        abcClass = 'A';
        aCount++;
      } else if (cumulativePercent <= bThreshold) {
        abcClass = 'B';
        bCount++;
      } else {
        abcClass = 'C';
        cCount++;
      }

      // Calculate days of stock
      const avgDailySales = periodDays > 0 ? sku.unitsSold / periodDays : 0;
      const daysOfStock = avgDailySales > 0 ? Math.round(sku.currentStock / avgDailySales) : null;

      // Calculate risk scores
      let stockoutRisk = 0;
      let overstockRisk = 0;

      if (daysOfStock !== null) {
        if (daysOfStock < 14 && abcClass === 'A') stockoutRisk = 0.9;
        else if (daysOfStock < 14 && abcClass === 'B') stockoutRisk = 0.7;
        else if (daysOfStock < 7) stockoutRisk = 0.8;
        else if (daysOfStock < 30) stockoutRisk = 0.4;

        if (daysOfStock > 180) overstockRisk = 0.9;
        else if (daysOfStock > 120) overstockRisk = 0.7;
        else if (daysOfStock > 90) overstockRisk = 0.5;
      }

      // Determine trend (simplified)
      let trending: 'up' | 'stable' | 'down' = 'stable';
      if (sku.orderCount > 10 && abcClass === 'A') trending = 'up';
      else if (sku.orderCount === 0 && sku.currentStock > 0) trending = 'down';

      classifications.push({
        company_id: companyId,
        sku: sku.sku,
        product_name: sku.productName,
        abc_class: abcClass,
        total_revenue: sku.totalRevenue,
        revenue_share_percent: revenueShare,
        order_count: sku.orderCount,
        units_sold: sku.unitsSold,
        current_stock: sku.currentStock,
        avg_days_in_warehouse: sku.daysInWarehouse,
        return_rate_percent: sku.returnRate,
        days_of_stock: daysOfStock,
        stockout_risk_score: stockoutRisk,
        overstock_risk_score: overstockRisk,
        trending_direction: trending
      });
    }

    console.log(`Classification done: ${aCount} A, ${bCount} B, ${cCount} C items`);

    // Delete old classifications for today
    await supabase
      .from('abc_classifications')
      .delete()
      .eq('company_id', companyId)
      .eq('analysis_date', new Date().toISOString().split('T')[0]);

    // Insert new classifications in batches
    if (classifications.length > 0) {
      console.log(`Inserting ${classifications.length} classifications...`);
      for (let i = 0; i < classifications.length; i += BATCH_SIZE) {
        const batch = classifications.slice(i, i + BATCH_SIZE);
        const { error: insertError } = await supabase
          .from('abc_classifications')
          .insert(batch);

        if (insertError) {
          console.error(`Error inserting classifications batch ${i}:`, insertError);
          throw insertError;
        }
      }
    }

    // Generate AI recommendations
    const recommendations = generateRecommendations(classifications, companyId);
    
    // Delete old open recommendations
    await supabase
      .from('abc_recommendations')
      .delete()
      .eq('company_id', companyId)
      .eq('status', 'open');

    // Insert new recommendations
    if (recommendations.length > 0) {
      const { error: recError } = await supabase
        .from('abc_recommendations')
        .insert(recommendations);

      if (recError) {
        console.error('Error inserting recommendations:', recError);
      }
    }

    // Generate AI summary
    const aiSummary = generateSummary(classifications, aCount, bCount, cCount, totalRevenue);

    // Update analysis run
    await supabase
      .from('abc_analysis_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        total_skus_analyzed: classifications.length,
        a_class_count: aCount,
        b_class_count: bCount,
        c_class_count: cCount,
        total_revenue_analyzed: totalRevenue,
        a_class_revenue_share: aThreshold,
        b_class_revenue_share: bThreshold - aThreshold,
        c_class_revenue_share: 100 - bThreshold,
        ai_summary: aiSummary,
        key_insights: {
          topPerformers: classifications.filter(c => c.abc_class === 'A').slice(0, 5).map(c => c.sku),
          atRisk: classifications.filter(c => c.stockout_risk_score > 0.7).map(c => c.sku),
          slowMovers: classifications.filter(c => c.abc_class === 'C' && c.days_of_stock && c.days_of_stock > 90).length,
          highReturnRate: classifications.filter(c => c.return_rate_percent > 10).length
        }
      })
      .eq('id', runId);

    console.log(`ABC analysis completed successfully!`);

    return new Response(
      JSON.stringify({
        success: true,
        runId,
        summary: {
          totalSKUs: classifications.length,
          aClass: aCount,
          bClass: bCount,
          cClass: cCount,
          totalRevenue,
          recommendationsGenerated: recommendations.length
        },
        aiSummary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('ABC Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateRecommendations(
  classifications: Array<{
    company_id: string;
    sku: string;
    product_name: string;
    abc_class: string;
    total_revenue: number;
    current_stock: number;
    days_of_stock: number | null;
    return_rate_percent: number;
    avg_days_in_warehouse: number;
    stockout_risk_score: number;
    overstock_risk_score: number;
  }>,
  companyId: string
) {
  const recommendations: Array<{
    company_id: string;
    sku: string;
    recommendation_type: string;
    priority: string;
    title: string;
    description: string;
    reasoning: string;
    confidence_score: number;
    estimated_impact_value: number | null;
    estimated_impact_type: string | null;
    key_metrics: object;
  }> = [];

  for (const item of classifications) {
    // C-Artikel mit langer Lagerdauer → Abverkauf
    if (item.abc_class === 'C' && item.days_of_stock && item.days_of_stock > 90) {
      const storageCost = item.current_stock * 0.5 * (item.avg_days_in_warehouse / 30);
      recommendations.push({
        company_id: companyId,
        sku: item.sku,
        recommendation_type: 'clearance_sale',
        priority: item.days_of_stock > 180 ? 'critical' : 'high',
        title: `Abverkauf empfohlen: ${item.product_name}`,
        description: `${item.current_stock} Stück seit ${item.avg_days_in_warehouse} Tagen im Lager. Reichweite: ${item.days_of_stock} Tage bei aktuellem Abverkauf.`,
        reasoning: `C-Artikel mit überdurchschnittlicher Lagerdauer. Bindet Kapital und Lagerfläche ohne entsprechenden Umsatz.`,
        confidence_score: 0.85,
        estimated_impact_value: storageCost,
        estimated_impact_type: 'cost_reduction',
        key_metrics: {
          currentStock: item.current_stock,
          daysInWarehouse: item.avg_days_in_warehouse,
          daysOfStock: item.days_of_stock
        }
      });
    }

    // A-Artikel mit Stockout-Risiko → Nachbestellen
    if (item.abc_class === 'A' && item.stockout_risk_score > 0.7) {
      recommendations.push({
        company_id: companyId,
        sku: item.sku,
        recommendation_type: 'reorder_soon',
        priority: 'critical',
        title: `Dringend nachbestellen: ${item.product_name}`,
        description: `Top-Performer mit nur noch ${item.days_of_stock || 'wenigen'} Tagen Reichweite. Umsatzverlust droht!`,
        reasoning: `A-Artikel generiert hohen Umsatzanteil. Stockout würde signifikanten Umsatzverlust bedeuten.`,
        confidence_score: 0.92,
        estimated_impact_value: item.total_revenue * 0.3,
        estimated_impact_type: 'revenue',
        key_metrics: {
          totalRevenue: item.total_revenue,
          daysOfStock: item.days_of_stock,
          stockoutRisk: item.stockout_risk_score
        }
      });
    }

    // Hohe Retourenquote → Analyse
    if (item.return_rate_percent > 15) {
      recommendations.push({
        company_id: companyId,
        sku: item.sku,
        recommendation_type: 'monitor_closely',
        priority: item.return_rate_percent > 25 ? 'high' : 'medium',
        title: `Hohe Retourenquote: ${item.product_name}`,
        description: `Retourenquote von ${item.return_rate_percent.toFixed(1)}% überprüfen. Mögliche Qualitäts- oder Beschreibungsprobleme.`,
        reasoning: `Überdurchschnittliche Retourenquote verursacht erhöhte Handling-Kosten und reduziert Marge.`,
        confidence_score: 0.78,
        estimated_impact_value: null,
        estimated_impact_type: null,
        key_metrics: {
          returnRate: item.return_rate_percent,
          abcClass: item.abc_class
        }
      });
    }

    // B-Artikel mit Trend nach unten → Beobachten
    if (item.abc_class === 'B' && item.overstock_risk_score > 0.5) {
      recommendations.push({
        company_id: companyId,
        sku: item.sku,
        recommendation_type: 'reduce_stock',
        priority: 'medium',
        title: `Bestand reduzieren: ${item.product_name}`,
        description: `B-Artikel mit Überbestandsrisiko (${Math.round(item.overstock_risk_score * 100)}%). Erwägen Sie reduzierte Nachbestellung.`,
        reasoning: `Artikel zeigt Tendenz Richtung C-Klassifizierung. Präventive Bestandsreduktion empfohlen.`,
        confidence_score: 0.72,
        estimated_impact_value: null,
        estimated_impact_type: null,
        key_metrics: {
          currentStock: item.current_stock,
          daysOfStock: item.days_of_stock,
          overstockRisk: item.overstock_risk_score
        }
      });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);

  return recommendations.slice(0, 20);
}

function generateSummary(
  classifications: Array<{ abc_class: string; days_of_stock: number | null; return_rate_percent: number; total_revenue: number; current_stock: number }>,
  aCount: number,
  bCount: number,
  cCount: number,
  totalRevenue: number
): string {
  const parts: string[] = [];

  parts.push(`ABC-Analyse abgeschlossen: ${classifications.length} Artikel analysiert.`);
  parts.push(`Verteilung: ${aCount} A-Artikel (Top-Performer), ${bCount} B-Artikel (Mittelfeld), ${cCount} C-Artikel (Langsamdreher).`);
  
  if (totalRevenue > 0) {
    parts.push(`Gesamtumsatz im Analysezeitraum: ${(totalRevenue / 1000).toFixed(1)}k CHF.`);
  }

  const slowMovers = classifications.filter(c => c.abc_class === 'C' && c.days_of_stock && c.days_of_stock > 90);
  if (slowMovers.length > 0) {
    const slowMoverStock = slowMovers.reduce((sum, c) => sum + c.current_stock, 0);
    parts.push(`${slowMovers.length} C-Artikel mit >90 Tagen Reichweite binden ${slowMoverStock} Einheiten Lagerbestand.`);
  }

  const highReturns = classifications.filter(c => c.return_rate_percent > 10);
  if (highReturns.length > 0) {
    parts.push(`${highReturns.length} Artikel mit erhöhter Retourenquote (>10%) identifiziert.`);
  }

  return parts.join(' ');
}
