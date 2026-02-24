-- Add indexes for better inventory performance on sorting/filtering

-- Index for reserved column (default sort field - most active items)
CREATE INDEX IF NOT EXISTS idx_inventory_company_reserved 
ON public.inventory (company_id, reserved DESC);

-- Index for on_hand column (sorting by stock level)
CREATE INDEX IF NOT EXISTS idx_inventory_company_on_hand 
ON public.inventory (company_id, on_hand DESC);

-- Index for updated_at (useful for recent items)
CREATE INDEX IF NOT EXISTS idx_inventory_company_updated 
ON public.inventory (company_id, updated_at DESC);

-- Composite index for low stock filtering (threshold + available)
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock 
ON public.inventory (company_id, low_stock_threshold, available) 
WHERE low_stock_threshold IS NOT NULL;

-- GIN index for text search on sku and name
CREATE INDEX IF NOT EXISTS idx_inventory_search 
ON public.inventory USING gin (to_tsvector('simple', sku || ' ' || name));