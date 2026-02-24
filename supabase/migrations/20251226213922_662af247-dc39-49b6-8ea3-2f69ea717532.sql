-- Fix companies RLS policies - change from RESTRICTIVE to PERMISSIVE
-- Currently all are RESTRICTIVE which means they are AND'd together
-- They should be PERMISSIVE so they are OR'd together

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Customer admins can view their own company" ON public.companies;
DROP POLICY IF EXISTS "MSD staff can view all companies" ON public.companies;
DROP POLICY IF EXISTS "System admins can manage all companies" ON public.companies;

-- Create new PERMISSIVE policies (using AS PERMISSIVE explicitly)
CREATE POLICY "System admins can manage all companies" 
ON public.companies 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'system_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "MSD staff can view all companies" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role));

CREATE POLICY "Customer admins can view their own company" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (id = get_user_company_id(auth.uid()));