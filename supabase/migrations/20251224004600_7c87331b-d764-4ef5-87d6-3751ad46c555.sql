-- CRITICAL FIX: Remove overly permissive RLS policy
-- The "Require authentication for orders access" policy allows ALL authenticated users
-- to see ALL orders, which breaks company-based isolation!

DROP POLICY IF EXISTS "Require authentication for orders access" ON public.orders;

-- The correct policies remain:
-- 1. "MSD staff can view all orders" - only for MSD staff
-- 2. "Users can view own company orders" - only for own company