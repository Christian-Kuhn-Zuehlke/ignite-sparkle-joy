-- Add unique constraint for source_no + company_id to enable upsert
-- First check if it already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'orders_source_no_company_id_key'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_source_no_company_id_key 
        UNIQUE (source_no, company_id);
    END IF;
END $$;

-- Also add unique constraint for inventory sku + company_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'inventory_sku_company_id_key'
    ) THEN
        ALTER TABLE public.inventory 
        ADD CONSTRAINT inventory_sku_company_id_key 
        UNIQUE (sku, company_id);
    END IF;
END $$;