
-- Create enum for company onboarding status
CREATE TYPE public.company_status AS ENUM ('pending', 'onboarding', 'live', 'paused', 'churned');

-- Add onboarding fields to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS status public.company_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS go_live_date DATE,
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contract_start_date DATE,
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS contract_type TEXT,
ADD COLUMN IF NOT EXISTS hubspot_company_id TEXT,
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_completed_steps JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);

-- Add comment for documentation
COMMENT ON COLUMN public.companies.status IS 'Company lifecycle status: pending (not started), onboarding (in wizard), live (active), paused (temporarily inactive), churned (left)';
COMMENT ON COLUMN public.companies.onboarding_completed_steps IS 'Array of completed wizard step IDs: ["company", "branding", "sla", "integrations", "users", "golive"]';
