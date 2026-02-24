-- Create Namuk company if it doesn't exist
INSERT INTO public.companies (id, name, status)
VALUES ('NAM', 'Namuk', 'live')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    status = EXCLUDED.status;

