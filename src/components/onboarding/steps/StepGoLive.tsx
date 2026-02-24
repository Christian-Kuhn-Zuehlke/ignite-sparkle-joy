import { Check, X, AlertTriangle, Rocket } from 'lucide-react';
import { OnboardingData } from '../OnboardingWizard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

interface StepGoLiveProps {
  data: OnboardingData;
  completedSteps: string[];
  steps: Array<{ id: string; title: string; icon: React.ComponentType<{ className?: string }> }>;
}

export function StepGoLive({ data, completedSteps, steps }: StepGoLiveProps) {
  const { t } = useLanguage();

  const CHECKLIST = [
    { id: 'name', label: t('onboarding.checklistCompanyName'), check: (d: OnboardingData) => !!d.name, critical: true },
    { id: 'contact', label: t('onboarding.checklistContact'), check: (d: OnboardingData) => !!d.contactName && !!d.contactEmail, critical: false },
    { id: 'logo', label: t('onboarding.checklistLogo'), check: (d: OnboardingData) => !!d.logoUrl, critical: false },
    { id: 'colors', label: t('onboarding.checklistColors'), check: (d: OnboardingData) => !!d.primaryColor && d.primaryColor !== '#1e3a5f', critical: false },
    { id: 'sla', label: t('onboarding.checklistSla'), check: (d: OnboardingData) => d.slaTargets.processingHours > 0, critical: true },
    { id: 'integrations', label: t('onboarding.checklistIntegration'), check: (d: OnboardingData) => d.enabledIntegrations.length > 0, critical: false },
    { id: 'users', label: t('onboarding.checklistUsers'), check: (d: OnboardingData) => d.invitedUsers.length > 0, critical: false },
  ];

  const checklistResults = CHECKLIST.map(item => ({
    ...item,
    passed: item.check(data),
  }));

  const criticalPassed = checklistResults.filter(r => r.critical).every(r => r.passed);
  const totalPassed = checklistResults.filter(r => r.passed).length;
  const totalItems = checklistResults.length;
  const readyForGoLive = criticalPassed;

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <Card className={readyForGoLive ? 'border-green-500 bg-green-500/5' : 'border-amber-500 bg-amber-500/5'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {readyForGoLive ? (
              <>
                <Rocket className="h-5 w-5 text-green-500" />
                {t('onboarding.readyForGoLive')}
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t('onboarding.notReadyYet')}
              </>
            )}
          </CardTitle>
          <CardDescription>
            {readyForGoLive 
              ? t('onboarding.readyForGoLiveDesc').replace('{passed}', String(totalPassed)).replace('{total}', String(totalItems))
              : t('onboarding.notReadyYetDesc').replace('{passed}', String(totalPassed)).replace('{total}', String(totalItems))
            }
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Checklist */}
      <div>
        <h4 className="font-medium mb-3">{t('onboarding.goLiveChecklist')}</h4>
        <div className="space-y-2">
          {checklistResults.map(item => (
            <div 
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                item.passed 
                  ? 'bg-green-500/5 border-green-500/20' 
                  : item.critical 
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-muted/50 border-muted'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.passed ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    item.critical ? 'bg-red-500' : 'bg-muted-foreground/30'
                  }`}>
                    <X className="h-4 w-4 text-white" />
                  </div>
                )}
                <span className={item.passed ? '' : 'text-muted-foreground'}>
                  {item.label}
                </span>
              </div>
              {item.critical && !item.passed && (
                <Badge variant="destructive" className="text-xs">{t('onboarding.critical')}</Badge>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Wizard Progress */}
      <div>
        <h4 className="font-medium mb-3">{t('onboarding.wizardProgress')}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {steps.slice(0, -1).map(step => {
            const Icon = step.icon;
            const isCompleted = completedSteps.includes(step.id);
            
            return (
              <div 
                key={step.id}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  isCompleted ? 'bg-green-500/10' : 'bg-muted/50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  isCompleted ? 'bg-green-500 text-white' : 'bg-muted-foreground/30'
                }`}>
                  {isCompleted ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                </div>
                <span className="text-sm">{step.title}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('onboarding.customerSummary')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t('onboarding.company')}</p>
            <p className="font-medium">{data.name || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('onboarding.customerId')}</p>
            <p className="font-medium font-mono">{data.id || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('onboarding.industry')}</p>
            <p className="font-medium">{data.industry || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('onboarding.contractType')}</p>
            <p className="font-medium capitalize">{data.contractType || '-'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('onboarding.slaProcessing')}</p>
            <p className="font-medium">{data.slaTargets.processingHours}h</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('onboarding.slaDelivery')}</p>
            <p className="font-medium">{data.slaTargets.deliveryDays} {t('onboarding.days')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('onboarding.integrations')}</p>
            <p className="font-medium">{data.enabledIntegrations.length} {t('onboarding.activated')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('onboarding.invitedUsers')}</p>
            <p className="font-medium">{data.invitedUsers.length} {t('onboarding.persons')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Post Go-Live Info */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
        <h4 className="font-medium mb-2 text-blue-700 dark:text-blue-300">{t('onboarding.afterGoLive')}</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• {t('onboarding.afterGoLive1')}</li>
          <li>• {t('onboarding.afterGoLive2')}</li>
          <li>• {t('onboarding.afterGoLive3')}</li>
          <li>• {t('onboarding.afterGoLive4')}</li>
        </ul>
      </div>
    </div>
  );
}
