-- Create budgets table for Plan data per company/period
CREATE TABLE public.budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  planned_orders INTEGER NOT NULL DEFAULT 0,
  planned_shipments INTEGER NOT NULL DEFAULT 0,
  planned_items INTEGER NOT NULL DEFAULT 0,
  planned_revenue NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, period_type, period_start)
);

-- Create forecasts table for Forecast data
CREATE TABLE public.forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  forecasted_orders INTEGER NOT NULL DEFAULT 0,
  forecasted_shipments INTEGER NOT NULL DEFAULT 0,
  forecasted_items INTEGER NOT NULL DEFAULT 0,
  forecasted_revenue NUMERIC DEFAULT 0,
  confidence_level NUMERIC CHECK (confidence_level >= 0 AND confidence_level <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, period_type, period_start)
);

-- Create historical_snapshots for year-over-year comparisons
CREATE TABLE public.historical_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_shipments INTEGER NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  sla_fulfillment_percent NUMERIC,
  quality_index NUMERIC,
  avg_uph NUMERIC,
  avg_oph NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, snapshot_date, period_type)
);

-- Create productivity_metrics table for UPH/OPH tracking
CREATE TABLE public.productivity_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  units_per_hour NUMERIC,
  orders_per_hour NUMERIC,
  orders_per_fte NUMERIC,
  pack_throughput NUMERIC,
  backlog_orders INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quality_metrics table
CREATE TABLE public.quality_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  error_rate NUMERIC,
  rework_rate NUMERIC,
  return_rate NUMERIC,
  short_picks INTEGER DEFAULT 0,
  scanner_discipline_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, recorded_date)
);

-- Enable RLS on all new tables
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budgets
CREATE POLICY "System admins can manage all budgets" ON public.budgets FOR ALL USING (has_role(auth.uid(), 'system_admin'));
CREATE POLICY "MSD Management can view all budgets" ON public.budgets FOR SELECT USING (has_role(auth.uid(), 'msd_management'));
CREATE POLICY "MSD staff can view all budgets" ON public.budgets FOR SELECT USING (has_role(auth.uid(), 'msd_csm') OR has_role(auth.uid(), 'msd_ma') OR has_role(auth.uid(), 'msd_ops'));
CREATE POLICY "Users can view own company budgets" ON public.budgets FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for forecasts
CREATE POLICY "System admins can manage all forecasts" ON public.forecasts FOR ALL USING (has_role(auth.uid(), 'system_admin'));
CREATE POLICY "MSD Management can view all forecasts" ON public.forecasts FOR SELECT USING (has_role(auth.uid(), 'msd_management'));
CREATE POLICY "MSD staff can view all forecasts" ON public.forecasts FOR SELECT USING (has_role(auth.uid(), 'msd_csm') OR has_role(auth.uid(), 'msd_ma') OR has_role(auth.uid(), 'msd_ops'));
CREATE POLICY "Users can view own company forecasts" ON public.forecasts FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for historical_snapshots
CREATE POLICY "System admins can manage all historical_snapshots" ON public.historical_snapshots FOR ALL USING (has_role(auth.uid(), 'system_admin'));
CREATE POLICY "MSD Management can view all historical_snapshots" ON public.historical_snapshots FOR SELECT USING (has_role(auth.uid(), 'msd_management'));
CREATE POLICY "MSD staff can view all historical_snapshots" ON public.historical_snapshots FOR SELECT USING (has_role(auth.uid(), 'msd_csm') OR has_role(auth.uid(), 'msd_ma') OR has_role(auth.uid(), 'msd_ops'));
CREATE POLICY "Users can view own company historical_snapshots" ON public.historical_snapshots FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for productivity_metrics
CREATE POLICY "System admins can manage all productivity_metrics" ON public.productivity_metrics FOR ALL USING (has_role(auth.uid(), 'system_admin'));
CREATE POLICY "MSD Management can view all productivity_metrics" ON public.productivity_metrics FOR SELECT USING (has_role(auth.uid(), 'msd_management'));
CREATE POLICY "MSD OPS can view all productivity_metrics" ON public.productivity_metrics FOR SELECT USING (has_role(auth.uid(), 'msd_ops'));
CREATE POLICY "MSD staff can view all productivity_metrics" ON public.productivity_metrics FOR SELECT USING (has_role(auth.uid(), 'msd_csm') OR has_role(auth.uid(), 'msd_ma'));
CREATE POLICY "Users can view own company productivity_metrics" ON public.productivity_metrics FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for quality_metrics
CREATE POLICY "System admins can manage all quality_metrics" ON public.quality_metrics FOR ALL USING (has_role(auth.uid(), 'system_admin'));
CREATE POLICY "MSD Management can view all quality_metrics" ON public.quality_metrics FOR SELECT USING (has_role(auth.uid(), 'msd_management'));
CREATE POLICY "MSD OPS can view all quality_metrics" ON public.quality_metrics FOR SELECT USING (has_role(auth.uid(), 'msd_ops'));
CREATE POLICY "MSD staff can view all quality_metrics" ON public.quality_metrics FOR SELECT USING (has_role(auth.uid(), 'msd_csm') OR has_role(auth.uid(), 'msd_ma'));
CREATE POLICY "Users can view own company quality_metrics" ON public.quality_metrics FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_forecasts_updated_at BEFORE UPDATE ON public.forecasts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();