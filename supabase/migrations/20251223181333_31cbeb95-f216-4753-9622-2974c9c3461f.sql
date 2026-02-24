-- Add branding-relevant fields to companies table
ALTER TABLE public.companies
ADD COLUMN domain text,
ADD COLUMN industry text,
ADD COLUMN brand_keywords text[];

-- Add comments for documentation
COMMENT ON COLUMN public.companies.domain IS 'Company website domain for branding inspiration (e.g., golfyr.ch)';
COMMENT ON COLUMN public.companies.industry IS 'Industry/category (e.g., Fashion, Sports, Technology)';
COMMENT ON COLUMN public.companies.brand_keywords IS 'Keywords for branding themes (e.g., {golf, outdoor, sports})';