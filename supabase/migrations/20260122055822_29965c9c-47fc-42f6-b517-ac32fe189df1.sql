-- Add indexes to improve query performance for analytics widgets
-- These indexes help with the most common query patterns

-- Index for order_lines lookups by order_id (for joins)
CREATE INDEX IF NOT EXISTS idx_order_lines_order_id ON public.order_lines(order_id);

-- Index for order_lines lookups by sku
CREATE INDEX IF NOT EXISTS idx_order_lines_sku ON public.order_lines(sku);

-- Index for return_lines lookups by return_id (for joins)
CREATE INDEX IF NOT EXISTS idx_return_lines_return_id ON public.return_lines(return_id);

-- Index for return_lines lookups by sku
CREATE INDEX IF NOT EXISTS idx_return_lines_sku ON public.return_lines(sku);

-- Composite index for orders filtering by company_id and order_date
CREATE INDEX IF NOT EXISTS idx_orders_company_date ON public.orders(company_id, order_date);

-- Composite index for orders filtering by company_id and status
CREATE INDEX IF NOT EXISTS idx_orders_company_status ON public.orders(company_id, status);

-- Composite index for returns filtering by company_id and return_date
CREATE INDEX IF NOT EXISTS idx_returns_company_date ON public.returns(company_id, return_date);

-- Index for orders status filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Index for inventory by company_id
CREATE INDEX IF NOT EXISTS idx_inventory_company_id ON public.inventory(company_id);