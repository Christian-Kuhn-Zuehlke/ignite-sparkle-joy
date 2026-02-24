-- ========================================================================
-- Setup PostgreSQL Database for Supabase with Password Authentication
-- ========================================================================
-- 
-- Run this script on: pgsql-crossborderx-test-msd-chn
-- Database to create: ignite_dev
-- User to create: supabase_app
-- 
-- Prerequisites:
-- 1. You are connected as an Azure AD admin or postgres superuser
-- 2. You have chosen a secure password for the supabase_app user
--
-- NOTE: Standard Supabase Docker images do NOT support Azure AD 
--       Managed Identity authentication. Password auth is required.
-- 
-- ========================================================================

-- Step 1: Create the database (if it doesn't exist)
CREATE DATABASE ignite_dev
    WITH 
    OWNER = CURRENT_USER
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Connect to the new database
\c ignite_dev

-- Step 2: Create a user with password for Supabase
-- IMPORTANT: Replace 'YourSecurePassword123!' with a strong password
CREATE USER supabase_app WITH PASSWORD '6U5o35IzC3no0dkEvdhstU1C';

-- Step 3: Grant database connection permission
GRANT CONNECT ON DATABASE ignite_dev TO supabase_app;
GRANT ALL PRIVILEGES ON DATABASE ignite_dev TO supabase_app;

-- Step 4: Create Supabase schemas and grant ownership
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_app;
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_app;
CREATE SCHEMA IF NOT EXISTS realtime AUTHORIZATION supabase_app;
CREATE SCHEMA IF NOT EXISTS extensions AUTHORIZATION supabase_app;

-- Grant full access to public schema
GRANT ALL PRIVILEGES ON SCHEMA public TO supabase_app;

-- Step 5: Grant permissions on all existing objects in schemas
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO supabase_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO supabase_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO supabase_app;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO supabase_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO supabase_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA auth TO supabase_app;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA storage TO supabase_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA storage TO supabase_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA storage TO supabase_app;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA realtime TO supabase_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA realtime TO supabase_app;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA realtime TO supabase_app;

-- Step 6: Grant permissions for future objects (CRITICAL!)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO supabase_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO supabase_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO supabase_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO supabase_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO supabase_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON FUNCTIONS TO supabase_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO supabase_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON SEQUENCES TO supabase_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON FUNCTIONS TO supabase_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON TABLES TO supabase_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON SEQUENCES TO supabase_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO supabase_app;

-- Step 7: Enable required PostgreSQL extensions
-- Open your PostgreSQL Flexible Server in Azure Portal
-- Go to Server parameters
-- Find azure.extensions
-- Add:
-- pgcrypto
-- uuid-ossp

-- CRITICAL: pgcrypto is REQUIRED for Supabase (provides gen_random_uuid())
-- The check query showed only pg_stat_statements is installed.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 8: Grant EXECUTE permissions on extension functions
-- These are critical for Supabase to function properly
GRANT USAGE ON SCHEMA public TO supabase_app;
GRANT USAGE ON SCHEMA extensions TO supabase_app;

-- Grant execute on all functions in public schema (where extensions typically install)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO supabase_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO supabase_app;

-- Explicitly grant execute on critical pgcrypto functions
DO $$
BEGIN
    -- Try to grant on functions in public schema
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.gen_random_uuid() TO supabase_app';
EXCEPTION WHEN undefined_function THEN
    NULL; -- Function not in public schema, might be in extensions
END $$;

DO $$
BEGIN
    -- Try to grant on functions in extensions schema
    EXECUTE 'GRANT EXECUTE ON FUNCTION extensions.gen_random_uuid() TO supabase_app';
EXCEPTION WHEN undefined_function THEN
    NULL; -- Function not in extensions schema
END $$;

-- Grant for future functions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO supabase_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions GRANT EXECUTE ON FUNCTIONS TO supabase_app;

-- Verify extensions are now installed:
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_stat_statements');

-- Step 9: Verify the user was created successfully
SELECT usename, usecreatedb, usesuper 
FROM pg_user 
WHERE usename = 'supabase_app';

-- Step 10: Test critical functions that Supabase needs
-- This should return a UUID without errors
SELECT gen_random_uuid() AS test_uuid;
SELECT uuid_generate_v4() AS test_uuid_v4;

-- Step 11: Display connection string format
-- Use this connection string in your Terraform configuration:
-- postgresql://supabase_app:6U5o35IzC3no0dkEvdhstU1C@pgsql-crossborderx-test-msd-chn.private.postgres.database.azure.com:5432/ignite_dev?sslmode=require
