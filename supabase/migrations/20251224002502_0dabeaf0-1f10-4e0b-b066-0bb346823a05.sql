-- Add base permissive policy requiring authentication for orders table
-- This ensures unauthenticated users cannot access any order data

CREATE POLICY "Require authentication for orders access"
ON public.orders
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);