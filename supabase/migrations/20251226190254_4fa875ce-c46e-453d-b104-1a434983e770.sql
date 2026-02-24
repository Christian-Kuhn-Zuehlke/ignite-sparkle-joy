-- ============================================
-- FIX: Memberships RLS Policies auf PERMISSIVE umstellen
-- ============================================
-- Problem: Alle Policies sind RESTRICTIVE (Permissive: No)
-- Bei RESTRICTIVE müssen ALLE Policies erfüllt sein
-- Bei PERMISSIVE reicht es wenn EINE Policy erfüllt ist
-- Das Standard-Verhalten sollte PERMISSIVE sein

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Customer admins can delete company memberships" ON public.memberships;
DROP POLICY IF EXISTS "Customer admins can insert company memberships" ON public.memberships;
DROP POLICY IF EXISTS "Customer admins can update company memberships" ON public.memberships;
DROP POLICY IF EXISTS "Customer admins can view company memberships" ON public.memberships;
DROP POLICY IF EXISTS "MSD staff can view all memberships" ON public.memberships;
DROP POLICY IF EXISTS "System admins can manage all memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.memberships;

-- Recreate as PERMISSIVE policies (default, OR logic)

-- 1. Users can view their own memberships
CREATE POLICY "Users can view own memberships"
ON public.memberships FOR SELECT
USING (auth.uid() = user_id);

-- 2. Customer admins can view company memberships
CREATE POLICY "Customer admins can view company memberships"
ON public.memberships FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND has_company_access(auth.uid(), company_id)
);

-- 3. Customer admins can manage company memberships (viewer/admin only)
CREATE POLICY "Customer admins can insert company memberships"
ON public.memberships FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND has_company_access(auth.uid(), company_id) 
  AND role IN ('viewer', 'admin')
);

CREATE POLICY "Customer admins can update company memberships"
ON public.memberships FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND has_company_access(auth.uid(), company_id) 
  AND role IN ('viewer', 'admin')
)
WITH CHECK (role IN ('viewer', 'admin'));

CREATE POLICY "Customer admins can delete company memberships"
ON public.memberships FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND has_company_access(auth.uid(), company_id) 
  AND role IN ('viewer', 'admin')
);

-- 4. MSD staff can view all memberships
CREATE POLICY "MSD staff can view all memberships"
ON public.memberships FOR SELECT
USING (
  has_role(auth.uid(), 'msd_csm'::app_role) 
  OR has_role(auth.uid(), 'msd_ma'::app_role)
);

-- 5. System admins have full access
CREATE POLICY "System admins can view all memberships"
ON public.memberships FOR SELECT
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "System admins can insert memberships"
ON public.memberships FOR INSERT
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "System admins can update memberships"
ON public.memberships FOR UPDATE
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "System admins can delete memberships"
ON public.memberships FOR DELETE
USING (has_role(auth.uid(), 'system_admin'::app_role));