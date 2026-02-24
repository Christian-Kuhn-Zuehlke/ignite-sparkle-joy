-- CRITICAL SECURITY FIX: Remove the dangerous permissive policy that allows all authenticated users to access all orders
-- This policy was allowing customers to see other customers' orders!

-- Drop the dangerous policy that grants access to ALL authenticated users
DROP POLICY IF EXISTS "Require authentication for orders access" ON public.orders;

-- Ensure RLS is enabled (should already be enabled, but make sure)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Verify that only the correct policies exist:
-- 1. "MSD staff can view all orders" - for MSD staff only (msd_csm, msd_ma, system_admin)
-- 2. "Users can view own company orders" - for customers (only their own company_id)

-- The policies are PERMISSIVE (default), meaning ANY matching policy grants access
-- The "Users can view own company orders" policy should only match when:
--   - get_user_company_id(auth.uid()) IS NOT NULL
--   - AND company_id = get_user_company_id(auth.uid())
--
-- This ensures customers can ONLY see orders from their own company!

