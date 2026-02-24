-- Schnelle Zählfunktion für Orders
CREATE OR REPLACE FUNCTION public.count_orders_in_period(
  p_from_date DATE,
  p_to_date DATE,
  p_company_id TEXT DEFAULT NULL,
  p_status TEXT[] DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM public.orders
  WHERE order_date >= p_from_date
    AND order_date <= p_to_date
    AND (p_company_id IS NULL OR company_id = p_company_id)
    AND (p_status IS NULL OR status::text = ANY(p_status))
$$;

-- Setze Statement-Timeout für diese Funktion erhöhen
ALTER FUNCTION public.count_orders_in_period SET statement_timeout = '30s';