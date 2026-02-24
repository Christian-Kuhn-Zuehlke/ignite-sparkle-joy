-- =====================================================
-- MEMBERSHIPS & CSM ASSIGNMENTS ARCHITECTURE
-- Enables multi-tenant user support and CSM assignments
-- =====================================================

-- Create memberships table for multi-company user support
CREATE TABLE public.memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each user can only have one membership per company
  UNIQUE(user_id, company_id)
);

-- Create csm_assignments table for MSD staff company assignments
CREATE TABLE public.csm_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  csm_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each CSM can only be assigned once per company
  UNIQUE(csm_user_id, company_id)
);

-- Enable RLS
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csm_assignments ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger for memberships
CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get all company IDs a user has access to (via memberships)
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    array_agg(company_id),
    ARRAY[]::TEXT[]
  )
  FROM public.memberships
  WHERE user_id = _user_id
$$;

-- Check if user has membership in a specific company
CREATE OR REPLACE FUNCTION public.has_company_access(_user_id uuid, _company_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- Get user's role for a specific company
CREATE OR REPLACE FUNCTION public.get_user_company_role(_user_id uuid, _company_id text)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.memberships
  WHERE user_id = _user_id
    AND company_id = _company_id
  LIMIT 1
$$;

-- Check if CSM is assigned to a company
CREATE OR REPLACE FUNCTION public.is_csm_assigned(_user_id uuid, _company_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.csm_assignments
    WHERE csm_user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- Get primary company for a user (backward compatibility)
CREATE OR REPLACE FUNCTION public.get_user_primary_company(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.memberships
  WHERE user_id = _user_id
    AND is_primary = true
  LIMIT 1
$$;

-- =====================================================
-- RLS POLICIES - MEMBERSHIPS
-- =====================================================

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships"
ON public.memberships
FOR SELECT
USING (auth.uid() = user_id);

-- Customer admins can view memberships in their companies
CREATE POLICY "Customer admins can view company memberships"
ON public.memberships
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') 
  AND has_company_access(auth.uid(), company_id)
);

-- Customer admins can manage memberships in their companies (viewer/admin only)
CREATE POLICY "Customer admins can insert company memberships"
ON public.memberships
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin')
  AND has_company_access(auth.uid(), company_id)
  AND role IN ('viewer', 'admin')
);

CREATE POLICY "Customer admins can update company memberships"
ON public.memberships
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin')
  AND has_company_access(auth.uid(), company_id)
  AND role IN ('viewer', 'admin')
)
WITH CHECK (role IN ('viewer', 'admin'));

CREATE POLICY "Customer admins can delete company memberships"
ON public.memberships
FOR DELETE
USING (
  has_role(auth.uid(), 'admin')
  AND has_company_access(auth.uid(), company_id)
  AND role IN ('viewer', 'admin')
);

-- MSD staff can view all memberships
CREATE POLICY "MSD staff can view all memberships"
ON public.memberships
FOR SELECT
USING (
  has_role(auth.uid(), 'msd_csm') 
  OR has_role(auth.uid(), 'msd_ma')
);

-- System admins can manage all memberships
CREATE POLICY "System admins can manage all memberships"
ON public.memberships
FOR ALL
USING (has_role(auth.uid(), 'system_admin'));

-- =====================================================
-- RLS POLICIES - CSM ASSIGNMENTS
-- =====================================================

-- CSMs can view their own assignments
CREATE POLICY "CSMs can view own assignments"
ON public.csm_assignments
FOR SELECT
USING (auth.uid() = csm_user_id);

-- MSD staff can view all assignments
CREATE POLICY "MSD staff can view all csm_assignments"
ON public.csm_assignments
FOR SELECT
USING (
  has_role(auth.uid(), 'msd_csm') 
  OR has_role(auth.uid(), 'msd_ma')
);

-- System admins can manage all CSM assignments
CREATE POLICY "System admins can manage all csm_assignments"
ON public.csm_assignments
FOR ALL
USING (has_role(auth.uid(), 'system_admin'));

-- =====================================================
-- MIGRATION: Backfill memberships from profiles
-- =====================================================

-- Create memberships for existing users based on their profile company_id
INSERT INTO public.memberships (user_id, company_id, role, is_primary)
SELECT 
  p.user_id,
  p.company_id,
  COALESCE(ur.role, 'viewer'),
  true
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE p.company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- =====================================================
-- REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.memberships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.csm_assignments;