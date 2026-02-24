-- Add new MSD roles to the app_role enum (separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'msd_ops';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'msd_management';