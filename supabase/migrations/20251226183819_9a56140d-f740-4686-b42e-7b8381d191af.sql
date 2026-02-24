-- ============================================
-- SECURITY FIX: Hide key_hash from regular users
-- ============================================
-- API Key Hashes should not be readable by end users
-- Only edge functions (service role) need access for validation

-- Revoke SELECT on entire table from authenticated role
REVOKE SELECT ON public.api_keys FROM authenticated;

-- Grant SELECT only on safe columns (excluding key_hash)
GRANT SELECT (id, company_id, name, key_prefix, is_active, expires_at, last_used_at, created_at, created_by) 
ON public.api_keys TO authenticated;

-- Ensure INSERT, UPDATE, DELETE still work (RLS policies handle authorization)
GRANT INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;