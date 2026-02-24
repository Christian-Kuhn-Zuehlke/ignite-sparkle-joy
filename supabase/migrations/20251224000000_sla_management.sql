-- SLA Management System Migration
-- Creates tables and functions for customer-specific SLA tracking

-- Create SLA scope enum
CREATE TYPE public.sla_scope AS ENUM ('outbound_orders', 'returns', 'receiving');

-- Create SLA measurement method enum
CREATE TYPE public.sla_measurement_method AS ENUM ('business_hours', '24_7');

-- Create SLA severity enum
CREATE TYPE public.sla_severity AS ENUM ('info', 'warn', 'breach');

-- Create SLA result status enum
CREATE TYPE public.sla_result_status AS ENUM ('met', 'at_risk', 'breached', 'not_applicable', 'excluded');

-- Create order event type enum
CREATE TYPE public.order_event_type AS ENUM (
  'ORDER_RECEIVED',
  'PICK_STARTED',
  'PACK_COMPLETED',
  'READY_TO_SHIP',
  'CARRIER_HANDOVER',
  'SHIPPED',
  'DELIVERED',
  'RETURN_RECEIVED',
  'RETURN_COMPLETED'
);

-- Create SLA Profiles table (1 per company/tenant)
CREATE TABLE public.sla_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'Europe/Zurich',
  work_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5], -- Monday=1 to Friday=5
  work_hours_start TIME NOT NULL DEFAULT '08:00:00',
  work_hours_end TIME NOT NULL DEFAULT '18:00:00',
  cut_off_time TIME DEFAULT '14:00:00', -- Default cut-off for same-day
  blackout_days DATE[], -- Optional: holidays/blackout dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create SLA Rules table (multiple per company)
CREATE TABLE public.sla_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scope sla_scope NOT NULL,
  -- Filter criteria (stored as JSONB for flexibility)
  filters JSONB DEFAULT '{}', -- e.g., {"country": ["CH", "DE"], "carrier": ["DHL"], "order_type": "standard"}
  start_event order_event_type NOT NULL,
  end_event order_event_type NOT NULL,
  target_minutes INTEGER NOT NULL, -- Target time in minutes
  measurement_method sla_measurement_method NOT NULL DEFAULT 'business_hours',
  severity sla_severity NOT NULL DEFAULT 'warn',
  grace_minutes INTEGER DEFAULT 0, -- Grace period in minutes
  at_risk_threshold_percent INTEGER DEFAULT 10, -- Alert when < 10% time remaining
  -- Exclusions
  exclude_statuses TEXT[], -- e.g., ["address_missing", "fraud_hold", "stockout"]
  exclude_flags JSONB DEFAULT '{}', -- e.g., {"update_in_progress": true}
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_target_time CHECK (target_minutes > 0),
  CONSTRAINT valid_at_risk_threshold CHECK (at_risk_threshold_percent >= 0 AND at_risk_threshold_percent <= 100)
);

-- Note: order_events table moved to migration 20251226064412

-- Create SLA Results table (computed SLA compliance per order/rule)
CREATE TABLE public.sla_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE,
  sla_rule_id UUID NOT NULL REFERENCES public.sla_rules(id) ON DELETE CASCADE,
  status sla_result_status NOT NULL,
  elapsed_minutes INTEGER, -- Actual elapsed time in minutes
  target_minutes INTEGER NOT NULL, -- Target from rule
  started_at TIMESTAMPTZ, -- When start event occurred
  ended_at TIMESTAMPTZ, -- When end event occurred (or current time if in progress)
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exclusion_reason TEXT, -- Why excluded if status = 'excluded'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id, sla_rule_id),
  UNIQUE(return_id, sla_rule_id)
);

-- Create SLA Alerts table (for at-risk and breached items)
CREATE TABLE public.sla_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_result_id UUID NOT NULL REFERENCES public.sla_results(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  severity sla_severity NOT NULL,
  message TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_sla_profiles_company_id ON public.sla_profiles(company_id);
CREATE INDEX idx_sla_rules_company_id ON public.sla_rules(company_id);
CREATE INDEX idx_sla_rules_active ON public.sla_rules(company_id, is_active) WHERE is_active = true;
-- Note: order_events indexes moved to migration 20251226064412
CREATE INDEX idx_sla_results_order_id ON public.sla_results(order_id);
CREATE INDEX idx_sla_results_return_id ON public.sla_results(return_id);
CREATE INDEX idx_sla_results_status ON public.sla_results(status, computed_at);
CREATE INDEX idx_sla_results_rule_id ON public.sla_results(sla_rule_id);
CREATE INDEX idx_sla_alerts_company_id ON public.sla_alerts(company_id, is_resolved);
CREATE INDEX idx_sla_alerts_severity ON public.sla_alerts(severity, is_resolved) WHERE is_resolved = false;

-- Enable RLS
ALTER TABLE public.sla_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_rules ENABLE ROW LEVEL SECURITY;
-- Note: order_events RLS moved to migration 20251226064412
ALTER TABLE public.sla_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SLA Profiles
CREATE POLICY "System admins can manage all SLA profiles"
ON public.sla_profiles FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "MSD staff can view all SLA profiles"
ON public.sla_profiles FOR SELECT
USING (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role));

CREATE POLICY "Customer admins can view their own SLA profile"
ON public.sla_profiles FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for SLA Rules
CREATE POLICY "System admins can manage all SLA rules"
ON public.sla_rules FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "MSD staff can view all SLA rules"
ON public.sla_rules FOR SELECT
USING (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role));

CREATE POLICY "Customer admins can view their own SLA rules"
ON public.sla_rules FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Note: Order Events RLS policies moved to migration 20251226064412

-- RLS Policies for SLA Results
CREATE POLICY "System admins can view all SLA results"
ON public.sla_results FOR SELECT
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "MSD staff can view all SLA results"
ON public.sla_results FOR SELECT
USING (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role));

CREATE POLICY "Customer users can view their own SLA results"
ON public.sla_results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = sla_results.order_id
    AND o.company_id = get_user_company_id(auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.returns r
    WHERE r.id = sla_results.return_id
    AND r.company_id = get_user_company_id(auth.uid())
  )
);

-- RLS Policies for SLA Alerts
CREATE POLICY "System admins can view all SLA alerts"
ON public.sla_alerts FOR SELECT
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "MSD staff can view all SLA alerts"
ON public.sla_alerts FOR SELECT
USING (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role));

CREATE POLICY "Customer users can view their own SLA alerts"
ON public.sla_alerts FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Note: Order event generation functions moved to migration 20251226064412

-- Trigger for updated_at
CREATE TRIGGER update_sla_profiles_updated_at
BEFORE UPDATE ON public.sla_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sla_rules_updated_at
BEFORE UPDATE ON public.sla_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sla_results_updated_at
BEFORE UPDATE ON public.sla_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.sla_profiles IS 'Service calendar and working hours configuration per company';
COMMENT ON TABLE public.sla_rules IS 'SLA rules/definitions per company with filters and targets';
-- Note: order_events table comment in migration 20251226064412
COMMENT ON TABLE public.sla_results IS 'Computed SLA compliance results per order/rule';
COMMENT ON TABLE public.sla_alerts IS 'Alerts for at-risk and breached SLA items';

