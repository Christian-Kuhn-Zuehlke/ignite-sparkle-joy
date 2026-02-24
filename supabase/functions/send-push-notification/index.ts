import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, Logger, checkRateLimit, rateLimitResponse, getClientIdentifier } from '../_shared/security.ts';

const logger = new Logger('send-push-notification');

interface PushNotificationRequest {
  companyId: string;
  notificationType: 'notify_order_created' | 'notify_order_shipped' | 'notify_order_delivered' | 'notify_low_stock' | 'notify_sla_warning' | 'notify_returns';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  url?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Web Push implementation using crypto
async function sendWebPush(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const vapidSubject = 'mailto:notifications@ms-direct.ch';
    
    // Create JWT for VAPID
    const header = { typ: 'JWT', alg: 'ES256' };
    const now = Math.floor(Date.now() / 1000);
    const audience = new URL(subscription.endpoint).origin;
    
    const claims = {
      aud: audience,
      exp: now + 12 * 60 * 60, // 12 hours
      sub: vapidSubject,
    };
    
    // Base64url encode
    const b64url = (data: string) => btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const jsonb64 = (obj: object) => b64url(JSON.stringify(obj));
    
    const unsignedToken = `${jsonb64(header)}.${jsonb64(claims)}`;
    
    // Import the private key for signing
    const privateKeyBuffer = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    
    // Create the raw key (32 bytes for the private key)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      privateKeyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // For a simpler approach, we'll use the fetch API with the subscription endpoint
    // and include the necessary headers
    
    console.log(`Sending push to endpoint: ${subscription.endpoint}`);
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
        'Authorization': `vapid t=${unsignedToken}, k=${vapidPublicKey}`,
      },
      body: payload,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Push failed: ${response.status} - ${errorText}`);
      
      // If subscription is invalid (410 Gone), we should remove it
      if (response.status === 410) {
        console.log('Subscription expired or invalid');
        return false;
      }
      
      return false;
    }
    
    console.log('Push notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending web push:', error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 50, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', { clientId });
    return rateLimitResponse(corsHeaders, rateLimit.resetIn);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { companyId, notificationType, title, body, data, url }: PushNotificationRequest = await req.json();
    
    console.log(`Processing push notification for company: ${companyId}, type: ${notificationType}`);
    
    // Get all users with push_enabled = true and the specific notification type enabled
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('id, user_id, push_subscription')
      .eq('company_id', companyId)
      .eq('push_enabled', true)
      .eq(notificationType, true);
    
    if (settingsError) {
      console.error('Error fetching notification settings:', settingsError);
      throw settingsError;
    }
    
    if (!settings || settings.length === 0) {
      console.log('No users subscribed for this notification type');
      return new Response(
        JSON.stringify({ message: 'No subscribers', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Found ${settings.length} subscribers`);
    
    const payload = JSON.stringify({
      title,
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: {
        ...data,
        url: url || '/',
      },
    });
    
    let successCount = 0;
    let failCount = 0;
    const expiredSubscriptions: string[] = [];
    
    // Send push notification to each subscriber
    for (const setting of settings) {
      if (!setting.push_subscription) {
        console.log(`User ${setting.user_id} has no subscription`);
        continue;
      }
      
      const subscription = setting.push_subscription as unknown as PushSubscription;
      
      if (!subscription.endpoint || !subscription.keys) {
        console.log(`Invalid subscription for user ${setting.user_id}`);
        continue;
      }
      
      const success = await sendWebPush(subscription, payload, vapidPublicKey, vapidPrivateKey);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
        expiredSubscriptions.push(setting.id);
      }
    }
    
    // Remove expired subscriptions
    if (expiredSubscriptions.length > 0) {
      console.log(`Removing ${expiredSubscriptions.length} expired subscriptions`);
      await supabase
        .from('notification_settings')
        .update({ push_enabled: false, push_subscription: null })
        .in('id', expiredSubscriptions);
    }
    
    console.log(`Push notifications sent: ${successCount} success, ${failCount} failed`);
    
    return new Response(
      JSON.stringify({ 
        message: 'Notifications processed',
        sent: successCount,
        failed: failCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in send-push-notification function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
