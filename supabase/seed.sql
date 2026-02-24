-- =====================================================
-- SEED DATA FOR LOCAL DEVELOPMENT
-- Focus: Authentication & User-related tables for login
-- =====================================================

-- Clean up existing seed data (in reverse dependency order)
DELETE FROM public.memberships WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@example.com'
);
DELETE FROM public.csm_assignments WHERE csm_user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@example.com'
);
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@example.com'
);
DELETE FROM public.profiles WHERE email LIKE '%@example.com';
DELETE FROM auth.users WHERE email LIKE '%@example.com';

-- =====================================================
-- COMPANIES
-- =====================================================
-- Insert test companies (ON CONFLICT to avoid duplicates)
INSERT INTO public.companies (id, name, status)
VALUES 
  ('AV', 'Aviano', 'live'),
  ('NK', 'Namuk', 'live'),
  ('GT', 'GetSA', 'live'),
  ('MSD', 'MS Direct', 'live'),
  ('DEMO', 'Demo Company', 'onboarding')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status;

-- =====================================================
-- TEST USERS
-- Password for all test users: "password123"
-- Supabase hashes passwords using bcrypt
-- =====================================================

-- Helper: Create users directly in auth.users
-- Note: All string columns that GoTrue expects must have non-null values (empty string is fine)

-- System Admin user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token,
  is_sso_user,
  is_anonymous
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'admin@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "System Administrator", "company_id": "MSD", "company_name": "MS Direct"}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  false,
  false
) ON CONFLICT (id) DO NOTHING;

-- MSD CSM user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token,
  is_sso_user,
  is_anonymous
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '00000000-0000-0000-0000-000000000000',
  'csm@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "CSM User", "company_id": "MSD", "company_name": "MS Direct"}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  false,
  false
) ON CONFLICT (id) DO NOTHING;

-- Aviano Admin user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token,
  is_sso_user,
  is_anonymous
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'aviano.admin@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Aviano Admin", "company_id": "AV", "company_name": "Aviano"}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  false,
  false
) ON CONFLICT (id) DO NOTHING;

-- Aviano Viewer user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token,
  is_sso_user,
  is_anonymous
) VALUES (
  '44444444-4444-4444-4444-444444444444',
  '00000000-0000-0000-0000-000000000000',
  'aviano.viewer@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Aviano Viewer", "company_id": "AV", "company_name": "Aviano"}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  false,
  false
) ON CONFLICT (id) DO NOTHING;

-- Namuk Admin user
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token,
  is_sso_user,
  is_anonymous
) VALUES (
  '55555555-5555-5555-5555-555555555555',
  '00000000-0000-0000-0000-000000000000',
  'namuk.admin@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Namuk Admin", "company_id": "NK", "company_name": "Namuk"}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  false,
  false
) ON CONFLICT (id) DO NOTHING;

-- Demo user (for onboarding testing)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token,
  is_sso_user,
  is_anonymous
) VALUES (
  '66666666-6666-6666-6666-666666666666',
  '00000000-0000-0000-0000-000000000000',
  'demo@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Demo User", "company_id": "DEMO", "company_name": "Demo Company"}',
  'authenticated',
  'authenticated',
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  false,
  false
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- PROFILES
-- Note: The handle_new_user trigger creates profiles automatically,
-- but since we're inserting directly into auth.users without
-- triggering the AFTER INSERT trigger, we need to create profiles manually
-- =====================================================

INSERT INTO public.profiles (id, user_id, email, full_name, company_id, company_name)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'admin@example.com', 'System Administrator', 'MSD', 'MS Direct'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'csm@example.com', 'CSM User', 'MSD', 'MS Direct'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 'aviano.admin@example.com', 'Aviano Admin', 'AV', 'Aviano'),
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 'aviano.viewer@example.com', 'Aviano Viewer', 'AV', 'Aviano'),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', 'namuk.admin@example.com', 'Namuk Admin', 'NK', 'Namuk'),
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', 'demo@example.com', 'Demo User', 'DEMO', 'Demo Company')
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  company_id = EXCLUDED.company_id,
  company_name = EXCLUDED.company_name;

-- =====================================================
-- USER ROLES
-- Assign global roles to users
-- =====================================================

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'system_admin'),
  ('22222222-2222-2222-2222-222222222222', 'msd_csm'),
  ('33333333-3333-3333-3333-333333333333', 'admin'),
  ('44444444-4444-4444-4444-444444444444', 'viewer'),
  ('55555555-5555-5555-5555-555555555555', 'admin'),
  ('66666666-6666-6666-6666-666666666666', 'viewer')
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- MEMBERSHIPS
-- Link users to companies with their roles
-- =====================================================

INSERT INTO public.memberships (user_id, company_id, role, is_primary, status)
VALUES
  -- System admin has access to MSD
  ('11111111-1111-1111-1111-111111111111', 'MSD', 'system_admin', true, 'approved'),
  
  -- CSM has access to MSD (primary) and assigned companies
  ('22222222-2222-2222-2222-222222222222', 'MSD', 'msd_csm', true, 'approved'),
  
  -- Aviano admin
  ('33333333-3333-3333-3333-333333333333', 'AV', 'admin', true, 'approved'),
  
  -- Aviano viewer
  ('44444444-4444-4444-4444-444444444444', 'AV', 'viewer', true, 'approved'),
  
  -- Namuk admin
  ('55555555-5555-5555-5555-555555555555', 'NK', 'admin', true, 'approved'),
  
  -- Demo user
  ('66666666-6666-6666-6666-666666666666', 'DEMO', 'viewer', true, 'approved')
ON CONFLICT (user_id, company_id) DO UPDATE SET
  role = EXCLUDED.role,
  is_primary = EXCLUDED.is_primary,
  status = EXCLUDED.status;

-- =====================================================
-- CSM ASSIGNMENTS
-- Assign CSMs to customer companies they manage
-- =====================================================

INSERT INTO public.csm_assignments (csm_user_id, company_id)
VALUES
  -- CSM manages Aviano and Namuk
  ('22222222-2222-2222-2222-222222222222', 'AV'),
  ('22222222-2222-2222-2222-222222222222', 'NK'),
  ('22222222-2222-2222-2222-222222222222', 'DEMO')
ON CONFLICT (csm_user_id, company_id) DO NOTHING;

-- =====================================================
-- AUTH IDENTITIES (required for Supabase auth to work)
-- =====================================================

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email',
  id::text,
  now(),
  now(),
  now()
FROM auth.users
WHERE email LIKE '%@example.com'
ON CONFLICT (provider, provider_id) DO NOTHING;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Test accounts created (password: password123):
--
-- | Email                      | Role         | Company      |
-- |----------------------------|--------------|--------------|
-- | admin@example.com          | system_admin | MS Direct    |
-- | csm@example.com            | msd_csm      | MS Direct    |
-- | aviano.admin@example.com   | admin        | Aviano       |
-- | aviano.viewer@example.com  | viewer       | Aviano       |
-- | namuk.admin@example.com    | admin        | Namuk        |
-- | demo@example.com           | viewer       | Demo Company |
-- =====================================================
