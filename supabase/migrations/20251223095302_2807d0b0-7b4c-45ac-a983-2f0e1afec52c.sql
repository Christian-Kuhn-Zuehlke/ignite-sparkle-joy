-- Allow system_admins to view all profiles
CREATE POLICY "System admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'system_admin'));

-- Allow system_admins to update all profiles
CREATE POLICY "System admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'system_admin'));

-- Allow system_admins to view all user roles
CREATE POLICY "System admins can view all user roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'system_admin'));

-- Allow system_admins to update all user roles
CREATE POLICY "System admins can update all user roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'system_admin'));

-- Allow system_admins to insert user roles
CREATE POLICY "System admins can insert user roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

-- Allow system_admins to delete user roles
CREATE POLICY "System admins can delete user roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'system_admin'));