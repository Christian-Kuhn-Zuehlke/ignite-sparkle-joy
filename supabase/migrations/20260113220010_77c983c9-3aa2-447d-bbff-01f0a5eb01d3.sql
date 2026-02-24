-- Delete remaining SK orders that are duplicates
DELETE FROM public.orders 
WHERE company_id = 'SK';