-- ============================================
-- SECURITY FIX: Explizite Auth-Checks für profiles-Tabelle
-- ============================================
-- Fügt auth.uid() IS NOT NULL als Base-Condition hinzu

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Customer admins can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "MSD staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "System admins can view all profiles" ON public.profiles;

-- Recreate with explicit authentication requirement
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Customer admins can view company profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role) AND (company_id = get_user_company_id(auth.uid())));

CREATE POLICY "MSD staff can view all profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role)));

CREATE POLICY "System admins can view all profiles"
ON public.profiles FOR SELECT
USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'system_admin'::app_role));