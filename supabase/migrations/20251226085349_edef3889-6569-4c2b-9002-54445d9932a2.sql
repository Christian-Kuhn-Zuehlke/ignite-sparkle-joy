-- Create a special PENDING company for users awaiting approval
INSERT INTO public.companies (id, name)
VALUES ('PENDING', 'Ausstehende Registrierungen')
ON CONFLICT (id) DO NOTHING;

-- Update handle_new_user to always create a membership (pending or approved)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id TEXT;
  v_company_name TEXT;
  v_requested_company_name TEXT;
  v_membership_status membership_status;
BEGIN
  -- Get values from user metadata
  v_company_id := NEW.raw_user_meta_data ->> 'company_id';
  v_requested_company_name := NEW.raw_user_meta_data ->> 'requested_company_name';
  
  -- Determine status: if company_id exists (user selected known company) -> approved
  -- Otherwise (unknown company name entered) -> pending
  IF v_company_id IS NOT NULL AND v_company_id != '' THEN
    v_membership_status := 'approved';
    -- Get company name from companies table
    SELECT name INTO v_company_name FROM public.companies WHERE id = v_company_id;
  ELSE
    v_membership_status := 'pending';
    v_company_name := v_requested_company_name;
    -- Use PENDING company for pending users
    v_company_id := 'PENDING';
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name, company_id, company_name, requested_company_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    CASE WHEN v_membership_status = 'approved' THEN v_company_id ELSE NULL END,
    v_company_name,
    v_requested_company_name
  );
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  -- Always create membership (pending or approved)
  INSERT INTO public.memberships (user_id, company_id, role, is_primary, status)
  VALUES (
    NEW.id, 
    v_company_id, 
    'viewer', 
    true, 
    v_membership_status
  );
  
  RETURN NEW;
END;
$$;