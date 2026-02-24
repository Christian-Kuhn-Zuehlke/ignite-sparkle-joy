-- ABC Analysis: Artikel-Klassifizierung mit Fulfillment-spezifischen Metriken

-- Tabelle für ABC-Klassifizierung pro SKU
CREATE TABLE public.abc_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT,
  
  -- ABC Klassifizierung
  abc_class TEXT NOT NULL CHECK (abc_class IN ('A', 'B', 'C')),
  previous_abc_class TEXT CHECK (previous_abc_class IN ('A', 'B', 'C')),
  class_changed_at TIMESTAMP WITH TIME ZONE,
  
  -- Umsatz-Metriken
  total_revenue NUMERIC(12,2) DEFAULT 0,
  revenue_share_percent NUMERIC(5,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  units_sold INTEGER DEFAULT 0,
  
  -- Fulfillment-spezifische Metriken
  avg_days_in_warehouse INTEGER DEFAULT 0,
  current_stock INTEGER DEFAULT 0,
  days_of_stock INTEGER,
  storage_cost_monthly NUMERIC(10,2) DEFAULT 0,
  pick_pack_cost_per_unit NUMERIC(8,2) DEFAULT 0,
  
  -- Retouren-Analyse
  return_rate_percent NUMERIC(5,2) DEFAULT 0,
  return_cost_total NUMERIC(10,2) DEFAULT 0,
  
  -- Risiko-Indikatoren
  stockout_risk_score NUMERIC(3,2) DEFAULT 0,
  overstock_risk_score NUMERIC(3,2) DEFAULT 0,
  trending_direction TEXT CHECK (trending_direction IN ('up', 'stable', 'down')),
  
  -- Zeitstempel
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, sku, analysis_date)
);

-- Tabelle für AI-generierte Empfehlungen
CREATE TABLE public.abc_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  classification_id UUID REFERENCES public.abc_classifications(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
    'clearance_sale', 'bundle_candidate', 'return_to_supplier', 'reorder_soon',
    'reduce_stock', 'increase_stock', 'monitor_closely', 'discontinue', 'promote', 'optimize_storage'
  )),
  
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT,
  confidence_score NUMERIC(3,2) DEFAULT 0,
  estimated_impact_value NUMERIC(12,2),
  estimated_impact_type TEXT,
  key_metrics JSONB,
  
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'dismissed')),
  actioned_at TIMESTAMP WITH TIME ZONE,
  actioned_by UUID,
  action_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabelle für ABC-Analyse-Läufe
CREATE TABLE public.abc_analysis_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL,
  analysis_period_days INTEGER NOT NULL DEFAULT 90,
  analysis_type TEXT NOT NULL DEFAULT 'revenue' CHECK (analysis_type IN ('revenue', 'units', 'orders', 'combined')),
  
  total_skus_analyzed INTEGER DEFAULT 0,
  a_class_count INTEGER DEFAULT 0,
  b_class_count INTEGER DEFAULT 0,
  c_class_count INTEGER DEFAULT 0,
  
  a_threshold_percent NUMERIC(5,2) DEFAULT 80,
  b_threshold_percent NUMERIC(5,2) DEFAULT 95,
  
  total_revenue_analyzed NUMERIC(14,2),
  a_class_revenue_share NUMERIC(5,2),
  b_class_revenue_share NUMERIC(5,2),
  c_class_revenue_share NUMERIC(5,2),
  
  ai_summary TEXT,
  key_insights JSONB,
  
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  error_message TEXT,
  
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.abc_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abc_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abc_analysis_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies für abc_classifications
CREATE POLICY "Users can view ABC classifications for their company"
ON public.abc_classifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.company_id = abc_classifications.company_id
    AND m.status = 'approved'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('msd_csm', 'msd_ma', 'system_admin')
    AND m.status = 'approved'
  )
);

-- RLS Policies für abc_recommendations
CREATE POLICY "Users can view ABC recommendations for their company"
ON public.abc_recommendations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.company_id = abc_recommendations.company_id
    AND m.status = 'approved'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('msd_csm', 'msd_ma', 'system_admin')
    AND m.status = 'approved'
  )
);

CREATE POLICY "Users can update ABC recommendations for their company"
ON public.abc_recommendations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.company_id = abc_recommendations.company_id
    AND m.status = 'approved'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('msd_csm', 'msd_ma', 'system_admin')
    AND m.status = 'approved'
  )
);

-- RLS Policies für abc_analysis_runs
CREATE POLICY "Users can view ABC analysis runs for their company"
ON public.abc_analysis_runs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.company_id = abc_analysis_runs.company_id
    AND m.status = 'approved'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('msd_csm', 'msd_ma', 'system_admin')
    AND m.status = 'approved'
  )
);

-- Indexes für Performance
CREATE INDEX idx_abc_classifications_company ON public.abc_classifications(company_id);
CREATE INDEX idx_abc_classifications_class ON public.abc_classifications(abc_class);
CREATE INDEX idx_abc_classifications_date ON public.abc_classifications(analysis_date DESC);
CREATE INDEX idx_abc_recommendations_company ON public.abc_recommendations(company_id);
CREATE INDEX idx_abc_recommendations_status ON public.abc_recommendations(status);
CREATE INDEX idx_abc_recommendations_priority ON public.abc_recommendations(priority);
CREATE INDEX idx_abc_analysis_runs_company ON public.abc_analysis_runs(company_id);

-- Trigger für updated_at
CREATE TRIGGER update_abc_classifications_updated_at
  BEFORE UPDATE ON public.abc_classifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_abc_recommendations_updated_at
  BEFORE UPDATE ON public.abc_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();