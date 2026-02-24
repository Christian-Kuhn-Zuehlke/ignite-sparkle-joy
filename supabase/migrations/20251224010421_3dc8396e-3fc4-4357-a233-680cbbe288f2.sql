-- Fix profiles table RLS policies
-- Remove the ineffective restrictive policy
DROP POLICY IF EXISTS "Require authentication for profiles access" ON profiles;

-- Drop existing RESTRICTIVE SELECT policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Customer admins can view company profiles" ON profiles;
DROP POLICY IF EXISTS "System admins can view all profiles" ON profiles;

-- Recreate as PERMISSIVE policies (combined with OR - any matching grants access)
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Customer admins can view company profiles" 
ON profiles FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "System admins can view all profiles" 
ON profiles FOR SELECT 
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "MSD staff can view all profiles" 
ON profiles FOR SELECT 
USING (
  has_role(auth.uid(), 'msd_csm'::app_role) 
  OR has_role(auth.uid(), 'msd_ma'::app_role)
);