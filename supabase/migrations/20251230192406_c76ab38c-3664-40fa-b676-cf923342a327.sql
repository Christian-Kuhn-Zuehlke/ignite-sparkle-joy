-- Allow authenticated users to insert inventory
CREATE POLICY "Authenticated users can insert inventory"
ON public.inventory FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update inventory
CREATE POLICY "Authenticated users can update inventory"
ON public.inventory FOR UPDATE
TO authenticated
USING (true);