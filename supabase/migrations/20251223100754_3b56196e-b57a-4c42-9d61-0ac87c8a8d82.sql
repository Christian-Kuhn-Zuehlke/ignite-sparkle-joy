-- Create companies table
CREATE TABLE public.companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS policies for companies
CREATE POLICY "System admins can manage all companies"
ON public.companies
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "MSD staff can view all companies"
ON public.companies
FOR SELECT
USING (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role));

CREATE POLICY "Customer admins can view their own company"
ON public.companies
FOR SELECT
USING (id = get_user_company_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing companies from profiles
INSERT INTO public.companies (id, name)
SELECT DISTINCT company_id, company_name
FROM public.profiles
WHERE company_id IS NOT NULL AND company_name IS NOT NULL
ON CONFLICT (id) DO NOTHING;