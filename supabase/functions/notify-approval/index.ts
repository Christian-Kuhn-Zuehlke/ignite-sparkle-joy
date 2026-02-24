import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('notify-approval');
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface ApprovalNotification {
  user_email: string;
  user_name: string;
  company_name: string;
  action: 'approved' | 'rejected';
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === "OPTIONS") {
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
    const { user_email, user_name, company_name, action }: ApprovalNotification = await req.json();

    logger.info('Processing approval notification', { user_email, company_name, action });

    if (!user_email) {
      return new Response(JSON.stringify({ error: "User email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const isApproved = action === 'approved';
    const displayCompanyName = company_name || 'deinem Unternehmen';
    
    const emailHtml = isApproved ? `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Zugang freigeschaltet</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 48px;">🎉</span>
          </div>
          <h1 style="color: #111827; font-size: 24px; margin-bottom: 8px; text-align: center;">
            Willkommen beim ${company_name ? company_name + ' ' : ''}Fulfillment Portal!
          </h1>
          <p style="color: #6B7280; margin-bottom: 24px; text-align: center;">
            Dein Zugang wurde freigeschaltet.
          </p>
          
          <div style="background-color: #D1FAE5; border: 1px solid #10B981; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #065F46; margin: 0; font-weight: 500;">
              ✅ Du kannst dich jetzt einloggen und hast Zugriff auf alle Fulfillment-Daten${company_name ? ` von <strong>${company_name}</strong>` : ''}.
            </p>
          </div>
          
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
              ${company_name ? `<tr>
                <td style="padding: 8px 0; color: #6B7280;">Unternehmen:</td>
                <td style="padding: 8px 0; color: #111827; font-weight: 500;">${company_name}</td>
              </tr>` : ''}
            </table>
          </div>
          
          <div style="text-align: center; margin-top: 32px;">
            <a href="https://clarity-flow-79.lovable.app" style="display: inline-block; background-color: #3B82F6; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 500;">
              Jetzt einloggen →
            </a>
          </div>
          
          <p style="color: #6B7280; font-size: 14px; margin-top: 32px; text-align: center;">
            Bei Fragen wende dich an deinen Ansprechpartner.
          </p>
          </p>
        </div>
      </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Registrierung abgelehnt</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h1 style="color: #111827; font-size: 24px; margin-bottom: 8px;">Registrierung nicht genehmigt</h1>
          <p style="color: #6B7280; margin-bottom: 24px;">Leider konnte deine Registrierung nicht genehmigt werden.</p>
          
          <div style="background-color: #FEE2E2; border: 1px solid #EF4444; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #991B1B; margin: 0;">
              Deine Registrierungsanfrage wurde vom Administrator abgelehnt. 
              Bitte wende dich an deinen Ansprechpartner bei MS Direct für weitere Informationen.
            </p>
          </div>
          
          <p style="color: #6B7280; font-size: 14px; margin-top: 24px;">
            Diese E-Mail wurde automatisch gesendet vom MSD Fulfillment Portal.
          </p>
        </div>
      </body>
      </html>
    `;

    let emailResult;
    
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: "Fulfillment Portal <onboarding@resend.dev>",
        to: [user_email],
        subject: isApproved 
          ? `✅ Dein Zugang ${company_name ? 'zum ' + company_name + ' Portal ' : ''}wurde freigeschaltet`
          : `Registrierung nicht genehmigt`,
        html: emailHtml,
      });

      if (emailError) {
        throw emailError;
      }
      
      emailResult = emailData;
    } catch (sendError: any) {
      logger.warn('Email send failed', { error: sendError.message });
      
      // Handle Resend test mode
      if (sendError.message?.includes("only send testing emails to your own email")) {
        const match = sendError.message.match(/\(([^)]+@[^)]+)\)/);
        const allowedEmail = match ? match[1] : null;
        
        if (allowedEmail) {
          logger.info('Test mode detected, sending to allowed email instead', { allowedEmail });
          
          const { data: fallbackData, error: fallbackError } = await resend.emails.send({
            from: "MSD Fulfillment <onboarding@resend.dev>",
            to: [allowedEmail],
            subject: isApproved 
              ? `✅ [TEST] Registrierung genehmigt für: ${user_email}`
              : `[TEST] Registrierung abgelehnt für: ${user_email}`,
            html: emailHtml + `<p style="color: #EF4444; font-size: 12px; margin-top: 16px; padding: 8px; background: #FEE2E2; border-radius: 4px;">⚠️ <strong>Test-Modus:</strong> Diese Email sollte an ${user_email} gehen, ging aber an ${allowedEmail}.</p>`,
          });

          if (fallbackError) {
            throw fallbackError;
          }
          
          emailResult = fallbackData;
        } else {
          throw sendError;
        }
      } else {
        throw sendError;
      }
    }

    logger.info('Email sent successfully', { user_email, action, emailResult });

    return new Response(JSON.stringify({ success: true, emailResult }), {
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
