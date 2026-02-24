-- Enable pg_net extension for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to send push notification via edge function
CREATE OR REPLACE FUNCTION public.notify_order_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notification_type TEXT;
  notification_title TEXT;
  notification_body TEXT;
  supabase_url TEXT;
  anon_key TEXT;
BEGIN
  -- Get Supabase URL and anon key from environment
  supabase_url := 'https://szruenulmfdxzhvupprf.supabase.co';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cnVlbnVsbWZkeHpodnVwcHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzA3NzYsImV4cCI6MjA4MjA0Njc3Nn0.-75r9ozwgjU60RF_ZPNkzIla-l5dzVlpUFFUec6v-C8';
  
  -- Determine notification type and message based on event
  IF TG_OP = 'INSERT' THEN
    -- New order created
    notification_type := 'notify_order_created';
    notification_title := 'Neue Bestellung';
    notification_body := 'Bestellung ' || NEW.source_no || ' wurde erstellt';
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Status changed
    IF NEW.status = 'shipped' THEN
      notification_type := 'notify_order_shipped';
      notification_title := 'Bestellung versendet';
      notification_body := 'Bestellung ' || NEW.source_no || ' wurde versendet';
    ELSIF NEW.status = 'delivered' THEN
      notification_type := 'notify_order_delivered';
      notification_title := 'Bestellung zugestellt';
      notification_body := 'Bestellung ' || NEW.source_no || ' wurde zugestellt';
    ELSE
      -- Other status changes - no notification
      RETURN NEW;
    END IF;
  ELSE
    -- No notification needed
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Call edge function to send push notification (async, non-blocking)
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'companyId', NEW.company_id,
      'notificationType', notification_type,
      'title', notification_title,
      'body', notification_body,
      'url', '/orders/' || NEW.id::TEXT
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for order notifications
DROP TRIGGER IF EXISTS order_push_notification_trigger ON public.orders;
CREATE TRIGGER order_push_notification_trigger
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_event();

-- Function to send low stock notification
CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url TEXT;
  anon_key TEXT;
BEGIN
  supabase_url := 'https://szruenulmfdxzhvupprf.supabase.co';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cnVlbnVsbWZkeHpodnVwcHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzA3NzYsImV4cCI6MjA4MjA0Njc3Nn0.-75r9ozwgjU60RF_ZPNkzIla-l5dzVlpUFFUec6v-C8';
  
  -- Check if stock dropped below threshold
  IF NEW.low_stock_threshold IS NOT NULL 
     AND NEW.available IS NOT NULL 
     AND NEW.available <= NEW.low_stock_threshold
     AND (OLD.available IS NULL OR OLD.available > NEW.low_stock_threshold) THEN
    
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'companyId', NEW.company_id,
        'notificationType', 'notify_low_stock',
        'title', 'Niedriger Lagerbestand',
        'body', 'Artikel ' || NEW.sku || ' (' || NEW.name || ') hat nur noch ' || NEW.available || ' Stück',
        'url', '/inventory'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for low stock notifications
DROP TRIGGER IF EXISTS inventory_low_stock_trigger ON public.inventory;
CREATE TRIGGER inventory_low_stock_trigger
AFTER UPDATE ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.notify_low_stock();

-- Function to send return notification
CREATE OR REPLACE FUNCTION public.notify_return_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url TEXT;
  anon_key TEXT;
BEGIN
  supabase_url := 'https://szruenulmfdxzhvupprf.supabase.co';
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6cnVlbnVsbWZkeHpodnVwcHJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NzA3NzYsImV4cCI6MjA4MjA0Njc3Nn0.-75r9ozwgjU60RF_ZPNkzIla-l5dzVlpUFFUec6v-C8';
  
  -- Only notify on new returns
  IF TG_OP = 'INSERT' THEN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object(
        'companyId', NEW.company_id,
        'notificationType', 'notify_returns',
        'title', 'Neue Retoure',
        'body', 'Eine neue Retoure wurde erstellt',
        'url', '/returns'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for return notifications
DROP TRIGGER IF EXISTS return_push_notification_trigger ON public.returns;
CREATE TRIGGER return_push_notification_trigger
AFTER INSERT ON public.returns
FOR EACH ROW
EXECUTE FUNCTION public.notify_return_event();