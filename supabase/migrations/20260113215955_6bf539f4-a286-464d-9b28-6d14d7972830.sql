-- More aggressive approach: Just delete all SK orders that conflict, then update
-- Use NOT EXISTS instead for the update to handle race conditions

-- First: Update only SK orders where NO SLK version exists
UPDATE public.orders o1
SET company_id = 'SLK',
    company_name = 'Stadtlandkind GmbH'
WHERE o1.company_id = 'SK'
AND NOT EXISTS (
    SELECT 1 FROM public.orders o2 
    WHERE o2.company_id = 'SLK' 
    AND o2.source_no = o1.source_no
);