import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailNotificationRequest {
  companyId: string;
  notificationType: string;
  title: string;
  body: string;
  url?: string;
  orderId?: string;
  orderSourceNo?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: EmailNotificationRequest = await req.json();
    const { companyId, notificationType, title, body, url, orderId, orderSourceNo } = payload;

    console.log("Received email notification request:", { companyId, notificationType, title });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all users with email notifications enabled for this company and notification type
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("user_id, email_enabled")
      .eq("company_id", companyId)
      .eq("email_enabled", true)
      .eq(notificationType, true);

    if (settingsError) {
      console.error("Error fetching notification settings:", settingsError);
      throw settingsError;
    }

    if (!settings || settings.length === 0) {
      console.log("No users with email notifications enabled for this event");
      return new Response(
        JSON.stringify({ message: "No email recipients found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user emails from profiles
    const userIds = settings.map(s => s.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", userIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log("No profiles found for users");
      return new Response(
        JSON.stringify({ message: "No profiles found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get company info for branding
    const { data: company } = await supabase
      .from("companies")
      .select("name, primary_color, logo_url")
      .eq("id", companyId)
      .single();

    const companyName = company?.name || "MSD Portal";
    const primaryColor = company?.primary_color || "#0ea5e9";
    const appUrl = "https://msd-portal.lovable.app";

    // Send emails to all recipients
    const emailPromises = profiles.map(async (profile) => {
      try {
        const { error: emailError } = await resend.emails.send({
          from: `${companyName} <onboarding@resend.dev>`,
          to: [profile.email],
          subject: title,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="background-color: ${primaryColor}; padding: 24px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${companyName}</h1>
                </div>
                <div style="padding: 32px;">
                  <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">${title}</h2>
                  <p style="color: #52525b; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">${body}</p>
                  ${orderSourceNo ? `<p style="color: #71717a; margin: 0 0 24px 0; font-size: 14px;">Bestellnummer: <strong>${orderSourceNo}</strong></p>` : ''}
                  ${url ? `
                  <a href="${appUrl}${url}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
                    Details anzeigen
                  </a>
                  ` : ''}
                </div>
                <div style="background-color: #f4f4f5; padding: 16px 32px; text-align: center;">
                  <p style="color: #71717a; margin: 0; font-size: 12px;">
                    Sie erhalten diese E-Mail, weil Sie Benachrichtigungen für ${companyName} aktiviert haben.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });

        if (emailError) {
          console.error(`Error sending email to ${profile.email}:`, emailError);
          return { success: false, email: profile.email, error: emailError };
        }

        console.log(`Email sent successfully to ${profile.email}`);
        return { success: true, email: profile.email };
      } catch (error) {
        console.error(`Error sending email to ${profile.email}:`, error);
        return { success: false, email: profile.email, error };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Email notifications sent: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: `Sent ${successful} email(s)`,
        successful,
        failed,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-email-notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});