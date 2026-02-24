-- 1. Compound-Indizes für häufige Filter-Kombinationen
CREATE INDEX IF NOT EXISTS idx_orders_company_status_date 
ON public.orders(company_id, status, order_date DESC);

CREATE INDEX IF NOT EXISTS idx_orders_company_date 
ON public.orders(company_id, order_date DESC);

CREATE INDEX IF NOT EXISTS idx_orders_company_created 
ON public.orders(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_events_order_status 
ON public.order_events(order_id, event_type, occurred_at DESC);

-- 2. Materialized View für SLA-Status (15-30s → 0.5s)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.order_sla_status AS
SELECT 
  o.id AS order_id,
  o.company_id,
  o.created_at,
  o.status,
  CASE 
    WHEN o.status IN ('shipped', 'delivered') THEN 
      EXTRACT(EPOCH FROM (
        COALESCE(
          (SELECT MIN(occurred_at) FROM order_events WHERE order_id = o.id AND new_status = 'shipped'),
          o.posted_shipment_date::timestamp with time zone,
          o.updated_at
        ) - o.created_at
      )) / 3600
    ELSE 
      EXTRACT(EPOCH FROM (now() - o.created_at)) / 3600
  END AS processing_hours,
  CASE 
    WHEN o.status IN ('shipped', 'delivered') THEN 'met'
    WHEN EXTRACT(EPOCH FROM (now() - o.created_at)) / 3600 > 48 THEN 'breached'
    WHEN EXTRACT(EPOCH FROM (now() - o.created_at)) / 3600 > 24 THEN 'at-risk'
    ELSE 'met'
  END AS sla_status
FROM public.orders o
WHERE o.created_at >= now() - interval '30 days';

-- Index auf Materialized View für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_order_sla_status_company_sla 
ON public.order_sla_status(company_id, sla_status);

CREATE INDEX IF NOT EXISTS idx_order_sla_status_order_id 
ON public.order_sla_status(order_id);

-- 3. Function zum Refresh der Materialized View
CREATE OR REPLACE FUNCTION public.refresh_order_sla_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.order_sla_status;
END;
$$;

-- 4. Index für Inventory-Abfragen
CREATE INDEX IF NOT EXISTS idx_inventory_company_sku 
ON public.inventory(company_id, sku);

CREATE INDEX IF NOT EXISTS idx_inventory_company_available 
ON public.inventory(company_id, available);

-- 5. Index für Returns-Abfragen
CREATE INDEX IF NOT EXISTS idx_returns_company_date 
ON public.returns(company_id, return_date DESC);

CREATE INDEX IF NOT EXISTS idx_returns_company_status 
ON public.returns(company_id, status);