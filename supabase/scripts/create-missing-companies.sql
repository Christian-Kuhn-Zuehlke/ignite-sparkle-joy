-- Create missing companies for productStock import
-- Run this in Supabase SQL Editor

INSERT INTO public.companies (id, name, status)
VALUES
  ('AVI', 'Aviano', 'live'),
  ('GT', 'GetSA', 'live'),
  ('NAM', 'Namuk', 'live'),
  ('GF', 'Golfyr', 'live')
ON CONFLICT (id) DO NOTHING;

-- Verify companies exist
SELECT id, name, status FROM public.companies WHERE id IN ('AVI', 'GT', 'NAM', 'GF') ORDER BY id;

-- Note: Golfyr wird in den Dateien als "30" oder "E1" bezeichnet, aber in der DB als "GF" gespeichert

