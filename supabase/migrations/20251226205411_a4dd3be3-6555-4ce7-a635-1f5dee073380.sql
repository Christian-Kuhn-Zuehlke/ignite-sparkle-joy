-- Add indexes for faster search on common fields

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_source_no_trgm ON public.orders USING gin (source_no gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_ship_to_name_trgm ON public.orders USING gin (ship_to_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_company_name_trgm ON public.orders USING gin (company_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_ship_to_city ON public.orders (ship_to_city);

-- Inventory table indexes
CREATE INDEX IF NOT EXISTS idx_inventory_sku_trgm ON public.inventory USING gin (sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inventory_name_trgm ON public.inventory USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inventory_company_id ON public.inventory (company_id);

-- Returns table indexes
CREATE INDEX IF NOT EXISTS idx_returns_reason_trgm ON public.returns USING gin (reason gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_returns_status ON public.returns (status);
CREATE INDEX IF NOT EXISTS idx_returns_company_id ON public.returns (company_id);