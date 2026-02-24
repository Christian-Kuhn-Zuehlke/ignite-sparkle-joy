-- Add base permissive policy requiring authentication for profiles table
-- This ensures unauthenticated users cannot access any profile data including emails

CREATE POLICY "Require authentication for profiles access"
ON public.profiles
FOR ALL
TO public
USING (auth.uid() IS NOT NULL);