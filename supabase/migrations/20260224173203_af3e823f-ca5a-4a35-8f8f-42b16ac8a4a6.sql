
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('viewer', 'editor', 'admin', 'msd_ops', 'system_admin', 'csm');
CREATE TYPE public.order_status AS ENUM ('received', 'putaway', 'picking', 'packing', 'ready_to_ship', 'shipped', 'delivered', 'cancelled', 'exception', 'on_hold', 'returned');
CREATE TYPE public.return_status AS ENUM ('announced', 'received', 'inspected', 'approved', 'rejected', 'restocked', 'disposed', 'completed');
CREATE TYPE public.audit_action AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'export', 'import', 'role_change', 'settings_change', 'bulk_action');
CREATE TYPE public.po_status AS ENUM ('draft', 'submitted', 'confirmed', 'in_transit', 'partially_received', 'received', 'cancelled');

-- COMPANIES
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  accent_color TEXT DEFAULT '#f59e0b',
  default_language TEXT DEFAULT 'de',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_select" ON public.companies;
CREATE POLICY "companies_select" ON public.companies FOR SELECT USING (true);
DROP POLICY IF EXISTS "companies_update" ON public.companies;
CREATE POLICY "companies_update" ON public.companies FOR UPDATE USING (true);

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  company_id UUID REFERENCES public.companies(id),
  is_approved BOOLEAN DEFAULT false,
  requested_company_name TEXT,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deletion_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- USER_ROLES
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT USING (true);
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'system_admin'))
);

-- MEMBERSHIPS
CREATE TABLE public.memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  role public.app_role NOT NULL DEFAULT 'viewer',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "memberships_select" ON public.memberships;
CREATE POLICY "memberships_select" ON public.memberships FOR SELECT USING (true);
DROP POLICY IF EXISTS "memberships_admin" ON public.memberships;
CREATE POLICY "memberships_admin" ON public.memberships FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'system_admin'))
);

-- ORDERS
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  source_no TEXT,
  external_id TEXT,
  customer_name TEXT,
  ship_to_name TEXT,
  ship_to_address TEXT,
  ship_to_city TEXT,
  ship_to_country TEXT,
  ship_to_post_code TEXT,
  status public.order_status NOT NULL DEFAULT 'received',
  status_date TIMESTAMPTZ,
  order_date TIMESTAMPTZ,
  order_amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  carrier TEXT,
  tracking_no TEXT,
  posted_shipment_date TIMESTAMPTZ,
  requested_delivery_date TIMESTAMPTZ,
  priority TEXT DEFAULT 'normal',
  tags TEXT[],
  notes TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select" ON public.orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_insert" ON public.orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_update" ON public.orders FOR UPDATE USING (true);
DROP POLICY IF EXISTS "orders_delete" ON public.orders;
CREATE POLICY "orders_delete" ON public.orders FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'system_admin'))
);

-- ORDER_LINES
CREATE TABLE public.order_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(12,2) DEFAULT 0,
  total_price NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_lines_select" ON public.order_lines;
CREATE POLICY "order_lines_select" ON public.order_lines FOR SELECT USING (true);
DROP POLICY IF EXISTS "order_lines_insert" ON public.order_lines;
CREATE POLICY "order_lines_insert" ON public.order_lines FOR INSERT WITH CHECK (true);

-- ORDER_EVENTS
CREATE TABLE public.order_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_events_select" ON public.order_events;
CREATE POLICY "order_events_select" ON public.order_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "order_events_insert" ON public.order_events;
CREATE POLICY "order_events_insert" ON public.order_events FOR INSERT WITH CHECK (true);

-- INVENTORY
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  sku TEXT NOT NULL,
  name TEXT,
  description TEXT,
  on_hand INTEGER DEFAULT 0,
  reserved INTEGER DEFAULT 0,
  available INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  location TEXT,
  category TEXT,
  unit_cost NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_select" ON public.inventory;
CREATE POLICY "inventory_select" ON public.inventory FOR SELECT USING (true);
DROP POLICY IF EXISTS "inventory_insert" ON public.inventory;
CREATE POLICY "inventory_insert" ON public.inventory FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "inventory_update" ON public.inventory;
CREATE POLICY "inventory_update" ON public.inventory FOR UPDATE USING (true);

-- RETURNS
CREATE TABLE public.returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  order_id UUID REFERENCES public.orders(id),
  source_no TEXT,
  customer_name TEXT,
  status public.return_status NOT NULL DEFAULT 'announced',
  reason TEXT,
  return_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "returns_select" ON public.returns;
CREATE POLICY "returns_select" ON public.returns FOR SELECT USING (true);
DROP POLICY IF EXISTS "returns_insert" ON public.returns;
CREATE POLICY "returns_insert" ON public.returns FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "returns_update" ON public.returns;
CREATE POLICY "returns_update" ON public.returns FOR UPDATE USING (true);

-- RETURN_LINES
CREATE TABLE public.return_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT,
  quantity INTEGER DEFAULT 1,
  reason TEXT,
  condition TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.return_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "return_lines_select" ON public.return_lines;
CREATE POLICY "return_lines_select" ON public.return_lines FOR SELECT USING (true);
DROP POLICY IF EXISTS "return_lines_insert" ON public.return_lines;
CREATE POLICY "return_lines_insert" ON public.return_lines FOR INSERT WITH CHECK (true);

-- AUDIT_LOGS
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action public.audit_action NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- SLA_RULES
CREATE TABLE public.sla_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL,
  description TEXT,
  metric TEXT NOT NULL,
  threshold_value NUMERIC(12,2),
  threshold_unit TEXT DEFAULT 'hours',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sla_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sla_rules_select" ON public.sla_rules;
CREATE POLICY "sla_rules_select" ON public.sla_rules FOR SELECT USING (true);
DROP POLICY IF EXISTS "sla_rules_manage" ON public.sla_rules;
CREATE POLICY "sla_rules_manage" ON public.sla_rules FOR ALL USING (true);

-- SLA_RESULTS
CREATE TABLE public.sla_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES public.sla_rules(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  total_count INTEGER DEFAULT 0,
  compliant_count INTEGER DEFAULT 0,
  compliance_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sla_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sla_results_select" ON public.sla_results;
CREATE POLICY "sla_results_select" ON public.sla_results FOR SELECT USING (true);
DROP POLICY IF EXISTS "sla_results_insert" ON public.sla_results;
CREATE POLICY "sla_results_insert" ON public.sla_results FOR INSERT WITH CHECK (true);

-- COMPANY_KPIS
CREATE TABLE public.company_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  kpi_type TEXT NOT NULL,
  target_value NUMERIC(12,2),
  current_value NUMERIC(12,2),
  unit TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.company_kpis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_kpis_select" ON public.company_kpis;
CREATE POLICY "company_kpis_select" ON public.company_kpis FOR SELECT USING (true);
DROP POLICY IF EXISTS "company_kpis_manage" ON public.company_kpis;
CREATE POLICY "company_kpis_manage" ON public.company_kpis FOR ALL USING (true);

-- CSM_ASSIGNMENTS
CREATE TABLE public.csm_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.csm_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "csm_assignments_select" ON public.csm_assignments;
CREATE POLICY "csm_assignments_select" ON public.csm_assignments FOR SELECT USING (true);

-- FEATURE_TOGGLES
CREATE TABLE public.feature_toggles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feature_toggles_select" ON public.feature_toggles;
CREATE POLICY "feature_toggles_select" ON public.feature_toggles FOR SELECT USING (true);
DROP POLICY IF EXISTS "feature_toggles_manage" ON public.feature_toggles;
CREATE POLICY "feature_toggles_manage" ON public.feature_toggles FOR ALL USING (true);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- PURCHASE_ORDERS (inbound)
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  po_number TEXT,
  supplier_name TEXT,
  status public.po_status NOT NULL DEFAULT 'draft',
  expected_date TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "po_select" ON public.purchase_orders;
CREATE POLICY "po_select" ON public.purchase_orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "po_manage" ON public.purchase_orders;
CREATE POLICY "po_manage" ON public.purchase_orders FOR ALL USING (true);

-- PO_LINES
CREATE TABLE public.po_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT,
  quantity_ordered INTEGER DEFAULT 0,
  quantity_received INTEGER DEFAULT 0,
  unit_cost NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.po_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "po_lines_select" ON public.po_lines;
CREATE POLICY "po_lines_select" ON public.po_lines FOR SELECT USING (true);
DROP POLICY IF EXISTS "po_lines_manage" ON public.po_lines;
CREATE POLICY "po_lines_manage" ON public.po_lines FOR ALL USING (true);

-- QUALITY_ERRORS
CREATE TABLE public.quality_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  order_id UUID REFERENCES public.orders(id),
  error_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  sku TEXT,
  description TEXT,
  zone TEXT,
  shift TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quality_errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quality_errors_select" ON public.quality_errors;
CREATE POLICY "quality_errors_select" ON public.quality_errors FOR SELECT USING (true);
DROP POLICY IF EXISTS "quality_errors_manage" ON public.quality_errors;
CREATE POLICY "quality_errors_manage" ON public.quality_errors FOR ALL USING (true);

-- ABC_CLASSIFICATIONS
CREATE TABLE public.abc_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  sku TEXT NOT NULL,
  classification TEXT NOT NULL DEFAULT 'C',
  revenue NUMERIC(12,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.abc_classifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "abc_select" ON public.abc_classifications;
CREATE POLICY "abc_select" ON public.abc_classifications FOR SELECT USING (true);
DROP POLICY IF EXISTS "abc_manage" ON public.abc_classifications;
CREATE POLICY "abc_manage" ON public.abc_classifications FOR ALL USING (true);

-- CLARIFICATION_CASES
CREATE TABLE public.clarification_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  order_id UUID REFERENCES public.orders(id),
  case_type TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clarification_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clarification_select" ON public.clarification_cases;
CREATE POLICY "clarification_select" ON public.clarification_cases FOR SELECT USING (true);
DROP POLICY IF EXISTS "clarification_manage" ON public.clarification_cases;
CREATE POLICY "clarification_manage" ON public.clarification_cases FOR ALL USING (true);

-- ORDER_NOTES
CREATE TABLE public.order_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_notes_select" ON public.order_notes;
CREATE POLICY "order_notes_select" ON public.order_notes FOR SELECT USING (true);
DROP POLICY IF EXISTS "order_notes_insert" ON public.order_notes;
CREATE POLICY "order_notes_insert" ON public.order_notes FOR INSERT WITH CHECK (true);

-- EMAIL_REPORT_SETTINGS
CREATE TABLE public.email_report_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  report_type TEXT NOT NULL,
  frequency TEXT DEFAULT 'weekly',
  is_enabled BOOLEAN DEFAULT true,
  recipients TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_report_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_report_own" ON public.email_report_settings;
CREATE POLICY "email_report_own" ON public.email_report_settings FOR ALL USING (auth.uid() = user_id);

-- WEBHOOK_CONFIGS
CREATE TABLE public.webhook_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  url TEXT NOT NULL,
  events TEXT[],
  is_active BOOLEAN DEFAULT true,
  secret TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "webhook_select" ON public.webhook_configs;
CREATE POLICY "webhook_select" ON public.webhook_configs FOR SELECT USING (true);
DROP POLICY IF EXISTS "webhook_manage" ON public.webhook_configs;
CREATE POLICY "webhook_manage" ON public.webhook_configs FOR ALL USING (true);

-- API_KEYS
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT,
  permissions TEXT[],
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_keys_select" ON public.api_keys;
CREATE POLICY "api_keys_select" ON public.api_keys FOR SELECT USING (true);
DROP POLICY IF EXISTS "api_keys_manage" ON public.api_keys;
CREATE POLICY "api_keys_manage" ON public.api_keys FOR ALL USING (true);

-- INTEGRATION_CONFIGS
CREATE TABLE public.integration_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  integration_type TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "integration_select" ON public.integration_configs;
CREATE POLICY "integration_select" ON public.integration_configs FOR SELECT USING (true);
DROP POLICY IF EXISTS "integration_manage" ON public.integration_configs;
CREATE POLICY "integration_manage" ON public.integration_configs FOR ALL USING (true);

-- HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role = p_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM public.profiles WHERE user_id = p_user_id;
  RETURN v_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_companies_fuzzy(search_term TEXT)
RETURNS SETOF public.companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.companies
  WHERE name ILIKE '%' || search_term || '%'
  ORDER BY name
  LIMIT 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action public.audit_action,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_user_account(p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET is_deleted = true, deleted_at = now(), deletion_reason = p_reason
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_orders_in_period(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.orders WHERE order_date >= p_start AND order_date <= p_end;
  RETURN v_count;
END;
$$;

-- AUTH TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, requested_company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'requested_company_name'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- UPDATE TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON public.returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INDEXES
CREATE INDEX idx_orders_company ON public.orders(company_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_date ON public.orders(order_date);
CREATE INDEX idx_inventory_company ON public.inventory(company_id);
CREATE INDEX idx_inventory_sku ON public.inventory(sku);
CREATE INDEX idx_returns_company ON public.returns(company_id);
CREATE INDEX idx_returns_order ON public.returns(order_id);
CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_company ON public.memberships(company_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_order_lines_order ON public.order_lines(order_id);
CREATE INDEX idx_return_lines_return ON public.return_lines(return_id);
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
