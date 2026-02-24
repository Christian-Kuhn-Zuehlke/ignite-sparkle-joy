-- Create celebration_settings table for company-specific gamification settings
CREATE TABLE public.celebration_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Confetti enable/disable
  confetti_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Milestone thresholds
  shipments_threshold INTEGER NOT NULL DEFAULT 100,
  sla_streak_threshold INTEGER NOT NULL DEFAULT 30,
  orders_today_threshold INTEGER NOT NULL DEFAULT 50,
  perfect_day_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Achievement toast settings
  show_achievement_toast BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT celebration_settings_company_id_unique UNIQUE (company_id)
);

-- Enable RLS
ALTER TABLE public.celebration_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can view their company's settings
CREATE POLICY "Users can view their company celebration settings"
ON public.celebration_settings
FOR SELECT
USING (
  company_id = ANY(public.get_user_company_ids(auth.uid()))
);

-- Admins can update their company's settings
CREATE POLICY "Admins can update their company celebration settings"
ON public.celebration_settings
FOR UPDATE
USING (
  company_id = ANY(public.get_user_company_ids(auth.uid()))
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'system_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'msd_csm'::public.app_role)
    OR public.has_role(auth.uid(), 'msd_management'::public.app_role)
  )
);

-- Admins can insert settings
CREATE POLICY "Admins can insert celebration settings"
ON public.celebration_settings
FOR INSERT
WITH CHECK (
  company_id = ANY(public.get_user_company_ids(auth.uid()))
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'system_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'msd_csm'::public.app_role)
    OR public.has_role(auth.uid(), 'msd_management'::public.app_role)
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_celebration_settings_updated_at
BEFORE UPDATE ON public.celebration_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings for existing companies
INSERT INTO public.celebration_settings (company_id)
SELECT id FROM public.companies
ON CONFLICT (company_id) DO NOTHING;