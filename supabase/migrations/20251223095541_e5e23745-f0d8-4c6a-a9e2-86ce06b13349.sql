-- Function to get current user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Allow customer admins to view profiles in their company
CREATE POLICY "Customer admins can view company profiles"
ON public.profiles FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') 
  AND company_id = public.get_user_company_id(auth.uid())
);

-- Allow customer admins to update profiles in their company
CREATE POLICY "Customer admins can update company profiles"
ON public.profiles FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') 
  AND company_id = public.get_user_company_id(auth.uid())
);

-- Allow customer admins to view user roles in their company
CREATE POLICY "Customer admins can view company user roles"
ON public.user_roles FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = user_roles.user_id 
    AND p.company_id = public.get_user_company_id(auth.uid())
  )
);

-- Allow customer admins to update user roles in their company (only viewer/admin)
CREATE POLICY "Customer admins can update company user roles"
ON public.user_roles FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = user_roles.user_id 
    AND p.company_id = public.get_user_company_id(auth.uid())
  )
  AND role IN ('viewer', 'admin')
)
WITH CHECK (
  role IN ('viewer', 'admin')
);