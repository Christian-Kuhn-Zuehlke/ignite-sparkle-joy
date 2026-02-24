import { Clock, AlertTriangle, CheckCircle2, XCircle, Loader2 } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSLACompliance } from '@/hooks/useSLACompliance';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

interface SLAComplianceWidgetProps {
  companyId?: string;
  days?: number;
}

export function SLAComplianceWidget({ companyId, days = 7 }: SLAComplianceWidgetProps) {
  const { data: compliance, isLoading, error } = useSLACompliance(companyId, days);
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!companyId) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            SLA Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !compliance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('widgets.slaCompliance')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('widgets.noSlaData')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const complianceColor = compliance.compliance >= 95 
    ? 'text-green-500' 
    : compliance.compliance >= 90 
    ? 'text-yellow-500' 
    : 'text-red-500';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t('widgets.slaCompliance')} ({days} {t('greeting.days')})
        </CardTitle>
        <CardDescription>
          {t('widgets.slaDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('widgets.totalCompliance')}</span>
            <span className={`text-2xl font-bold ${complianceColor}`}>
              {compliance.compliance.toFixed(1)}%
            </span>
          </div>
          <Progress value={compliance.compliance} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2">
          <button 
            onClick={() => navigate('/orders?sla=met')}
            className="text-center p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-lg font-bold">{compliance.met}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('widgets.met')}</p>
          </button>
          <button 
            onClick={() => navigate('/orders?sla=at-risk')}
            className="text-center p-2 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-950/20 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-lg font-bold">{compliance.atRisk}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('widgets.atRisk')}</p>
          </button>
          <button 
            onClick={() => navigate('/orders?sla=breached')}
            className="text-center p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
              <XCircle className="h-4 w-4" />
              <span className="text-lg font-bold">{compliance.breached}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('widgets.breached')}</p>
          </button>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {compliance.total} {t('widgets.ordersTotal')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

