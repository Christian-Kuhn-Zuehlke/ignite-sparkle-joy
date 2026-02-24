-- Add MS Direct Order State columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS ms_client_id TEXT,
ADD COLUMN IF NOT EXISTS ms_client_token TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.companies.ms_client_id IS 'MS Direct client ID for OrderState API (e.g. AV, NK)';
COMMENT ON COLUMN public.companies.ms_client_token IS 'MS Direct authentication token for OrderState API';