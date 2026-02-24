-- Add branding color fields and logo URL to companies table
ALTER TABLE public.companies
ADD COLUMN primary_color text DEFAULT '#6366f1',
ADD COLUMN accent_color text DEFAULT '#22c55e',
ADD COLUMN logo_url text;

-- Add comments for documentation
COMMENT ON COLUMN public.companies.primary_color IS 'Primary brand color in hex format (e.g., #6366f1)';
COMMENT ON COLUMN public.companies.accent_color IS 'Accent brand color in hex format (e.g., #22c55e)';
COMMENT ON COLUMN public.companies.logo_url IS 'URL to company logo in storage';

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view company logos
CREATE POLICY "Anyone can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Allow system admins to upload company logos
CREATE POLICY "System admins can upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' 
  AND has_role(auth.uid(), 'system_admin'::app_role)
);

-- Allow system admins to update company logos
CREATE POLICY "System admins can update company logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos' 
  AND has_role(auth.uid(), 'system_admin'::app_role)
);

-- Allow system admins to delete company logos
CREATE POLICY "System admins can delete company logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos' 
  AND has_role(auth.uid(), 'system_admin'::app_role)
);