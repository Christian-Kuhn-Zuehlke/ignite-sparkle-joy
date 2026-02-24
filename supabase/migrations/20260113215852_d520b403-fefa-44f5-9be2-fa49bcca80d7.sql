-- Step 1: Delete SK orders where SLK version already exists
DELETE FROM public.orders 
WHERE company_id = 'SK'
AND source_no IN (SELECT source_no FROM public.orders WHERE company_id = 'SLK');