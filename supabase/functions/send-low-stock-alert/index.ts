import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LowStockAlertRequest {
  inventoryId: string;
  sku: string;
  name: string;
  available: number;
  threshold: number;
  companyId: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { inventoryId, sku, name, available, threshold, companyId }: LowStockAlertRequest = await req.json();

    console.log(`Processing low stock alert for SKU: ${sku}, Available: ${available}, Threshold: ${threshold}`);

    // Get company details
    const { data: company } = await supabase
      .from("companies")
      .select("name, primary_color")
      .eq("id", companyId)
      .single();

    const companyName = company?.name || "Unbekanntes Unternehmen";
    const brandColor = company?.primary_color || "#3b82f6";

    // Get users who should receive notifications for this company
    const { data: notificationSettings } = await supabase
      .from("notification_settings")
      .select(`
        user_id,
        notify_low_stock,
        email_enabled
      `)
      .eq("company_id", companyId)
      .eq("notify_low_stock", true)
      .eq("email_enabled", true);

    if (!notificationSettings || notificationSettings.length === 0) {
      console.log("No users configured for low stock notifications");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get user profiles for email addresses
    const userIds = notificationSettings.map(s => s.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    // Also send push notifications
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({
          companyId,
          notificationType: "notify_low_stock",
          title: "⚠️ Niedriger Lagerbestand",
          body: `${sku} (${name}) hat nur noch ${available} Stück (Mindestbestand: ${threshold})`,
          url: "/inventory"
        })
      });
    } catch (pushError) {
      console.error("Failed to send push notification:", pushError);
    }

    // Send email notifications if Resend is configured
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email notifications");
      return new Response(
        JSON.stringify({ success: true, sentPush: true, sentEmail: false }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const setting of notificationSettings) {
      const profile = profiles?.find(p => p.id === setting.user_id);
      if (!profile?.email) continue;

      try {
        await resend.emails.send({
          from: "Fulfillment Hub <noreply@resend.dev>",
          to: [profile.email],
          subject: `⚠️ Niedriger Lagerbestand: ${sku}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 100%); border-radius: 12px 12px 0 0; padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Niedriger Lagerbestand</h1>
                </div>
                
                <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                    Hallo ${profile.full_name || 'Team'},
                  </p>
                  
                  <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">
                    Der folgende Artikel bei <strong>${companyName}</strong> hat den Mindestbestand unterschritten:
                  </p>
                  
                  <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #92400e; font-weight: 500;">SKU:</td>
                        <td style="padding: 8px 0; color: #92400e; font-family: monospace; font-weight: bold;">${sku}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #92400e; font-weight: 500;">Artikel:</td>
                        <td style="padding: 8px 0; color: #92400e;">${name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #92400e; font-weight: 500;">Verfügbar:</td>
                        <td style="padding: 8px 0; color: #dc2626; font-weight: bold; font-size: 18px;">${available} Stück</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #92400e; font-weight: 500;">Mindestbestand:</td>
                        <td style="padding: 8px 0; color: #92400e; font-weight: bold;">${threshold} Stück</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="margin: 20px 0; color: #374151; font-size: 16px;">
                    Bitte prüfen Sie den Bestand und veranlassen Sie ggf. eine Nachbestellung.
                  </p>
                  
                  <a href="https://clarity-flow-79.lovable.app/inventory" 
                     style="display: inline-block; background: ${brandColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; margin-top: 10px;">
                    Zum Lagerbestand →
                  </a>
                  
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  
                  <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                    Diese E-Mail wurde automatisch vom Fulfillment Hub versendet.<br>
                    Sie können Ihre Benachrichtigungseinstellungen in den Einstellungen anpassen.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        emailsSent++;
        console.log(`Email sent to ${profile.email}`);
      } catch (emailError) {
        emailsFailed++;
        console.error(`Failed to send email to ${profile.email}:`, emailError);
      }
    }

    // Log the alert
    await supabase.from("audit_logs").insert({
      action: "low_stock_alert_sent",
      entity_type: "inventory",
      entity_id: inventoryId,
      details: {
        sku,
        name,
        available,
        threshold,
        companyId,
        emailsSent,
        emailsFailed,
        recipientCount: notificationSettings.length
      },
      severity: "warning"
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent, 
        emailsFailed,
        totalRecipients: notificationSettings.length 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-low-stock-alert:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
