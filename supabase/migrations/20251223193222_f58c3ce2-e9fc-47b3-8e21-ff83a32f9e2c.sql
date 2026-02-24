-- Create KPI type enum
CREATE TYPE public.kpi_type AS ENUM (
  'delivery_time_sla',
  'processing_time',
  'dock_to_stock'
);

-- Create KPI unit enum
CREATE TYPE public.kpi_unit AS ENUM (
  'percent',
  'hours',
  'days'
);

-- Create company_kpis table for KPI definitions
CREATE TABLE public.company_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  kpi_type kpi_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC NOT NULL,
  unit kpi_unit NOT NULL DEFAULT 'percent',
  warning_threshold NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, kpi_type)
);

-- Create kpi_measurements table for tracking actual values
CREATE TABLE public.kpi_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kpi_id UUID NOT NULL REFERENCES public.company_kpis(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  measured_value NUMERIC NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_count INTEGER,
  success_count INTEGER,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.company_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_measurements ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_kpis
CREATE POLICY "System admins can manage all company_kpis" 
ON public.company_kpis 
FOR ALL 
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "MSD staff can view all company_kpis" 
ON public.company_kpis 
FOR SELECT 
USING (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role));

CREATE POLICY "Customer admins can manage own company_kpis" 
ON public.company_kpis 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) AND company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can view own company_kpis" 
ON public.company_kpis 
FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));

-- RLS policies for kpi_measurements
CREATE POLICY "System admins can manage all kpi_measurements" 
ON public.kpi_measurements 
FOR ALL 
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "MSD staff can view all kpi_measurements" 
ON public.kpi_measurements 
FOR SELECT 
USING (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role));

CREATE POLICY "Users can view own company kpi_measurements" 
ON public.kpi_measurements 
FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_kpis_updated_at
BEFORE UPDATE ON public.company_kpis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_kpi_measurements_kpi_id ON public.kpi_measurements(kpi_id);
CREATE INDEX idx_kpi_measurements_period ON public.kpi_measurements(period_start, period_end);
CREATE INDEX idx_company_kpis_company_id ON public.company_kpis(company_id);