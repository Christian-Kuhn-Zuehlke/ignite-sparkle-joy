-- Complete rewrite of handle_new_user to avoid JSON casting issues
-- The problem is that raw_user_meta_data is JSONB but we're trying to cast it improperly

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
  v_meta JSONB;
BEGIN
  -- Get metadata safely as JSONB
  v_meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  
  -- Extract values directly from JSONB without casting
  v_company_id := v_meta->>'company_id';
  v_requested_company_name := v_meta->>'requested_company_name';
  v_full_name := v_meta->>'full_name';
  
  -- Handle NULL/empty strings
  IF v_company_id = '' THEN
    v_company_id := NULL;
  END IF;
  
  -- Determine status: if company_id exists (user selected known company) -> approved
  -- Otherwise (unknown company name entered) -> pending
  IF v_company_id IS NOT NULL THEN
    v_membership_status := 'approved';
    -- Get company name from companies table
    SELECT name INTO v_company_name FROM public.companies WHERE id = v_company_id;
    IF v_company_name IS NULL THEN
      -- Company not found, treat as pending
      v_membership_status := 'pending';
      v_company_name := COALESCE(v_requested_company_name, 'Unbekannt');
      v_company_id := 'PENDING';
    END IF;
  ELSE
    v_membership_status := 'pending';
    v_company_name := COALESCE(v_requested_company_name, 'Unbekannt');
    v_company_id := 'PENDING';
  END IF;
  
  -- Create profile
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
  -- Log error but don't fail silently
  RAISE LOG 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
  
  -- Re-raise the exception so it can be properly handled
  RAISE;
END;
$function$;