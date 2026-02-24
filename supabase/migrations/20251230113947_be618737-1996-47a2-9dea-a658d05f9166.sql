-- Fix the handle_new_user trigger to handle JSON parsing errors gracefully
-- The issue is that raw_user_meta_data can sometimes have invalid JSON format

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id TEXT;
  v_company_name TEXT;
  v_requested_company_name TEXT;
  v_full_name TEXT;
  v_membership_status membership_status;
BEGIN
  -- Safely extract values from user metadata with exception handling
  BEGIN
    IF NEW.raw_user_meta_data IS NOT NULL AND NEW.raw_user_meta_data::text != '' AND NEW.raw_user_meta_data::text != 'null' THEN
      v_company_id := NEW.raw_user_meta_data ->> 'company_id';
      v_requested_company_name := NEW.raw_user_meta_data ->> 'requested_company_name';
      v_full_name := NEW.raw_user_meta_data ->> 'full_name';
    ELSE
      v_company_id := NULL;
      v_requested_company_name := NULL;
      v_full_name := NULL;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If JSON parsing fails, use default values
    v_company_id := NULL;
    v_requested_company_name := NULL;
    v_full_name := NULL;
  END;
  
  -- Determine status: if company_id exists (user selected known company) -> approved
  -- Otherwise (unknown company name entered) -> pending
  IF v_company_id IS NOT NULL AND v_company_id != '' THEN
    v_membership_status := 'approved';
    -- Get company name from companies table
    SELECT name INTO v_company_name FROM public.companies WHERE id = v_company_id;
  ELSE
    v_membership_status := 'pending';
    v_company_name := COALESCE(v_requested_company_name, 'Unbekannt');
    -- Use PENDING company for pending users
    v_company_id := 'PENDING';
  END IF;
  
  -- Create profile with safe NULL handling
  INSERT INTO public.profiles (user_id, email, full_name, company_id, company_name, requested_company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(v_full_name, ''),
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
EXCEPTION WHEN OTHERS THEN
  -- Log the error but still allow user creation with minimal data
  RAISE WARNING 'Error in handle_new_user: %, creating minimal profile', SQLERRM;
  
  -- Create minimal profile
  INSERT INTO public.profiles (user_id, email, full_name, company_id, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    '',
    NULL,
    'Unbekannt'
  );
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  -- Create pending membership
  INSERT INTO public.memberships (user_id, company_id, role, is_primary, status)
  VALUES (
    NEW.id, 
    'PENDING', 
    'viewer', 
    true, 
    'pending'
  );
  
  RETURN NEW;
END;
$function$;