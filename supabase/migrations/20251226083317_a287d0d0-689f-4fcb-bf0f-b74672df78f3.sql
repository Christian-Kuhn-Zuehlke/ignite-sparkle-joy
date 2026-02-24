-- Add status column to memberships table
-- Default is 'approved' for auto-approval when company is known
CREATE TYPE public.membership_status AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE public.memberships 
ADD COLUMN status public.membership_status NOT NULL DEFAULT 'approved';

-- Add requested_company_name to profiles for tracking unknown company requests
ALTER TABLE public.profiles 
ADD COLUMN requested_company_name TEXT;

-- Update RLS policies for memberships to handle status
-- Users with pending status should not be able to access data
CREATE OR REPLACE FUNCTION public.is_membership_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = _user_id
      AND status = 'approved'
  )
$$;

-- Create index for faster status queries
CREATE INDEX idx_memberships_status ON public.memberships(status);

-- Audit log trigger for membership status changes
CREATE OR REPLACE FUNCTION public.log_membership_status_change()
RETURNS TRIGGER AS $$
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
        WHEN NEW.status = 'approved' THEN 'approve'
        WHEN NEW.status = 'rejected' THEN 'reject'
        ELSE 'update'
      END,
      'membership',
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_membership_status_change
  AFTER UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.log_membership_status_change();