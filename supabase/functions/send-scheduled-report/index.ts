import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReportRequest {
  companyId: string;
  recipientEmail: string;
  recipientName?: string;
  reportType: 'weekly' | 'daily' | 'monthly';
  language?: 'de' | 'en';
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { companyId, recipientEmail, recipientName, reportType, language = 'de' }: ReportRequest = await req.json();

    // Calculate date ranges
    const now = new Date();
    let startDate: Date;
    let periodLabel: string;

    switch (reportType) {
      case 'daily':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        periodLabel = language === 'de' ? 'Tagesbericht' : 'Daily Report';
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        periodLabel = language === 'de' ? 'Monatsbericht' : 'Monthly Report';
        break;
      default: // weekly
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        periodLabel = language === 'de' ? 'Wochenbericht' : 'Weekly Report';
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = now.toISOString().split('T')[0];

    // Fetch metrics
    const [ordersResult, shipmentsResult, returnsResult, lowStockResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_amount, status, shipping_agent_code')
        .eq('company_id', companyId)
        .gte('order_date', startDateStr)
        .lte('order_date', endDateStr),
      supabase
        .from('orders')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'shipped')
        .gte('posted_shipment_date', startDateStr),
      supabase
        .from('returns')
        .select('id, amount')
        .eq('company_id', companyId)
        .gte('return_date', startDateStr),
      supabase
        .from('inventory')
        .select('id')
        .eq('company_id', companyId)
        .not('low_stock_threshold', 'is', null)
        .filter('available', 'lte', 'low_stock_threshold'),
    ]);

    const orders = ordersResult.data || [];
    const shipments = shipmentsResult.data || [];
    const returns = returnsResult.data || [];
    const lowStockItems = lowStockResult.data || [];

    const totalRevenue = orders.reduce((sum, o) => sum + (o.order_amount || 0), 0);
    const totalReturns = returns.reduce((sum, r) => sum + (r.amount || 0), 0);
    const shippedCount = shipments.length;
    const returnRate = orders.length > 0 ? ((returns.length / orders.length) * 100).toFixed(1) : '0';

    // Carrier breakdown
    const carrierStats: Record<string, number> = {};
    orders.forEach(o => {
      const carrier = o.shipping_agent_code || 'Unbekannt';
      carrierStats[carrier] = (carrierStats[carrier] || 0) + 1;
    });

    const carrierBreakdown = Object.entries(carrierStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([carrier, count]) => `${carrier}: ${count}`)
      .join(', ');

    // Get company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    const companyName = company?.name || companyId;

    // Build email content
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 32px; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 8px 0 0; opacity: 0.9; }
    .content { padding: 32px; }
    .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .metric { background: #f1f5f9; padding: 16px; border-radius: 8px; }
    .metric-value { font-size: 28px; font-weight: 700; color: #1e293b; }
    .metric-label { font-size: 14px; color: #64748b; margin-top: 4px; }
    .section { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
    .section h3 { margin: 0 0 12px; color: #334155; }
    .footer { padding: 24px 32px; background: #f8fafc; border-radius: 0 0 12px 12px; text-align: center; color: #64748b; font-size: 12px; }
    .success { color: #22c55e; }
    .warning { color: #f59e0b; }
    .danger { color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${periodLabel}</h1>
      <p>${companyName} • ${startDateStr} - ${endDateStr}</p>
    </div>
    <div class="content">
      <div class="metric-grid">
        <div class="metric">
          <div class="metric-value">${orders.length}</div>
          <div class="metric-label">${language === 'de' ? 'Bestellungen' : 'Orders'}</div>
        </div>
        <div class="metric">
          <div class="metric-value">${shippedCount}</div>
          <div class="metric-label">${language === 'de' ? 'Versandt' : 'Shipped'}</div>
        </div>
        <div class="metric">
          <div class="metric-value">CHF ${totalRevenue.toLocaleString('de-CH', { minimumFractionDigits: 0 })}</div>
          <div class="metric-label">${language === 'de' ? 'Umsatz' : 'Revenue'}</div>
        </div>
        <div class="metric">
          <div class="metric-value class="${parseFloat(returnRate) > 5 ? 'danger' : 'success'}">${returnRate}%</div>
          <div class="metric-label">${language === 'de' ? 'Retourenquote' : 'Return Rate'}</div>
        </div>
      </div>
      
      <div class="section">
        <h3>📦 ${language === 'de' ? 'Spediteur-Verteilung' : 'Carrier Distribution'}</h3>
        <p>${carrierBreakdown || (language === 'de' ? 'Keine Daten' : 'No data')}</p>
      </div>
      
      ${lowStockItems.length > 0 ? `
      <div class="section">
        <h3 class="warning">⚠️ ${language === 'de' ? 'Niedrige Lagerbestände' : 'Low Stock Alert'}</h3>
        <p>${lowStockItems.length} ${language === 'de' ? 'Artikel unter Mindestbestand' : 'items below threshold'}</p>
      </div>
      ` : ''}
      
      <div class="section">
        <h3>📊 ${language === 'de' ? 'Retouren' : 'Returns'}</h3>
        <p>${returns.length} ${language === 'de' ? 'Retouren' : 'returns'} (CHF ${totalReturns.toLocaleString('de-CH')})</p>
      </div>
    </div>
    <div class="footer">
      ${language === 'de' ? 'Automatisch generiert von' : 'Automatically generated by'} Lovable Cloud<br>
      ${new Date().toLocaleString(language === 'de' ? 'de-CH' : 'en-US')}
    </div>
  </div>
</body>
</html>
`;

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Fulfillment Reports <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `${periodLabel} - ${companyName} (${startDateStr} - ${endDateStr})`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      throw new Error(`Email send failed: ${errorData.message || 'Unknown error'}`);
    }

    const emailResult = await emailResponse.json();
    console.log("Report email sent:", emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    console.error("Error sending report:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
