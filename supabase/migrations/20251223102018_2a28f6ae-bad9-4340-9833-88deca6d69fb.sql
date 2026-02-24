-- Enable realtime for orders table
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Enable realtime for inventory table
ALTER TABLE public.inventory REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;

-- Enable realtime for returns table
ALTER TABLE public.returns REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.returns;