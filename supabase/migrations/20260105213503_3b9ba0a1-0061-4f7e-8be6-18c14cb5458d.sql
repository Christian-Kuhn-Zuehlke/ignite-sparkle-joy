-- Optimierte Indizes für Dashboard-Queries (order_date + status + company_id)
CREATE INDEX IF NOT EXISTS idx_orders_date_status_company 
ON public.orders(order_date, status, company_id);

CREATE INDEX IF NOT EXISTS idx_orders_date_company 
ON public.orders(order_date DESC, company_id);

CREATE INDEX IF NOT EXISTS idx_returns_date_status_company 
ON public.returns(return_date, status, company_id);