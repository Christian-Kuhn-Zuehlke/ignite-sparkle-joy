import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { OnboardingData } from '../OnboardingWizard';
import { PartyPopper, Trophy, Target, Bell, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

interface StepGamificationProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepGamification({ data, updateData }: StepGamificationProps) {
  const { t } = useLanguage();

  const updateCelebrationSettings = (
    field: keyof NonNullable<OnboardingData['celebrationSettings']>,
    value: boolean | number
  ) => {
    updateData({
      celebrationSettings: {
        ...data.celebrationSettings,
        [field]: value,
      },
    });
  };

  const PRESET_TEMPLATES = [
    {
      id: 'conservative',
      name: t('onboarding.gamificationConservative'),
      description: t('onboarding.gamificationConservativeDesc'),
      icon: Target,
      settings: {
        confettiEnabled: true,
        shipmentsThreshold: 100,
        slaStreakThreshold: 30,
        ordersTodayThreshold: 50,
        perfectDayEnabled: true,
        showAchievementToast: true,
      },
    },
    {
      id: 'balanced',
      name: t('onboarding.gamificationBalanced'),
      description: t('onboarding.gamificationBalancedDesc'),
      icon: Sparkles,
      settings: {
        confettiEnabled: true,
        shipmentsThreshold: 50,
        slaStreakThreshold: 14,
        ordersTodayThreshold: 25,
        perfectDayEnabled: true,
        showAchievementToast: true,
      },
    },
    {
      id: 'frequent',
      name: t('onboarding.gamificationFrequent'),
      description: t('onboarding.gamificationFrequentDesc'),
      icon: PartyPopper,
      settings: {
        confettiEnabled: true,
        shipmentsThreshold: 25,
        slaStreakThreshold: 7,
        ordersTodayThreshold: 10,
        perfectDayEnabled: true,
        showAchievementToast: true,
      },
    },
  ];

  const applyTemplate = (templateId: string) => {
    const template = PRESET_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      updateData({ celebrationSettings: template.settings });
    }
  };

  const settings = data.celebrationSettings || {
    confettiEnabled: true,
    shipmentsThreshold: 100,
    slaStreakThreshold: 30,
    ordersTodayThreshold: 50,
    perfectDayEnabled: true,
    showAchievementToast: true,
  };

  return (
    <div className="space-y-6">
      {/* Preset Templates */}
      <div>
        <Label className="mb-3 block">{t('onboarding.selectGamificationTemplate')}</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PRESET_TEMPLATES.map((template) => {
            const Icon = template.icon;
            const isActive =
              settings.shipmentsThreshold === template.settings.shipmentsThreshold &&
              settings.slaStreakThreshold === template.settings.slaStreakThreshold;

            return (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:border-primary ${
                  isActive ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => applyTemplate(template.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-xs">{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3" />
                    {template.settings.shipmentsThreshold}+ {t('onboarding.shipments')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {template.settings.slaStreakThreshold} {t('onboarding.daysStreak')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Master Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PartyPopper className="h-5 w-5 text-primary" />
              <div>
                <Label className="text-base">{t('onboarding.confettiEnabled')}</Label>
                <p className="text-sm text-muted-foreground">{t('onboarding.confettiEnabledDesc')}</p>
              </div>
            </div>
            <Switch
              checked={settings.confettiEnabled}
              onCheckedChange={(checked) => updateCelebrationSettings('confettiEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Settings */}
      {settings.confettiEnabled && (
        <div className="border-t pt-4 space-y-6">
          <h4 className="font-medium">{t('onboarding.milestoneThresholds')}</h4>

          {/* Shipments Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-green-500" />
                {t('onboarding.shipmentsThreshold')}
              </Label>
              <span className="text-sm font-medium">{settings.shipmentsThreshold} {t('onboarding.shipments')}</span>
            </div>
            <Slider
              value={[settings.shipmentsThreshold]}
              onValueChange={([value]) => updateCelebrationSettings('shipmentsThreshold', value)}
              min={10}
              max={500}
              step={10}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">{t('onboarding.shipmentsThresholdDesc')}</p>
          </div>

          {/* SLA Streak Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-500" />
                {t('onboarding.slaStreakThreshold')}
              </Label>
              <span className="text-sm font-medium">{settings.slaStreakThreshold} {t('onboarding.days')}</span>
            </div>
            <Slider
              value={[settings.slaStreakThreshold]}
              onValueChange={([value]) => updateCelebrationSettings('slaStreakThreshold', value)}
              min={3}
              max={90}
              step={1}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">{t('onboarding.slaStreakThresholdDesc')}</p>
          </div>

          {/* Orders Today Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                {t('onboarding.ordersTodayThreshold')}
              </Label>
              <span className="text-sm font-medium">{settings.ordersTodayThreshold} {t('onboarding.orders')}</span>
            </div>
            <Slider
              value={[settings.ordersTodayThreshold]}
              onValueChange={([value]) => updateCelebrationSettings('ordersTodayThreshold', value)}
              min={5}
              max={200}
              step={5}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">{t('onboarding.ordersTodayThresholdDesc')}</p>
          </div>

          {/* Perfect Day Toggle */}
          <div className="flex items-center justify-between py-3 border-t">
            <div>
              <Label>{t('onboarding.perfectDayEnabled')}</Label>
              <p className="text-sm text-muted-foreground">{t('onboarding.perfectDayEnabledDesc')}</p>
            </div>
            <Switch
              checked={settings.perfectDayEnabled}
              onCheckedChange={(checked) => updateCelebrationSettings('perfectDayEnabled', checked)}
            />
          </div>

          {/* Achievement Toast Toggle */}
          <div className="flex items-center justify-between py-3 border-t">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <Label>{t('onboarding.showAchievementToast')}</Label>
                <p className="text-sm text-muted-foreground">{t('onboarding.showAchievementToastDesc')}</p>
              </div>
            </div>
            <Switch
              checked={settings.showAchievementToast}
              onCheckedChange={(checked) => updateCelebrationSettings('showAchievementToast', checked)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
