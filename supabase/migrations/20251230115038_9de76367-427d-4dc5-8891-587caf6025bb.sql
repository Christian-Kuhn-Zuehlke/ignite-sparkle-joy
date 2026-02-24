-- Fix the log_membership_audit trigger - the (NEW)::text::jsonb cast is causing JSON parsing errors
-- The status column exists directly on the row, no need for JSON parsing

CREATE OR REPLACE FUNCTION public.log_membership_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'status', NEW.status  -- Direct column access, not JSON parsing
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_details := jsonb_build_object(
      'affected_user_id', NEW.user_id,
      'affected_user_email', v_user_email,
      'old_role', OLD.role,
      'new_role', NEW.role,
      'old_status', OLD.status,  -- Direct column access
      'new_status', NEW.status   -- Direct column access
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
$function$;