-- Drop existing restrictive SELECT policies on orders
DROP POLICY IF EXISTS "MSD staff can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own company orders" ON public.orders;

-- Recreate as PERMISSIVE (default) so ANY matching policy grants access
CREATE POLICY "MSD staff can view all orders" 
ON public.orders 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'msd_csm'::app_role) OR 
  has_role(auth.uid(), 'msd_ma'::app_role) OR 
  has_role(auth.uid(), 'system_admin'::app_role)
);

CREATE POLICY "Users can view own company orders" 
ON public.orders 
FOR SELECT 
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));