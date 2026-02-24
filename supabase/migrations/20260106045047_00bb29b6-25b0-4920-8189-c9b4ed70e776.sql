-- Quality & Error Intelligence Tables

-- Error types enum
CREATE TYPE public.quality_error_type AS ENUM (
  'wrong_item',           -- Falscher Artikel
  'missing_item',         -- Fehlmenge
  'damaged',              -- Beschädigt
  'wrong_quantity',       -- Falsche Menge
  'packaging_error',      -- Verpackungsfehler
  'labeling_error',       -- Etikettenfehler
  'shipping_error',       -- Versandfehler
  'other'                 -- Sonstige
);

-- Quality errors table
CREATE TABLE public.quality_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id),
  order_id UUID REFERENCES public.orders(id),
  return_id UUID REFERENCES public.returns(id),
  error_type public.quality_error_type NOT NULL,
  sku TEXT,
  product_name TEXT,
  zone TEXT,
  shift TEXT,
  worker_id TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  root_cause TEXT,
  root_cause_category TEXT,
  corrective_action TEXT,
  cost_impact NUMERIC(10,2),
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  detected_by TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quality scores (aggregated daily)
CREATE TABLE public.quality_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id),
  score_date DATE NOT NULL,
  overall_score NUMERIC(5,2),
  accuracy_score NUMERIC(5,2),
  damage_score NUMERIC(5,2),
  timeliness_score NUMERIC(5,2),
  packaging_score NUMERIC(5,2),
  total_orders INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  error_rate NUMERIC(5,4),
  by_error_type JSONB DEFAULT '{}',
  by_zone JSONB DEFAULT '{}',
  by_shift JSONB DEFAULT '{}',
  top_error_skus JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Root cause categories
CREATE TABLE public.root_cause_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id),
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES public.root_cause_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_quality_errors_company ON public.quality_errors(company_id);
CREATE INDEX idx_quality_errors_detected_at ON public.quality_errors(detected_at DESC);
CREATE INDEX idx_quality_errors_type ON public.quality_errors(error_type);
CREATE INDEX idx_quality_errors_sku ON public.quality_errors(sku);
CREATE INDEX idx_quality_errors_order ON public.quality_errors(order_id);
CREATE INDEX idx_quality_scores_company_date ON public.quality_scores(company_id, score_date DESC);

-- Enable RLS
ALTER TABLE public.quality_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.root_cause_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quality_errors (using ANY for array comparison)
CREATE POLICY "Users can view quality errors for their companies"
ON public.quality_errors FOR SELECT
USING (
  company_id = ANY(get_user_company_ids(auth.uid()))
  OR has_any_role(auth.uid(), ARRAY['system_admin', 'msd_csm', 'msd_ma']::app_role[])
);

CREATE POLICY "Admins can insert quality errors"
ON public.quality_errors FOR INSERT
WITH CHECK (
  company_id = ANY(get_user_company_ids(auth.uid()))
  OR has_any_role(auth.uid(), ARRAY['system_admin', 'msd_csm', 'msd_ma', 'admin']::app_role[])
);

CREATE POLICY "Admins can update quality errors"
ON public.quality_errors FOR UPDATE
USING (
  company_id = ANY(get_user_company_ids(auth.uid()))
  OR has_any_role(auth.uid(), ARRAY['system_admin', 'msd_csm', 'msd_ma', 'admin']::app_role[])
);

-- RLS Policies for quality_scores
CREATE POLICY "Users can view quality scores for their companies"
ON public.quality_scores FOR SELECT
USING (
  company_id = ANY(get_user_company_ids(auth.uid()))
  OR has_any_role(auth.uid(), ARRAY['system_admin', 'msd_csm', 'msd_ma']::app_role[])
);

CREATE POLICY "System can insert quality scores"
ON public.quality_scores FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['system_admin', 'msd_csm', 'msd_ma']::app_role[])
);

-- RLS for root_cause_categories
CREATE POLICY "Users can view root cause categories"
ON public.root_cause_categories FOR SELECT
USING (
  company_id = ANY(get_user_company_ids(auth.uid()))
  OR company_id = 'SYSTEM'
  OR has_any_role(auth.uid(), ARRAY['system_admin', 'msd_csm', 'msd_ma']::app_role[])
);

CREATE POLICY "Admins can manage root cause categories"
ON public.root_cause_categories FOR ALL
USING (
  has_any_role(auth.uid(), ARRAY['system_admin', 'msd_csm', 'msd_ma']::app_role[])
);

-- Trigger for updated_at
CREATE TRIGGER update_quality_errors_updated_at
  BEFORE UPDATE ON public.quality_errors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();