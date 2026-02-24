-- Simplify the handle_new_user trigger - accept any company name as text
-- No complex JSON parsing, just simple text extraction

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_company_name TEXT;
  v_full_name TEXT;
BEGIN
  -- Simple extraction - treat everything as pending with company name as text
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_company_name := COALESCE(NEW.raw_user_meta_data->>'requested_company_name', 'Unbekannt');
  
  -- Create profile - all new users are pending
  INSERT INTO public.profiles (user_id, email, full_name, company_id, company_name, requested_company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    v_full_name,
    NULL,  -- No company_id yet - admin will assign
    v_company_name,
    v_company_name
  );
  
  -- Assign default viewer role
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