-- Add MS OrderState API integration fields to orders table
-- This enables synchronization with MS Direct SOAP API for order status, tracking, and invoice information

-- Add tracking fields for returns
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS track_and_trace_id_return TEXT,
ADD COLUMN IF NOT EXISTS track_and_trace_url_return TEXT;

-- Add invoice information fields
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS invoice_no TEXT,
ADD COLUMN IF NOT EXISTS invoice_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS payment_state BOOLEAN DEFAULT false;

-- Add MS Direct order state fields
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS ms_order_state INTEGER,
ADD COLUMN IF NOT EXISTS last_state_sync_at TIMESTAMPTZ;

-- Add MS Direct client configuration to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS ms_client_id TEXT,
ADD COLUMN IF NOT EXISTS ms_client_token TEXT;

-- Create index for sync performance
CREATE INDEX IF NOT EXISTS idx_orders_last_state_sync_at ON public.orders(last_state_sync_at);
CREATE INDEX IF NOT EXISTS idx_orders_ms_order_state ON public.orders(ms_order_state);

-- Add comment for documentation
COMMENT ON COLUMN public.orders.track_and_trace_id_return IS 'Return tracking ID from MS Direct OrderState API';
COMMENT ON COLUMN public.orders.track_and_trace_url_return IS 'Return tracking URL from MS Direct OrderState API';
COMMENT ON COLUMN public.orders.invoice_no IS 'Invoice number from MS Direct OrderState API';
COMMENT ON COLUMN public.orders.invoice_amount IS 'Invoice amount from MS Direct OrderState API';
COMMENT ON COLUMN public.orders.payment_state IS 'Payment state from MS Direct OrderState API';
COMMENT ON COLUMN public.orders.ms_order_state IS 'Numeric order state from MS Direct OrderState API';
COMMENT ON COLUMN public.orders.last_state_sync_at IS 'Timestamp of last successful sync with MS Direct OrderState API';
COMMENT ON COLUMN public.companies.ms_client_id IS 'MS Direct client ID (e.g., AV, NK, GT)';
COMMENT ON COLUMN public.companies.ms_client_token IS 'MS Direct client token for SOAP API authentication';

