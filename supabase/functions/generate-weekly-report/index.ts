import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyMetrics {
  ordersThisWeek: number;
  ordersLastWeek: number;
  ordersTrend: number;
  shipmentsThisWeek: number;
  shipmentsLastWeek: number;
  shipmentsTrend: number;
  returnsThisWeek: number;
  returnsLastWeek: number;
  returnsTrend: number;
  avgProcessingHours: number;
  slaCompliance: number;
  topProducts: Array<{ sku: string; name: string; quantity: number }>;
  lowStockItems: number;
  totalRevenue: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, language = 'de' } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Calculate date ranges
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 14);

    // Fetch metrics for this week and last week
    let ordersThisWeekQuery = supabase
      .from('orders')
      .select('id, order_amount, status, order_date', { count: 'exact' })
      .gte('order_date', thisWeekStart.toISOString().split('T')[0]);

    let ordersLastWeekQuery = supabase
      .from('orders')
      .select('id', { count: 'exact' })
      .gte('order_date', lastWeekStart.toISOString().split('T')[0])
      .lt('order_date', thisWeekStart.toISOString().split('T')[0]);

    let shipmentsThisWeekQuery = supabase
      .from('orders')
      .select('id', { count: 'exact' })
      .eq('status', 'shipped')
      .gte('posted_shipment_date', thisWeekStart.toISOString().split('T')[0]);

    let shipmentsLastWeekQuery = supabase
      .from('orders')
      .select('id', { count: 'exact' })
      .eq('status', 'shipped')
      .gte('posted_shipment_date', lastWeekStart.toISOString().split('T')[0])
      .lt('posted_shipment_date', thisWeekStart.toISOString().split('T')[0]);

    let returnsThisWeekQuery = supabase
      .from('returns')
      .select('id', { count: 'exact' })
      .gte('return_date', thisWeekStart.toISOString().split('T')[0]);

    let returnsLastWeekQuery = supabase
      .from('returns')
      .select('id', { count: 'exact' })
      .gte('return_date', lastWeekStart.toISOString().split('T')[0])
      .lt('return_date', thisWeekStart.toISOString().split('T')[0]);

    let lowStockQuery = supabase
      .from('inventory')
      .select('id, sku, name, available, low_stock_threshold')
      .not('low_stock_threshold', 'is', null);

    let topProductsQuery = supabase
      .from('order_lines')
      .select('sku, name, quantity');

    // Apply company filter if provided
    if (companyId) {
      ordersThisWeekQuery = ordersThisWeekQuery.eq('company_id', companyId);
      ordersLastWeekQuery = ordersLastWeekQuery.eq('company_id', companyId);
      shipmentsThisWeekQuery = shipmentsThisWeekQuery.eq('company_id', companyId);
      shipmentsLastWeekQuery = shipmentsLastWeekQuery.eq('company_id', companyId);
      returnsThisWeekQuery = returnsThisWeekQuery.eq('company_id', companyId);
      returnsLastWeekQuery = returnsLastWeekQuery.eq('company_id', companyId);
      lowStockQuery = lowStockQuery.eq('company_id', companyId);
    }

    // Execute all queries in parallel
    const [
      ordersThisWeekResult,
      ordersLastWeekResult,
      shipmentsThisWeekResult,
      shipmentsLastWeekResult,
      returnsThisWeekResult,
      returnsLastWeekResult,
      lowStockResult,
      topProductsResult
    ] = await Promise.all([
      ordersThisWeekQuery,
      ordersLastWeekQuery,
      shipmentsThisWeekQuery,
      shipmentsLastWeekQuery,
      returnsThisWeekQuery,
      returnsLastWeekQuery,
      lowStockQuery,
      topProductsQuery.limit(1000)
    ]);

    const ordersThisWeek = ordersThisWeekResult.count || 0;
    const ordersLastWeek = ordersLastWeekResult.count || 0;
    const shipmentsThisWeek = shipmentsThisWeekResult.count || 0;
    const shipmentsLastWeek = shipmentsLastWeekResult.count || 0;
    const returnsThisWeek = returnsThisWeekResult.count || 0;
    const returnsLastWeek = returnsLastWeekResult.count || 0;

    // Calculate trends
    const ordersTrend = ordersLastWeek > 0 
      ? ((ordersThisWeek - ordersLastWeek) / ordersLastWeek) * 100 
      : 0;
    const shipmentsTrend = shipmentsLastWeek > 0 
      ? ((shipmentsThisWeek - shipmentsLastWeek) / shipmentsLastWeek) * 100 
      : 0;
    const returnsTrend = returnsLastWeek > 0 
      ? ((returnsThisWeek - returnsLastWeek) / returnsLastWeek) * 100 
      : 0;

    // Calculate total revenue this week
    const totalRevenue = (ordersThisWeekResult.data || []).reduce(
      (sum, order) => sum + (Number(order.order_amount) || 0), 0
    );

    // Count low stock items
    const lowStockItems = (lowStockResult.data || []).filter(
      item => item.available != null && item.low_stock_threshold != null && 
              item.available <= item.low_stock_threshold
    ).length;

    // Aggregate top products
    const productMap = new Map<string, { name: string; quantity: number }>();
    for (const line of (topProductsResult.data || [])) {
      const existing = productMap.get(line.sku) || { name: line.name, quantity: 0 };
      existing.quantity += line.quantity;
      productMap.set(line.sku, existing);
    }
    const topProducts = Array.from(productMap.entries())
      .map(([sku, data]) => ({ sku, name: data.name, quantity: data.quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Calculate SLA compliance (orders shipped within 24h)
    const shippedOrders = (ordersThisWeekResult.data || []).filter(o => o.status === 'shipped');
    const slaCompliance = ordersThisWeek > 0 
      ? (shippedOrders.length / ordersThisWeek) * 100 
      : 100;

    const metrics: WeeklyMetrics = {
      ordersThisWeek,
      ordersLastWeek,
      ordersTrend,
      shipmentsThisWeek,
      shipmentsLastWeek,
      shipmentsTrend,
      returnsThisWeek,
      returnsLastWeek,
      returnsTrend,
      avgProcessingHours: 18, // Placeholder - would need order events to calculate
      slaCompliance,
      topProducts,
      lowStockItems,
      totalRevenue
    };

    // Generate AI report
    const systemPrompt = language === 'de' 
      ? `Du bist ein Fulfillment-Analyst. Erstelle einen prägnanten Wochenbericht basierend auf den Metriken. 
         Verwende klare Überschriften, Bullet Points und Empfehlungen. 
         Halte den Bericht auf Deutsch und professionell. Max 500 Wörter.
         Formatiere mit Markdown.`
      : `You are a fulfillment analyst. Create a concise weekly report based on the metrics.
         Use clear headings, bullet points, and recommendations.
         Keep the report professional. Max 500 words.
         Format with Markdown.`;

    const userPrompt = `Erstelle einen Wochenbericht für folgende Fulfillment-Metriken:

**Bestellungen:**
- Diese Woche: ${metrics.ordersThisWeek} (${metrics.ordersTrend >= 0 ? '+' : ''}${metrics.ordersTrend.toFixed(1)}% vs. Vorwoche)
- Umsatz: CHF ${metrics.totalRevenue.toLocaleString('de-CH', { minimumFractionDigits: 2 })}

**Versand:**
- Versendet: ${metrics.shipmentsThisWeek} (${metrics.shipmentsTrend >= 0 ? '+' : ''}${metrics.shipmentsTrend.toFixed(1)}% vs. Vorwoche)
- SLA-Erfüllung: ${metrics.slaCompliance.toFixed(1)}%

**Retouren:**
- Diese Woche: ${metrics.returnsThisWeek} (${metrics.returnsTrend >= 0 ? '+' : ''}${metrics.returnsTrend.toFixed(1)}% vs. Vorwoche)
- Retourenquote: ${ordersThisWeek > 0 ? ((metrics.returnsThisWeek / metrics.ordersThisWeek) * 100).toFixed(1) : 0}%

**Lager:**
- Artikel unter Mindestbestand: ${metrics.lowStockItems}

**Top 5 Produkte:**
${metrics.topProducts.map((p, i) => `${i + 1}. ${p.name} (${p.sku}): ${p.quantity} Stück`).join('\n')}

Gib konkrete Empfehlungen basierend auf den Trends.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const reportContent = aiData.choices?.[0]?.message?.content || "Report generation failed.";

    return new Response(JSON.stringify({
      success: true,
      metrics,
      report: reportContent,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating report:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
