-- Add preferred_language column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT NULL;

-- Add default_language column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'de';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.preferred_language IS 'User preferred language (de, en, fr, it, es). Overrides company default.';
COMMENT ON COLUMN public.companies.default_language IS 'Company default language for all users. Can be overridden by user preference.';