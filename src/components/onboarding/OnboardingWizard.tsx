import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronLeft, ChevronRight, Building2, Palette, Clock, Plug, Users, Rocket, PartyPopper, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { StepCompanyDetails } from './steps/StepCompanyDetails';
import { StepBranding } from './steps/StepBranding';
import { StepSLA } from './steps/StepSLA';
import { StepGamification } from './steps/StepGamification';
import { StepIntegrations } from './steps/StepIntegrations';
import { StepUsers } from './steps/StepUsers';
import { StepGoLive } from './steps/StepGoLive';
import { StepFeatures } from './steps/StepFeatures';

export interface CelebrationSettingsData {
  confettiEnabled: boolean;
  shipmentsThreshold: number;
  slaStreakThreshold: number;
  ordersTodayThreshold: number;
  perfectDayEnabled: boolean;
  showAchievementToast: boolean;
}

export interface OnboardingData {
  // Company Details
  id: string;
  name: string;
  domain: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contractType: string;
  contractStartDate: string;
  notes: string;
  // Branding
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  brandKeywords: string[];
  tagline: string;
  // SLA
  slaTargets: {
    processingHours: number;
    deliveryDays: number;
    cutoffTime: string;
  };
  // Gamification / Celebration
  celebrationSettings: CelebrationSettingsData;
  // Integrations
  enabledIntegrations: string[];
  // Users
  invitedUsers: Array<{ email: string; role: 'admin' | 'viewer' }>;
}

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string; // If provided, edit existing company
  onComplete?: () => void;
}

export function OnboardingWizard({ open, onOpenChange, companyId, onComplete }: OnboardingWizardProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  
  const STEPS = [
    { id: 'company', title: t('onboarding.stepCompany'), icon: Building2, description: t('onboarding.stepCompanyDesc') },
    { id: 'branding', title: t('onboarding.stepBranding'), icon: Palette, description: t('onboarding.stepBrandingDesc') },
    { id: 'sla', title: t('onboarding.stepSla'), icon: Clock, description: t('onboarding.stepSlaDesc') },
    { id: 'gamification', title: t('onboarding.stepGamification'), icon: PartyPopper, description: t('onboarding.stepGamificationDesc') },
    { id: 'features', title: t('onboarding.stepFeatures'), icon: Navigation, description: t('onboarding.stepFeaturesDesc') },
    { id: 'integrations', title: t('onboarding.stepIntegrations'), icon: Plug, description: t('onboarding.stepIntegrationsDesc') },
    { id: 'users', title: t('onboarding.stepUsers'), icon: Users, description: t('onboarding.stepUsersDesc') },
    { id: 'golive', title: t('onboarding.stepGoLive'), icon: Rocket, description: t('onboarding.stepGoLiveDesc') },
  ];
  
  const [data, setData] = useState<OnboardingData>({
    id: '',
    name: '',
    domain: '',
    industry: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contractType: 'standard',
    contractStartDate: new Date().toISOString().split('T')[0],
    notes: '',
    logoUrl: null,
    primaryColor: '#1e3a5f',
    accentColor: '#2f9e8f',
    brandKeywords: [],
    tagline: '',
    slaTargets: {
      processingHours: 24,
      deliveryDays: 3,
      cutoffTime: '14:00',
    },
    celebrationSettings: {
      confettiEnabled: true,
      shipmentsThreshold: 100,
      slaStreakThreshold: 30,
      ordersTodayThreshold: 50,
      perfectDayEnabled: true,
      showAchievementToast: true,
    },
    enabledIntegrations: [],
    invitedUsers: [],
  });

  // Load existing company data if editing
  useEffect(() => {
    if (companyId && open) {
      loadCompanyData(companyId);
    }
  }, [companyId, open]);

  const loadCompanyData = async (id: string) => {
    setIsLoading(true);
    try {
      const { data: company, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (company) {
        setData(prev => ({
          ...prev,
          id: company.id,
          name: company.name,
          domain: company.domain || '',
          industry: company.industry || '',
          contactName: company.contact_name || '',
          contactEmail: company.contact_email || '',
          contactPhone: company.contact_phone || '',
          contractType: company.contract_type || 'standard',
          contractStartDate: company.contract_start_date || new Date().toISOString().split('T')[0],
          notes: company.notes || '',
          logoUrl: company.logo_url,
          primaryColor: company.primary_color || '#1e3a5f',
          accentColor: company.accent_color || '#2f9e8f',
          brandKeywords: company.brand_keywords || [],
          tagline: company.tagline || '',
        }));
        
        // Load completed steps
        const steps = company.onboarding_completed_steps as string[] || [];
        setCompletedSteps(steps);
      }
    } catch (error) {
      console.error('Error loading company:', error);
      toast.error(t('onboarding.errorLoadingCompany'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const saveProgress = async (markStepComplete = true) => {
    setIsSaving(true);
    try {
      const stepId = STEPS[currentStep].id;
      const newCompletedSteps = markStepComplete && !completedSteps.includes(stepId)
        ? [...completedSteps, stepId]
        : completedSteps;

      const companyData = {
        id: data.id || data.name.toUpperCase().substring(0, 5).replace(/\s/g, ''),
        name: data.name,
        domain: data.domain || null,
        industry: data.industry || null,
        contact_name: data.contactName || null,
        contact_email: data.contactEmail || null,
        contact_phone: data.contactPhone || null,
        contract_type: data.contractType || null,
        contract_start_date: data.contractStartDate || null,
        notes: data.notes || null,
        logo_url: data.logoUrl,
        primary_color: data.primaryColor,
        accent_color: data.accentColor,
        brand_keywords: data.brandKeywords.length > 0 ? data.brandKeywords : null,
        tagline: data.tagline || null,
        status: 'onboarding' as const,
        onboarding_started_at: new Date().toISOString(),
        onboarding_completed_steps: newCompletedSteps,
      };

      const { error } = await supabase
        .from('companies')
        .upsert(companyData, { onConflict: 'id' });

      if (error) throw error;

      // Update local ID if new company
      const companyId = data.id || companyData.id;
      if (!data.id) {
        setData(prev => ({ ...prev, id: companyId }));
      }

      // Save celebration settings if we have a company ID
      if (companyId && data.celebrationSettings) {
        const { error: celebrationError } = await supabase
          .from('celebration_settings')
          .upsert({
            company_id: companyId,
            confetti_enabled: data.celebrationSettings.confettiEnabled,
            shipments_threshold: data.celebrationSettings.shipmentsThreshold,
            sla_streak_threshold: data.celebrationSettings.slaStreakThreshold,
            orders_today_threshold: data.celebrationSettings.ordersTodayThreshold,
            perfect_day_enabled: data.celebrationSettings.perfectDayEnabled,
            show_achievement_toast: data.celebrationSettings.showAchievementToast,
          }, { onConflict: 'company_id' });

        if (celebrationError) {
          console.error('Error saving celebration settings:', celebrationError);
        }
      }
      
      setCompletedSteps(newCompletedSteps);
      toast.success(t('onboarding.progressSaved'));
    } catch (error) {
      console.error('Error saving:', error);
      toast.error(t('onboarding.errorSaving'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    await saveProgress(true);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleGoLive = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          status: 'live',
          go_live_date: new Date().toISOString().split('T')[0],
          onboarding_completed_at: new Date().toISOString(),
          onboarding_completed_steps: [...completedSteps, 'golive'],
        })
        .eq('id', data.id);

      if (error) throw error;

      toast.success(t('onboarding.goLiveSuccess').replace('{name}', data.name), {
        description: t('onboarding.goLiveSuccessDesc'),
      });
      
      onComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error going live:', error);
      toast.error(t('onboarding.errorGoLive'));
    } finally {
      setIsSaving(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const currentStepData = STEPS[currentStep];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <StepCompanyDetails data={data} updateData={updateData} />;
      case 1:
        return <StepBranding data={data} updateData={updateData} />;
      case 2:
        return <StepSLA data={data} updateData={updateData} />;
      case 3:
        return <StepGamification data={data} updateData={updateData} />;
      case 4:
        return <StepFeatures companyId={data.id} companyName={data.name} />;
      case 5:
        return <StepIntegrations data={data} updateData={updateData} />;
      case 6:
        return <StepUsers data={data} updateData={updateData} companyId={data.id} />;
      case 7:
        return <StepGoLive data={data} completedSteps={completedSteps} steps={STEPS} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold">
            {t('onboarding.title')}: {data.name || t('onboarding.newCustomer')}
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex-shrink-0 px-1">
          <Progress value={progress} className="h-2 mb-4" />
          
          {/* Step indicators */}
          <div className="flex justify-between mb-6">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = completedSteps.includes(step.id);
              
              return (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(index)}
                  className={cn(
                    'flex flex-col items-center gap-1 transition-all',
                    isActive ? 'scale-110' : 'opacity-60 hover:opacity-80',
                  )}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                    isActive && 'border-primary bg-primary text-primary-foreground',
                    isCompleted && !isActive && 'border-green-500 bg-green-500 text-white',
                    !isActive && !isCompleted && 'border-muted-foreground/30 bg-muted',
                  )}>
                    {isCompleted && !isActive ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={cn(
                    'text-xs font-medium hidden sm:block',
                    isActive && 'text-primary',
                  )}>
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-1 min-h-0">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <currentStepData.icon className="h-5 w-5 text-primary" />
              {currentStepData.title}
            </h3>
            <p className="text-sm text-muted-foreground">{currentStepData.description}</p>
          </div>
          
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex-shrink-0 flex justify-between items-center pt-4 border-t mt-4">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('common.back')}
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => saveProgress(false)}
              disabled={isSaving}
            >
              {t('onboarding.saveProgress')}
            </Button>
            
            {currentStep === STEPS.length - 1 ? (
              <Button
                onClick={handleGoLive}
                disabled={isSaving || !data.name}
                className="bg-green-600 hover:bg-green-700"
              >
                <Rocket className="h-4 w-4 mr-1" />
                {t('onboarding.goLive')}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={isSaving || (currentStep === 0 && !data.name)}
              >
                {t('common.next')}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
