-- 1. Lösche die alte Policy, die FOR ALL verwendet
DROP POLICY IF EXISTS "System admins can manage inventory" ON public.inventory;

-- 2. Die authenticated Policies existieren bereits, also nur die system_admin Policy neu erstellen
-- mit spezifischen Operationen statt FOR ALL

-- System admins SELECT
CREATE POLICY "System admins can select inventory"
ON public.inventory FOR SELECT
USING (public.has_role(auth.uid(), 'system_admin'::app_role));

-- System admins INSERT
CREATE POLICY "System admins can insert inventory"
ON public.inventory FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role));

-- System admins UPDATE
CREATE POLICY "System admins can update inventory"
ON public.inventory FOR UPDATE
USING (public.has_role(auth.uid(), 'system_admin'::app_role));

-- System admins DELETE
CREATE POLICY "System admins can delete inventory"
ON public.inventory FOR DELETE
USING (public.has_role(auth.uid(), 'system_admin'::app_role));