-- =====================================================
-- MODUL: Klärfälle-Center (Cases/Exceptions)
-- =====================================================

-- Tabelle für Klärfälle/Problemfälle
CREATE TABLE IF NOT EXISTS public.clarification_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  case_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  title TEXT NOT NULL,
  description TEXT,
  ai_explanation TEXT,
  ai_confidence_score NUMERIC(3,2),
  recommended_action TEXT,
  related_sku TEXT,
  related_order_id UUID,
  related_po_id UUID,
  related_return_id UUID,
  expected_value NUMERIC,
  actual_value NUMERIC,
  discrepancy_value NUMERIC,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clarification_cases_company ON public.clarification_cases(company_id);
CREATE INDEX IF NOT EXISTS idx_clarification_cases_status ON public.clarification_cases(status);
CREATE INDEX IF NOT EXISTS idx_clarification_cases_severity ON public.clarification_cases(severity);
CREATE INDEX IF NOT EXISTS idx_clarification_cases_type ON public.clarification_cases(case_type);

ALTER TABLE public.clarification_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cases for their company"
ON public.clarification_cases FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.company_id = clarification_cases.company_id
    AND m.status = 'approved'
  )
);

CREATE POLICY "Users can update cases for their company"
ON public.clarification_cases FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.company_id = clarification_cases.company_id
    AND m.status = 'approved'
  )
);

-- =====================================================
-- MODUL: Forecast & Replenishment
-- =====================================================

CREATE TABLE IF NOT EXISTS public.demand_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT,
  forecast_type TEXT NOT NULL,
  forecast_date DATE NOT NULL,
  forecasted_quantity INTEGER,
  forecasted_value NUMERIC,
  confidence_score NUMERIC(3,2),
  lower_bound INTEGER,
  upper_bound INTEGER,
  factors JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demand_forecasts_company ON public.demand_forecasts(company_id);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_sku ON public.demand_forecasts(sku);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_date ON public.demand_forecasts(forecast_date);

ALTER TABLE public.demand_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view forecasts for their company"
ON public.demand_forecasts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.company_id = demand_forecasts.company_id
    AND m.status = 'approved'
  )
);

CREATE TABLE IF NOT EXISTS public.replenishment_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT,
  current_stock INTEGER NOT NULL,
  avg_daily_demand NUMERIC(10,2),
  days_of_stock_remaining INTEGER,
  stockout_date DATE,
  stockout_probability NUMERIC(3,2),
  suggested_order_quantity INTEGER NOT NULL,
  order_by_date DATE NOT NULL,
  reasoning TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  is_launch_product BOOLEAN DEFAULT false,
  launch_date DATE,
  factors JSONB DEFAULT '{}',
  actioned_at TIMESTAMPTZ,
  actioned_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_company ON public.replenishment_suggestions(company_id);
CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_priority ON public.replenishment_suggestions(priority);
CREATE INDEX IF NOT EXISTS idx_replenishment_suggestions_status ON public.replenishment_suggestions(status);

ALTER TABLE public.replenishment_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suggestions for their company"
ON public.replenishment_suggestions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.company_id = replenishment_suggestions.company_id
    AND m.status = 'approved'
  )
);

CREATE POLICY "Users can update suggestions for their company"
ON public.replenishment_suggestions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.company_id = replenishment_suggestions.company_id
    AND m.status = 'approved'
  )
);

CREATE TABLE IF NOT EXISTS public.stockout_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT,
  abc_class TEXT,
  current_stock INTEGER NOT NULL,
  avg_daily_demand NUMERIC(10,2),
  days_until_stockout INTEGER,
  stockout_probability NUMERIC(3,2),
  estimated_revenue_at_risk NUMERIC(12,2),
  alert_severity TEXT NOT NULL DEFAULT 'warning',
  status TEXT NOT NULL DEFAULT 'active',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stockout_alerts_company ON public.stockout_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_stockout_alerts_severity ON public.stockout_alerts(alert_severity);
CREATE INDEX IF NOT EXISTS idx_stockout_alerts_status ON public.stockout_alerts(status);

ALTER TABLE public.stockout_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts for their company"
ON public.stockout_alerts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.company_id = stockout_alerts.company_id
    AND m.status = 'approved'
  )
);

CREATE POLICY "Users can update alerts for their company"
ON public.stockout_alerts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.company_id = stockout_alerts.company_id
    AND m.status = 'approved'
  )
);