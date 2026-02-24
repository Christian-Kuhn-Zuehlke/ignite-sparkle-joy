import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useShippingAnomalies } from '@/hooks/usePackagingIntelligence';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { Truck, AlertTriangle, DollarSign } from 'lucide-react';

export function CarrierAnalysis() {
  const { data: anomalies, isLoading } = useShippingAnomalies(false);
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {t('packaging.carrierAnalysis')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Aggregate anomalies by type
  const anomalyByType = anomalies?.reduce((acc, a) => {
    acc[a.anomaly_type] = (acc[a.anomaly_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const carrierAnomalies = ['expensive_carrier', 'wrong_service', 'routing_issue'];
  const carrierIssues = carrierAnomalies.reduce((sum, type) => sum + (anomalyByType[type] || 0), 0);
  
  const potentialSavings = anomalies
    ?.filter(a => carrierAnomalies.includes(a.anomaly_type))
    ?.reduce((sum, a) => sum + (a.potential_savings_cents || 0), 0) || 0;

  const severityCounts = anomalies?.reduce((acc, a) => {
    if (carrierAnomalies.includes(a.anomaly_type)) {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const total = Object.values(severityCounts).reduce((sum, count) => sum + count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-purple-500" />
            {t('packaging.carrierAnalysis')}
          </div>
          {carrierIssues > 0 && (
            <Badge variant="outline" className="text-amber-500">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {carrierIssues} {t('packaging.issues')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-muted-foreground">{t('packaging.carrierIssues')}</span>
              </div>
              <p className="text-2xl font-bold">{carrierIssues}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">{t('packaging.savingsPotential')}</span>
              </div>
              <p className="text-2xl font-bold text-emerald-500">
                CHF {(potentialSavings / 100).toFixed(0)}
              </p>
            </div>
          </div>

          {/* Severity breakdown */}
          {total > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t('packaging.severityBreakdown')}</h4>
              {(['critical', 'high', 'medium', 'low'] as const).map((severity) => {
                const count = severityCounts[severity] || 0;
                const percentage = total > 0 ? (count / total) * 100 : 0;
                const colors: Record<string, string> = {
                  critical: 'bg-red-500',
                  high: 'bg-orange-500',
                  medium: 'bg-amber-500',
                  low: 'bg-blue-500',
                };
                return count > 0 ? (
                  <div key={severity} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{t(`packaging.severity.${severity}`)}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-2"
                      style={{ '--progress-foreground': colors[severity] } as React.CSSProperties}
                    />
                  </div>
                ) : null;
              })}
            </div>
          )}

          {/* Issue types */}
          {carrierIssues > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('packaging.issueTypes')}</h4>
              <div className="flex flex-wrap gap-2">
                {carrierAnomalies.map((type) => {
                  const count = anomalyByType[type] || 0;
                  if (count === 0) return null;
                  return (
                    <Badge key={type} variant="secondary">
                      {t(`packaging.anomalyType.${type}`)} ({count})
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
