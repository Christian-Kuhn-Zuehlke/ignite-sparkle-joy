-- Create sync_logs table for tracking daily sync results
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  sync_type TEXT NOT NULL DEFAULT 'daily_auto',
  status TEXT NOT NULL DEFAULT 'pending',
  orders_imported INTEGER DEFAULT 0,
  orders_updated INTEGER DEFAULT 0,
  orders_errors INTEGER DEFAULT 0,
  inventory_imported INTEGER DEFAULT 0,
  inventory_updated INTEGER DEFAULT 0,
  inventory_errors INTEGER DEFAULT 0,
  error_messages TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_company_id ON public.sync_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON public.sync_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users with approved membership can view their company's sync logs
CREATE POLICY "Users can view their company sync logs"
ON public.sync_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.company_id = sync_logs.company_id
    AND m.status = 'approved'
  )
);

-- Policy: System admins can view all sync logs
CREATE POLICY "System admins can view all sync logs"
ON public.sync_logs
FOR SELECT
USING (
  public.has_role(auth.uid(), 'system_admin')
);

-- Policy: Service role can insert sync logs (for edge functions)
CREATE POLICY "Service role can insert sync logs"
ON public.sync_logs
FOR INSERT
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.sync_logs IS 'Tracks daily automated data sync results from MS Direct API';