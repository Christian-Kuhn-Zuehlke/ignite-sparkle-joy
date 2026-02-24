-- Setup Cron Job for MS OrderState Sync
-- This job runs every 15 minutes to sync order status from MS Direct API
-- 
-- IMPORTANT: Replace YOUR_PROJECT_ID and YOUR_SERVICE_ROLE_KEY before running!
-- 
-- To get your values:
-- 1. Project ID: Supabase Dashboard → Settings → API → Project URL (extract project ID)
-- 2. Service Role Key: Supabase Dashboard → Settings → API → service_role key

-- Check if pg_cron is enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  END IF;
END $$;

-- Check if pg_net is enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  END IF;
END $$;

-- Remove existing job if it exists
SELECT cron.unschedule('ms-order-state-sync') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ms-order-state-sync'
);

-- Create the cron job
-- NOTE: Replace YOUR_PROJECT_ID and YOUR_SERVICE_ROLE_KEY with actual values!
-- 
-- Example:
-- url := 'https://abcdefghijklmnop.supabase.co/functions/v1/ms-order-state-sync',
-- 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
SELECT cron.schedule(
  'ms-order-state-sync',                    -- Job name
  '*/15 * * * *',                          -- Cron expression: every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/ms-order-state-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verify the job was created
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job 
WHERE jobname = 'ms-order-state-sync';

-- Instructions:
-- 1. Replace YOUR_PROJECT_ID with your Supabase project ID
-- 2. Replace YOUR_SERVICE_ROLE_KEY with your service_role key
-- 3. Run this migration in Supabase Dashboard → SQL Editor
-- 4. Check cron.job table to verify the job is active

