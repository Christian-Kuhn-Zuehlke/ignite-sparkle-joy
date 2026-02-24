-- Add source_system column to orders table for tracking origin
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS source_system text DEFAULT 'business_central';

-- Add comment for documentation
COMMENT ON COLUMN public.orders.source_system IS 'Origin system: business_central (master), shopify, woocommerce';

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_orders_source_system ON public.orders(source_system);

-- Add source_system to inventory as well
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS source_system text DEFAULT 'business_central';

COMMENT ON COLUMN public.inventory.source_system IS 'Origin system: business_central (master), shopify, woocommerce';

-- Create index for inventory source
CREATE INDEX IF NOT EXISTS idx_inventory_source_system ON public.inventory(source_system);