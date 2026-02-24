-- Add email_enabled column to notification_settings
ALTER TABLE public.notification_settings 
ADD COLUMN IF NOT EXISTS email_enabled boolean DEFAULT false;

-- Add email_address column for custom email (optional, defaults to profile email)
ALTER TABLE public.notification_settings
ADD COLUMN IF NOT EXISTS notification_email text;