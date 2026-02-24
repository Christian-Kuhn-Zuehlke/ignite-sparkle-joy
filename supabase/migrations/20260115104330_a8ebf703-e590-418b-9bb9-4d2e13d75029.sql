-- Create a function to aggregate order data by SKU for ABC analysis
-- This runs in the database and returns pre-aggregated data, avoiding memory issues

CREATE OR REPLACE FUNCTION get_abc_sku_aggregates(
  p_company_id TEXT,
  p_period_start TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  sku TEXT,
  total_revenue NUMERIC,
  order_count BIGINT,
  units_sold BIGINT
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ol.sku,
    COALESCE(SUM(ol.price * ol.quantity), 0) as total_revenue,
    COUNT(DISTINCT o.id) as order_count,
    COALESCE(SUM(ol.quantity), 0) as units_sold
  FROM order_lines ol
  INNER JOIN orders o ON ol.order_id = o.id
  WHERE o.company_id = p_company_id
    AND o.order_date >= p_period_start
  GROUP BY ol.sku
  ORDER BY total_revenue DESC;
$$;