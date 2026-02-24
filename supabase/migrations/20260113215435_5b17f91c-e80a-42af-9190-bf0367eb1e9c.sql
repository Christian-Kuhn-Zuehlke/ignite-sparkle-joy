-- Delete all SK orders that have a matching SLK order
DELETE FROM public.orders 
WHERE company_id = 'SK'
AND source_no IN (SELECT source_no FROM public.orders WHERE company_id = 'SLK');