-- Add cost_price column to order_lines for margin calculation
ALTER TABLE public.order_lines 
ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.order_lines.cost_price IS 'Cost price per unit for margin calculation. Margin = (price - cost_price) * quantity';