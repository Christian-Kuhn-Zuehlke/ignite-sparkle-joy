-- Add tagline/slogan field to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.companies.tagline IS 'Custom brand tagline/slogan shown in welcome screen and branding (e.g. "Fulfillment Excellence - Every Day")';