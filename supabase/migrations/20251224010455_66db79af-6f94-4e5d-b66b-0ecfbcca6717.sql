-- Fix api_keys table RLS policies
-- Drop existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Customer admins can view own company api_keys" ON api_keys;
DROP POLICY IF EXISTS "MSD staff can view all api_keys" ON api_keys;
DROP POLICY IF EXISTS "System admins can manage all api_keys" ON api_keys;

-- Recreate as PERMISSIVE policies (only authenticated users with correct roles)
CREATE POLICY "Customer admins can view own company api_keys" 
ON api_keys FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "MSD staff can view all api_keys" 
ON api_keys FOR SELECT 
USING (
  has_role(auth.uid(), 'msd_csm'::app_role) 
  OR has_role(auth.uid(), 'msd_ma'::app_role)
);

CREATE POLICY "System admins can view all api_keys" 
ON api_keys FOR SELECT 
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "System admins can insert api_keys" 
ON api_keys FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "System admins can update api_keys" 
ON api_keys FOR UPDATE 
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "System admins can delete api_keys" 
ON api_keys FOR DELETE 
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "Customer admins can manage own company api_keys" 
ON api_keys FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);