import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('notify-registration');
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface RegistrationNotification {
  user_email: string;
  user_name: string;
  company_name: string;
  is_pending: boolean;
  requested_company_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === "OPTIONS") {
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_email, user_name, company_name, is_pending, requested_company_name }: RegistrationNotification = await req.json();

    logger.info('Processing registration notification', { user_email, company_name, is_pending });

    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "system_admin");

    if (rolesError) {
      logger.error('Error fetching admin roles', rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      logger.info('No system admins found to notify');
      return new Response(JSON.stringify({ message: "No admins to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: adminProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .in("user_id", adminUserIds);

    if (profilesError) {
      logger.error('Error fetching admin profiles', profilesError);
      throw profilesError;
    }

    if (!adminProfiles || adminProfiles.length === 0) {
      logger.info('No admin profiles found');
      return new Response(JSON.stringify({ message: "No admin profiles found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminEmails = adminProfiles.map(p => p.email).filter(Boolean);
    logger.info('Sending notification', { adminCount: adminEmails.length });

    const statusBadge = is_pending 
      ? `<span style="background-color: #FEF3C7; color: #92400E; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">⏳ Freigabe erforderlich</span>`
      : `<span style="background-color: #D1FAE5; color: #065F46; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600;">✓ Automatisch freigegeben</span>`;

    const pendingInfo = is_pending 
      ? `<div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <strong>⚠️ Aktion erforderlich:</strong><br/>
          Der Benutzer hat eine unbekannte Firma angegeben: <strong>${requested_company_name || company_name}</strong><br/>
          Bitte prüfen und freigeben unter: Einstellungen → Pending Registrations
        </div>`
      : "";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Neue Registrierung</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h1 style="color: #111827; font-size: 24px; margin-bottom: 8px;">🆕 Neue Benutzer-Registrierung</h1>
          <p style="color: #6B7280; margin-bottom: 24px;">Ein neuer Benutzer hat sich im MSD Fulfillment Portal registriert.</p>
          
          ${statusBadge}
          
          <div style="background-color: #F3F4F6; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6B7280; width: 120px;">Name:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 500;">${user_name || "Nicht angegeben"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280;">E-Mail:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 500;">${user_email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280;">Firma:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 500;">${company_name || requested_company_name || "Nicht angegeben"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6B7280;">Status:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 500;">${is_pending ? "Pending (Freigabe erforderlich)" : "Freigegeben"}</td>
              </tr>
            </table>
          </div>
          
          ${pendingInfo}
          
          <p style="color: #6B7280; font-size: 14px; margin-top: 24px;">
            Diese E-Mail wurde automatisch gesendet vom MSD Fulfillment Portal.
          </p>
        </div>
      </body>
      </html>
    `;

    let emailResult;
    let sentTo: string[] = [];
    
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: "MSD Fulfillment <onboarding@resend.dev>",
        to: adminEmails,
        subject: is_pending 
          ? `⚠️ Neue Registrierung erfordert Freigabe: ${user_email}`
          : `✓ Neue Registrierung: ${user_email}`,
        html: emailHtml,
      });

      if (emailError) {
        throw emailError;
      }
      
      emailResult = emailData;
      sentTo = adminEmails;
    } catch (sendError: any) {
      logger.warn('Initial send failed, checking test mode', { error: sendError.message });
      
      if (sendError.message?.includes("only send testing emails to your own email")) {
        const match = sendError.message.match(/\(([^)]+@[^)]+)\)/);
        const allowedEmail = match ? match[1] : null;
        
        if (allowedEmail) {
          logger.info('Test mode detected, sending to allowed email', { allowedEmail });
          
          const { data: fallbackData, error: fallbackError } = await resend.emails.send({
            from: "MSD Fulfillment <onboarding@resend.dev>",
            to: [allowedEmail],
            subject: is_pending 
              ? `⚠️ Neue Registrierung erfordert Freigabe: ${user_email}`
              : `✓ Neue Registrierung: ${user_email}`,
            html: emailHtml + `<p style="color: #EF4444; font-size: 12px; margin-top: 16px; padding: 8px; background: #FEE2E2; border-radius: 4px;">⚠️ <strong>Test-Modus:</strong> Diese Email ging nur an ${allowedEmail}.</p>`,
          });

          if (fallbackError) {
            throw fallbackError;
          }
          
          emailResult = fallbackData;
          sentTo = [allowedEmail];
        } else {
          throw sendError;
        }
      } else {
        throw sendError;
      }
    }

    logger.info('Email sent successfully', { sentTo, emailResult });

    return new Response(JSON.stringify({ success: true, emailResult, sentTo }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logger.error('Notification failed', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
