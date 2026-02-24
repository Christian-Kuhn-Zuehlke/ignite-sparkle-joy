
-- Packaging Intelligence Tables

-- Packaging types/options available
CREATE TABLE public.packaging_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  length_cm NUMERIC(10,2),
  width_cm NUMERIC(10,2),
  height_cm NUMERIC(10,2),
  volume_cm3 NUMERIC(10,2) GENERATED ALWAYS AS (length_cm * width_cm * height_cm) STORED,
  weight_g NUMERIC(10,2),
  cost_cents INTEGER DEFAULT 0,
  is_eco_friendly BOOLEAN DEFAULT false,
  co2_grams NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Packaging records per order
CREATE TABLE public.packaging_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  packaging_type_id UUID REFERENCES public.packaging_types(id),
  packaging_code TEXT,
  actual_weight_g NUMERIC(10,2),
  declared_weight_g NUMERIC(10,2),
  fill_rate_percent NUMERIC(5,2),
  is_overpackaged BOOLEAN DEFAULT false,
  is_underpackaged BOOLEAN DEFAULT false,
  carrier_code TEXT,
  carrier_service TEXT,
  shipping_cost_cents INTEGER,
  shipping_zone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shipping anomalies detection
CREATE TABLE public.shipping_anomalies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('expensive_carrier', 'wrong_service', 'weight_mismatch', 'dimension_mismatch', 'routing_issue', 'overpackaged', 'underpackaged')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  expected_value TEXT,
  actual_value TEXT,
  potential_savings_cents INTEGER,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Packaging recommendations (AI-generated)
CREATE TABLE public.packaging_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sku TEXT,
  current_packaging_code TEXT,
  recommended_packaging_code TEXT,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('downsize', 'upsize', 'eco_switch', 'carrier_change', 'consolidation')),
  reason TEXT,
  estimated_savings_cents INTEGER,
  estimated_co2_savings_g NUMERIC(10,2),
  confidence_score NUMERIC(3,2),
  sample_size INTEGER,
  is_implemented BOOLEAN DEFAULT false,
  implemented_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Packaging metrics (aggregated daily)
CREATE TABLE public.packaging_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_shipments INTEGER DEFAULT 0,
  avg_fill_rate_percent NUMERIC(5,2),
  overpackaged_count INTEGER DEFAULT 0,
  underpackaged_count INTEGER DEFAULT 0,
  total_packaging_cost_cents INTEGER DEFAULT 0,
  total_shipping_cost_cents INTEGER DEFAULT 0,
  total_co2_grams NUMERIC(10,2) DEFAULT 0,
  anomaly_count INTEGER DEFAULT 0,
  potential_savings_cents INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, metric_date)
);

-- Indexes
CREATE INDEX idx_packaging_records_order ON public.packaging_records(order_id);
CREATE INDEX idx_packaging_records_company_date ON public.packaging_records(company_id, created_at DESC);
CREATE INDEX idx_shipping_anomalies_company ON public.shipping_anomalies(company_id, created_at DESC);
CREATE INDEX idx_shipping_anomalies_unresolved ON public.shipping_anomalies(company_id) WHERE is_resolved = false;
CREATE INDEX idx_packaging_recommendations_company ON public.packaging_recommendations(company_id, created_at DESC);
CREATE INDEX idx_packaging_metrics_company_date ON public.packaging_metrics(company_id, metric_date DESC);

-- RLS Policies
ALTER TABLE public.packaging_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packaging_metrics ENABLE ROW LEVEL SECURITY;

-- Packaging Types policies
CREATE POLICY "Users can view packaging types for their companies"
  ON public.packaging_types FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())));

CREATE POLICY "Admins can manage packaging types"
  ON public.packaging_types FOR ALL
  USING (company_id = ANY(get_user_company_ids(auth.uid())) 
    AND has_any_role(auth.uid(), ARRAY['admin', 'system_admin', 'msd_ops']::app_role[]));

-- Packaging Records policies
CREATE POLICY "Users can view packaging records for their companies"
  ON public.packaging_records FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())));

CREATE POLICY "System can insert packaging records"
  ON public.packaging_records FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids(auth.uid())));

-- Shipping Anomalies policies
CREATE POLICY "Users can view shipping anomalies for their companies"
  ON public.shipping_anomalies FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update shipping anomalies for their companies"
  ON public.shipping_anomalies FOR UPDATE
  USING (company_id = ANY(get_user_company_ids(auth.uid())));

CREATE POLICY "System can insert shipping anomalies"
  ON public.shipping_anomalies FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids(auth.uid())));

-- Packaging Recommendations policies
CREATE POLICY "Users can view packaging recommendations for their companies"
  ON public.packaging_recommendations FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())));

CREATE POLICY "Admins can manage packaging recommendations"
  ON public.packaging_recommendations FOR ALL
  USING (company_id = ANY(get_user_company_ids(auth.uid())) 
    AND has_any_role(auth.uid(), ARRAY['admin', 'system_admin', 'msd_ops']::app_role[]));

-- Packaging Metrics policies
CREATE POLICY "Users can view packaging metrics for their companies"
  ON public.packaging_metrics FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())));

CREATE POLICY "System can manage packaging metrics"
  ON public.packaging_metrics FOR ALL
  USING (company_id = ANY(get_user_company_ids(auth.uid())));
