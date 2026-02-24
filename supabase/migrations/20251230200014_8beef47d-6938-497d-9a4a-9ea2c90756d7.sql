-- Fix: Add msd_management and msd_ops to view orders
DROP POLICY IF EXISTS "MSD staff can view all orders" ON public.orders;
CREATE POLICY "MSD staff can view all orders" ON public.orders
FOR SELECT USING (
  has_role(auth.uid(), 'msd_csm'::app_role) OR 
  has_role(auth.uid(), 'msd_ma'::app_role) OR 
  has_role(auth.uid(), 'msd_ops'::app_role) OR 
  has_role(auth.uid(), 'msd_management'::app_role) OR 
  has_role(auth.uid(), 'system_admin'::app_role)
);

-- Fix: Add msd_management and msd_ops to view returns
DROP POLICY IF EXISTS "MSD staff can view all returns" ON public.returns;
CREATE POLICY "MSD staff can view all returns" ON public.returns
FOR SELECT USING (
  has_role(auth.uid(), 'msd_csm'::app_role) OR 
  has_role(auth.uid(), 'msd_ma'::app_role) OR 
  has_role(auth.uid(), 'msd_ops'::app_role) OR 
  has_role(auth.uid(), 'msd_management'::app_role) OR 
  has_role(auth.uid(), 'system_admin'::app_role)
);

-- Fix: Add msd_management and msd_ops to view inventory
DROP POLICY IF EXISTS "MSD staff can view all inventory" ON public.inventory;
CREATE POLICY "MSD staff can view all inventory" ON public.inventory
FOR SELECT USING (
  has_role(auth.uid(), 'msd_csm'::app_role) OR 
  has_role(auth.uid(), 'msd_ma'::app_role) OR 
  has_role(auth.uid(), 'msd_ops'::app_role) OR 
  has_role(auth.uid(), 'msd_management'::app_role) OR 
  has_role(auth.uid(), 'system_admin'::app_role)
);

-- Fix: Add msd_management and msd_ops to view order_lines
DROP POLICY IF EXISTS "MSD staff can view all order lines" ON public.order_lines;
CREATE POLICY "MSD staff can view all order lines" ON public.order_lines
FOR SELECT USING (
  has_role(auth.uid(), 'msd_csm'::app_role) OR 
  has_role(auth.uid(), 'msd_ma'::app_role) OR 
  has_role(auth.uid(), 'msd_ops'::app_role) OR 
  has_role(auth.uid(), 'msd_management'::app_role) OR 
  has_role(auth.uid(), 'system_admin'::app_role)
);

-- Fix: Add msd_management and msd_ops to view order_events
DROP POLICY IF EXISTS "MSD staff can view all order_events" ON public.order_events;
CREATE POLICY "MSD staff can view all order_events" ON public.order_events
FOR SELECT USING (
  has_role(auth.uid(), 'msd_csm'::app_role) OR 
  has_role(auth.uid(), 'msd_ma'::app_role) OR 
  has_role(auth.uid(), 'msd_ops'::app_role) OR 
  has_role(auth.uid(), 'msd_management'::app_role) OR 
  has_role(auth.uid(), 'system_admin'::app_role)
);

-- Fix: Add msd_management and msd_ops to view return_lines
DROP POLICY IF EXISTS "MSD staff can view all return lines" ON public.return_lines;
CREATE POLICY "MSD staff can view all return lines" ON public.return_lines
FOR SELECT USING (
  has_role(auth.uid(), 'msd_csm'::app_role) OR 
  has_role(auth.uid(), 'msd_ma'::app_role) OR 
  has_role(auth.uid(), 'msd_ops'::app_role) OR 
  has_role(auth.uid(), 'msd_management'::app_role) OR 
  has_role(auth.uid(), 'system_admin'::app_role)
);