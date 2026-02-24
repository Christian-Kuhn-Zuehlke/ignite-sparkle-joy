-- Create integration_type enum
CREATE TYPE public.integration_type AS ENUM ('business_central', 'woocommerce', 'shopify', 'dhl', 'post_ch', 'custom');

-- Create webhook_event enum
CREATE TYPE public.webhook_event AS ENUM ('order_created', 'order_updated', 'order_shipped', 'return_created', 'return_updated', 'inventory_low', 'inventory_updated');

-- Create api_keys table for customer API key management
CREATE TABLE public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  last_used_at timestamp with time zone,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create feature_toggles table
CREATE TABLE public.feature_toggles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  feature_name text NOT NULL,
  description text,
  is_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, feature_key)
);

-- Create webhooks table
CREATE TABLE public.webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  secret text,
  events webhook_event[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamp with time zone,
  last_status_code integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create integrations table
CREATE TABLE public.integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id text NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type integration_type NOT NULL,
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  last_sync_at timestamp with time zone,
  last_sync_status text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, type)
);

-- Enable RLS on all tables
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- API Keys RLS Policies
CREATE POLICY "System admins can manage all api_keys"
ON public.api_keys FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "MSD staff can view all api_keys"
ON public.api_keys FOR SELECT
USING (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role));

CREATE POLICY "Customer admins can view own company api_keys"
ON public.api_keys FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- Feature Toggles RLS Policies
CREATE POLICY "System admins can manage all feature_toggles"
ON public.feature_toggles FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "MSD staff can view all feature_toggles"
ON public.feature_toggles FOR SELECT
USING (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role));

CREATE POLICY "Users can view own company feature_toggles"
ON public.feature_toggles FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Webhooks RLS Policies
CREATE POLICY "System admins can manage all webhooks"
ON public.webhooks FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "MSD staff can view all webhooks"
ON public.webhooks FOR SELECT
USING (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role));

CREATE POLICY "Customer admins can manage own company webhooks"
ON public.webhooks FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND company_id = get_user_company_id(auth.uid()));

-- Integrations RLS Policies
CREATE POLICY "System admins can manage all integrations"
ON public.integrations FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY "MSD staff can view all integrations"
ON public.integrations FOR SELECT
USING (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role));

CREATE POLICY "Users can view own company integrations"
ON public.integrations FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Create update timestamp trigger for new tables
CREATE TRIGGER update_feature_toggles_updated_at
BEFORE UPDATE ON public.feature_toggles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhooks_updated_at
BEFORE UPDATE ON public.webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
BEFORE UPDATE ON public.integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_api_keys_company_id ON public.api_keys(company_id);
CREATE INDEX idx_feature_toggles_company_id ON public.feature_toggles(company_id);
CREATE INDEX idx_webhooks_company_id ON public.webhooks(company_id);
CREATE INDEX idx_integrations_company_id ON public.integrations(company_id);