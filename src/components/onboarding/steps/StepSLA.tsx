import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { OnboardingData } from '../OnboardingWizard';
import { Clock, Truck, Timer, AlertTriangle } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

interface StepSLAProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepSLA({ data, updateData }: StepSLAProps) {
  const { t } = useLanguage();

  const SLA_TEMPLATES = [
    { 
      id: 'express', 
      name: t('onboarding.slaExpress'), 
      description: t('onboarding.slaExpressDesc'),
      processingHours: 4, 
      deliveryDays: 1, 
      cutoffTime: '16:00' 
    },
    { 
      id: 'standard', 
      name: t('onboarding.slaStandard'), 
      description: t('onboarding.slaStandardDesc'),
      processingHours: 24, 
      deliveryDays: 3, 
      cutoffTime: '14:00' 
    },
    { 
      id: 'economy', 
      name: t('onboarding.slaEconomy'), 
      description: t('onboarding.slaEconomyDesc'),
      processingHours: 48, 
      deliveryDays: 5, 
      cutoffTime: '12:00' 
    },
  ];

  const applySLATemplate = (templateId: string) => {
    const template = SLA_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      updateData({
        slaTargets: {
          processingHours: template.processingHours,
          deliveryDays: template.deliveryDays,
          cutoffTime: template.cutoffTime,
        }
      });
    }
  };

  const updateSLAField = (field: keyof OnboardingData['slaTargets'], value: number | string) => {
    updateData({
      slaTargets: {
        ...data.slaTargets,
        [field]: value,
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* SLA Templates */}
      <div>
        <Label className="mb-3 block">{t('onboarding.selectSlaTemplate')}</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SLA_TEMPLATES.map(template => {
            const isActive = 
              data.slaTargets.processingHours === template.processingHours &&
              data.slaTargets.deliveryDays === template.deliveryDays;
            
            return (
              <Card 
                key={template.id}
                className={`cursor-pointer transition-all hover:border-primary ${
                  isActive ? 'border-primary bg-primary/5' : ''
                }`}
                onClick={() => applySLATemplate(template.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <CardDescription className="text-xs">{template.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {template.processingHours}h {t('onboarding.processing')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    {template.deliveryDays} {t('onboarding.daysDelivery')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Custom SLA Settings */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-4">{t('onboarding.customSettings')}</h4>
        
        <div className="space-y-6">
          {/* Processing Time */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-primary" />
                {t('onboarding.processingTime')}
              </Label>
              <span className="text-sm font-medium">{data.slaTargets.processingHours} {t('onboarding.hours')}</span>
            </div>
            <Slider
              value={[data.slaTargets.processingHours]}
              onValueChange={([value]) => updateSLAField('processingHours', value)}
              min={2}
              max={72}
              step={2}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">
              {t('onboarding.processingTimeDesc')}
            </p>
          </div>

          {/* Delivery Time */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                {t('onboarding.deliveryTime')}
              </Label>
              <span className="text-sm font-medium">{data.slaTargets.deliveryDays} {t('onboarding.days')}</span>
            </div>
            <Slider
              value={[data.slaTargets.deliveryDays]}
              onValueChange={([value]) => updateSLAField('deliveryDays', value)}
              min={1}
              max={10}
              step={1}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">
              {t('onboarding.deliveryTimeDesc')}
            </p>
          </div>

          {/* Cut-off Time */}
          <div className="space-y-2">
            <Label htmlFor="cutoffTime" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              {t('onboarding.cutoffTime')}
            </Label>
            <Select 
              value={data.slaTargets.cutoffTime} 
              onValueChange={(value) => updateSLAField('cutoffTime', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                  <SelectItem key={time} value={time}>{time} {t('onboarding.oclock')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t('onboarding.cutoffTimeDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* SLA Summary */}
      <div className="bg-muted/50 rounded-lg p-4 border">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {t('onboarding.slaSummary')}
        </h4>
        <p className="text-sm text-muted-foreground">
          {t('onboarding.slaSummaryText')
            .replace('{cutoffTime}', data.slaTargets.cutoffTime)
            .replace('{processingHours}', String(data.slaTargets.processingHours))
            .replace('{deliveryDays}', String(data.slaTargets.deliveryDays))}
        </p>
      </div>
    </div>
  );
}
