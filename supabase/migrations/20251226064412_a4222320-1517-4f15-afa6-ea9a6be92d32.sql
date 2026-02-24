-- Create order_events table for SLA tracking with start/end timestamps (if not exists)
CREATE TABLE IF NOT EXISTS public.order_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('status_change', 'created', 'note_added', 'sla_warning', 'sla_breach')),
  old_status TEXT,
  new_status TEXT,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_seconds INTEGER, -- Duration in previous status (calculated)
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID, -- User who triggered the event (optional)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON public.order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_company_id ON public.order_events(company_id);
CREATE INDEX IF NOT EXISTS idx_order_events_occurred_at ON public.order_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_events_event_type ON public.order_events(event_type);

-- Enable RLS
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own company order_events"
ON public.order_events
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "MSD staff can view all order_events"
ON public.order_events
FOR SELECT
USING (
  has_role(auth.uid(), 'msd_csm'::app_role) OR 
  has_role(auth.uid(), 'msd_ma'::app_role) OR 
  has_role(auth.uid(), 'system_admin'::app_role)
);

CREATE POLICY "System admins can insert order_events"
ON public.order_events
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_events;

-- Create trigger function to automatically log status changes
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev_event_time TIMESTAMP WITH TIME ZONE;
  duration_secs INTEGER;
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get the time of the last status change for duration calculation
    SELECT occurred_at INTO prev_event_time
    FROM public.order_events
    WHERE order_id = NEW.id AND event_type = 'status_change'
    ORDER BY occurred_at DESC
    LIMIT 1;
    
    -- Calculate duration in previous status
    IF prev_event_time IS NOT NULL THEN
      duration_secs := EXTRACT(EPOCH FROM (now() - prev_event_time))::INTEGER;
    ELSE
      -- First status change, calculate from order creation
      duration_secs := EXTRACT(EPOCH FROM (now() - NEW.created_at))::INTEGER;
    END IF;
    
    -- Insert the event
    INSERT INTO public.order_events (
      order_id,
      company_id,
      event_type,
      old_status,
      new_status,
      occurred_at,
      duration_seconds,
      metadata
    ) VALUES (
      NEW.id,
      NEW.company_id,
      'status_change',
      OLD.status::TEXT,
      NEW.status::TEXT,
      now(),
      duration_secs,
      jsonb_build_object(
        'previous_status_date', OLD.status_date,
        'triggered_by', 'system'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_change();

-- Create function to backfill events from existing orders
CREATE OR REPLACE FUNCTION public.backfill_order_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  orders_processed INTEGER := 0;
BEGIN
  -- Insert 'created' event for all existing orders that don't have events
  INSERT INTO public.order_events (order_id, company_id, event_type, new_status, occurred_at, metadata)
  SELECT 
    o.id,
    o.company_id,
    'created',
    'received',
    o.created_at,
    jsonb_build_object('backfilled', true, 'order_date', o.order_date)
  FROM public.orders o
  WHERE NOT EXISTS (
    SELECT 1 FROM public.order_events e WHERE e.order_id = o.id
  );
  
  GET DIAGNOSTICS orders_processed = ROW_COUNT;
  
  -- Insert current status as last known event
  INSERT INTO public.order_events (order_id, company_id, event_type, old_status, new_status, occurred_at, metadata)
  SELECT 
    o.id,
    o.company_id,
    'status_change',
    'received',
    o.status::TEXT,
    COALESCE(o.status_date, o.updated_at),
    jsonb_build_object('backfilled', true, 'estimated', true)
  FROM public.orders o
  WHERE o.status != 'received'
  AND NOT EXISTS (
    SELECT 1 FROM public.order_events e 
    WHERE e.order_id = o.id AND e.event_type = 'status_change'
  );
  
  RETURN orders_processed;
END;
$$;