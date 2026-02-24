-- ============================================
-- SECURITY FIX: Order Notes auf Company beschränken
-- ============================================
-- Aktuell kann JEDER authentifizierte User ALLE Order Notes sehen
-- Fix: Nur Notes der eigenen Company + MSD Staff + System Admins

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view order notes" ON public.order_notes;

-- Create company-scoped SELECT policy
CREATE POLICY "Users can view order notes for their company"
ON public.order_notes FOR SELECT
USING (
  -- User can see notes for orders from their company
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_notes.order_id
    AND o.company_id = get_user_company_id(auth.uid())
  )
  -- MSD staff can see all notes (needed for customer support)
  OR has_role(auth.uid(), 'msd_csm'::app_role)
  OR has_role(auth.uid(), 'msd_ma'::app_role)
  OR has_role(auth.uid(), 'system_admin'::app_role)
);

-- Also fix INSERT policy to scope to company orders
DROP POLICY IF EXISTS "Authenticated users can create notes" ON public.order_notes;

CREATE POLICY "Users can create notes for their company orders"
ON public.order_notes FOR INSERT
WITH CHECK (
  -- Can only add notes to orders from their company
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_notes.order_id
    AND o.company_id = get_user_company_id(auth.uid())
  )
  -- MSD staff can add notes to any order
  OR has_role(auth.uid(), 'msd_csm'::app_role)
  OR has_role(auth.uid(), 'msd_ma'::app_role)
  OR has_role(auth.uid(), 'system_admin'::app_role)
);