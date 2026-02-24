-- Fix the membership status change trigger to use proper type casting
CREATE OR REPLACE FUNCTION log_membership_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (
      action,
      resource_type,
      resource_id,
      company_id,
      details
    ) VALUES (
      CASE 
        WHEN NEW.status = 'approved' THEN 'approve'::audit_action
        WHEN NEW.status = 'rejected' THEN 'reject'::audit_action
        ELSE 'update'::audit_action
      END,
      'membership'::audit_resource,
      NEW.id::TEXT,
      NEW.company_id,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;