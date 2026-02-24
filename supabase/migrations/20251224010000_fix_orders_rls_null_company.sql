-- Fix RLS policy for orders to handle NULL company_id gracefully
-- If user has no company_id, they should see no orders (not throw an error)

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view own company orders" ON public.orders;

-- Recreate with NULL handling
CREATE POLICY "Users can view own company orders" 
ON public.orders 
FOR SELECT 
TO authenticated
USING (
  -- Only match if user has a company_id and it matches
  get_user_company_id(auth.uid()) IS NOT NULL 
  AND company_id = get_user_company_id(auth.uid())
);

