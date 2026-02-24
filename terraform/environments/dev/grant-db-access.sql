-- ========================================================================
-- ⚠️  DEPRECATED - Use setup-database.sql instead
-- ========================================================================
-- 
-- This file contains the old Azure AD Managed Identity approach which
-- does NOT work with standard Supabase Docker images.
--
-- Please use setup-database.sql for password-based authentication.
--
-- ========================================================================
-- Setup PostgreSQL Database for Supabase with Managed Identity Access
-- (NOT FUNCTIONAL - Kept for reference only)
-- ========================================================================
-- 
-- Run this script on: pgsql-crossborderx-test-msd-chn
-- Database to create: ignite_dev
-- Managed Identity: id-ignite-dev-ca
-- 
-- Prerequisites:
-- 1. You are connected as an Azure AD admin
-- 2. Azure AD authentication is enabled on the PostgreSQL server
-- 3. You have the Managed Identity Client ID from Terraform output
--
-- Get the Client ID by running:
--   terraform output managed_identity_client_id
-- 
-- ========================================================================

-- Step 1: Create the database
CREATE DATABASE ignite_dev
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Connect to the new database
\c ignite_dev

-- Step 2: Enable Azure AD authentication
SET aad_validate_oids_in_tenant = off;

-- Step 3: Create a role for the Managed Identity
-- Replace <MANAGED_IDENTITY_CLIENT_ID> with the actual client ID from terraform output
-- Example: 12345678-1234-1234-1234-123456789abc
CREATE ROLE "id-ignite-dev-ca" WITH LOGIN PASSWORD '<MANAGED_IDENTITY_CLIENT_ID>' IN ROLE azure_ad_user;

-- Step 4: Grant database connection permission
GRANT CONNECT ON DATABASE ignite_dev TO "id-ignite-dev-ca";
GRANT ALL PRIVILEGES ON DATABASE ignite_dev TO "id-ignite-dev-ca";

-- Step 5: Create Supabase schemas and grant ownership
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION "id-ignite-dev-ca";
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION "id-ignite-dev-ca";
CREATE SCHEMA IF NOT EXISTS realtime AUTHORIZATION "id-ignite-dev-ca";
CREATE SCHEMA IF NOT EXISTS extensions AUTHORIZATION "id-ignite-dev-ca";

-- Grant full access to public schema
GRANT ALL PRIVILEGES ON SCHEMA public TO "id-ignite-dev-ca";

-- Step 6: Grant permissions on all existing objects in schemas
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "id-ignite-dev-ca";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "id-ignite-dev-ca";
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO "id-ignite-dev-ca";

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO "id-ignite-dev-ca";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO "id-ignite-dev-ca";
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA auth TO "id-ignite-dev-ca";

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA storage TO "id-ignite-dev-ca";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA storage TO "id-ignite-dev-ca";
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA storage TO "id-ignite-dev-ca";

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA realtime TO "id-ignite-dev-ca";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA realtime TO "id-ignite-dev-ca";
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA realtime TO "id-ignite-dev-ca";

-- Step 7: Grant permissions for future objects (CRITICAL!)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "id-ignite-dev-ca";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "id-ignite-dev-ca";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "id-ignite-dev-ca";

ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO "id-ignite-dev-ca";
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO "id-ignite-dev-ca";
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON FUNCTIONS TO "id-ignite-dev-ca";

ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO "id-ignite-dev-ca";
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON SEQUENCES TO "id-ignite-dev-ca";
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON FUNCTIONS TO "id-ignite-dev-ca";

ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON TABLES TO "id-ignite-dev-ca";
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON SEQUENCES TO "id-ignite-dev-ca";
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO "id-ignite-dev-ca";

-- Step 8: Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" SCHEMA extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO "id-ignite-dev-ca";
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA extensions TO "id-ignite-dev-ca";

-- Step 9: Verify the role was created successfully
SELECT rolname, rolcanlogin, rolsuper 
FROM pg_roles 
WHERE rolname = 'id-ignite-dev-ca';

-- Expected output:
--      rolname          | rolcanlogin | rolsuper
-- ----------------------+-------------+----------
--  id-ignite-dev-ca     | t           | f

-- ========================================================================
-- Verification Queries
-- ========================================================================

-- Check database was created
SELECT datname FROM pg_database WHERE datname = 'ignite_dev';

-- Check schemas
SELECT nspname, nspowner::regrole 
FROM pg_namespace 
WHERE nspname IN ('public', 'auth', 'storage', 'realtime', 'extensions');

-- Check extensions
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_stat_statements');

-- ========================================================================
-- Connection String for Supabase
-- ========================================================================
-- 
-- Use this connection string in your Terraform environment variable:
-- 
-- postgresql://id-ignite-dev-ca@pgsql-crossborderx-test-msd-chn.private.postgres.database.azure.com:5432/ignite_dev?sslmode=require
--
-- ========================================================================
