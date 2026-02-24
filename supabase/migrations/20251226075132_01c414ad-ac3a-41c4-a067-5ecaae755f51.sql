-- Create enum for audit action types
CREATE TYPE public.audit_action AS ENUM (
  'login',
  'logout',
  'view',
  'create',
  'update',
  'delete',
  'export',
  'import',
  'approve',
  'reject',
  'status_change'
);

-- Create enum for resource types
CREATE TYPE public.audit_resource AS ENUM (
  'order',
  'inventory',
  'return',
  'user',
  'membership',
  'company',
  'settings',
  'api_key',
  'webhook',
  'integration',
  'kpi'
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  action audit_action NOT NULL,
  resource_type audit_resource NOT NULL,
  resource_id TEXT,
  company_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_compound ON public.audit_logs(company_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- System admins can view all audit logs
CREATE POLICY "System admins can view all audit_logs" 
ON public.audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- MSD staff can view all audit logs
CREATE POLICY "MSD staff can view all audit_logs" 
ON public.audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'msd_csm'::app_role) OR has_role(auth.uid(), 'msd_ma'::app_role));

-- Customer admins can view their company's audit logs
CREATE POLICY "Customer admins can view company audit_logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND company_id = get_user_company_id(auth.uid())
);

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit_logs" 
ON public.audit_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own audit logs
CREATE POLICY "Authenticated users can insert audit_logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action audit_action,
  p_resource_type audit_resource,
  p_resource_id TEXT DEFAULT NULL,
  p_company_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_log_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Get user details from profiles
  SELECT email, full_name INTO v_user_email, v_user_name
  FROM public.profiles
  WHERE user_id = v_user_id
  LIMIT 1;
  
  INSERT INTO public.audit_logs (
    user_id,
    user_email,
    user_name,
    action,
    resource_type,
    resource_id,
    company_id,
    details
  ) VALUES (
    v_user_id,
    v_user_email,
    v_user_name,
    p_action,
    p_resource_type,
    p_resource_id,
    COALESCE(p_company_id, get_user_company_id(v_user_id)),
    p_details
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Trigger function for order status changes (enhance existing)
CREATE OR REPLACE FUNCTION public.log_order_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (
      action,
      resource_type,
      resource_id,
      company_id,
      details
    ) VALUES (
      'status_change',
      'order',
      NEW.id::TEXT,
      NEW.company_id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'order_source_no', NEW.source_no
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for order audit
DROP TRIGGER IF EXISTS order_audit_trigger ON public.orders;
CREATE TRIGGER order_audit_trigger
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.log_order_audit();

-- Trigger function for membership changes
CREATE OR REPLACE FUNCTION public.log_membership_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action audit_action;
  v_details JSONB;
  v_user_email TEXT;
BEGIN
  -- Get affected user's email
  SELECT email INTO v_user_email FROM public.profiles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) LIMIT 1;
  
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_details := jsonb_build_object(
      'affected_user_id', NEW.user_id,
      'affected_user_email', v_user_email,
      'role', NEW.role,
      'status', COALESCE((NEW)::text::jsonb->>'status', 'approved')
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_details := jsonb_build_object(
      'affected_user_id', NEW.user_id,
      'affected_user_email', v_user_email,
      'old_role', OLD.role,
      'new_role', NEW.role,
      'old_status', COALESCE((OLD)::text::jsonb->>'status', 'approved'),
      'new_status', COALESCE((NEW)::text::jsonb->>'status', 'approved')
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_details := jsonb_build_object(
      'affected_user_id', OLD.user_id,
      'affected_user_email', v_user_email,
      'role', OLD.role
    );
  END IF;
  
  INSERT INTO public.audit_logs (
    action,
    resource_type,
    resource_id,
    company_id,
    details
  ) VALUES (
    v_action,
    'membership',
    COALESCE(NEW.id, OLD.id)::TEXT,
    COALESCE(NEW.company_id, OLD.company_id),
    v_details
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for membership audit
DROP TRIGGER IF EXISTS membership_audit_trigger ON public.memberships;
CREATE TRIGGER membership_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.log_membership_audit();

-- Trigger function for user role changes
CREATE OR REPLACE FUNCTION public.log_user_role_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action audit_action;
  v_details JSONB;
  v_user_email TEXT;
  v_company_id TEXT;
BEGIN
  -- Get affected user's details
  SELECT email, company_id INTO v_user_email, v_company_id 
  FROM public.profiles 
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id) 
  LIMIT 1;
  
  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
    v_action := 'update';
    v_details := jsonb_build_object(
      'affected_user_id', NEW.user_id,
      'affected_user_email', v_user_email,
      'old_role', OLD.role,
      'new_role', NEW.role
    );
    
    INSERT INTO public.audit_logs (
      action,
      resource_type,
      resource_id,
      company_id,
      details
    ) VALUES (
      v_action,
      'user',
      NEW.user_id::TEXT,
      v_company_id,
      v_details
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for user role audit
DROP TRIGGER IF EXISTS user_role_audit_trigger ON public.user_roles;
CREATE TRIGGER user_role_audit_trigger
AFTER UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.log_user_role_audit();