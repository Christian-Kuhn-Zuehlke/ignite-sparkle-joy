import { AlertTriangle, Check, ExternalLink, Package, Truck, Scale, Ruler } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useShippingAnomalies, useResolveAnomaly, ShippingAnomaly } from '@/hooks/usePackagingIntelligence';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const anomalyIcons: Record<string, typeof AlertTriangle> = {
  expensive_carrier: Truck,
  wrong_service: Truck,
  weight_mismatch: Scale,
  dimension_mismatch: Ruler,
  routing_issue: Truck,
  overpackaged: Package,
  underpackaged: Package,
};

const severityColors: Record<string, string> = {
  low: 'bg-blue-500/10 text-blue-500',
  medium: 'bg-amber-500/10 text-amber-500',
  high: 'bg-orange-500/10 text-orange-500',
  critical: 'bg-red-500/10 text-red-500',
};

export function ShippingAnomaliesList() {
  const { data: anomalies, isLoading } = useShippingAnomalies(true);
  const resolveAnomaly = useResolveAnomaly();
  const { t } = useLanguage();

  const handleResolve = async (anomaly: ShippingAnomaly) => {
    try {
      await resolveAnomaly.mutateAsync(anomaly.id);
      toast.success(t('packaging.anomalyResolved'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t('packaging.shippingAnomalies')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const unresolvedAnomalies = anomalies?.filter(a => !a.is_resolved) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          {t('packaging.shippingAnomalies')}
          {unresolvedAnomalies.length > 0 && (
            <Badge variant="destructive">{unresolvedAnomalies.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {unresolvedAnomalies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Check className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>{t('packaging.noAnomalies')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unresolvedAnomalies.slice(0, 10).map((anomaly) => {
              const Icon = anomalyIcons[anomaly.anomaly_type] || AlertTriangle;
              return (
                <div
                  key={anomaly.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${severityColors[anomaly.severity]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={severityColors[anomaly.severity]}>
                        {t(`packaging.severity.${anomaly.severity}`)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t(`packaging.anomalyType.${anomaly.anomaly_type}`)}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">
                      {anomaly.description || t(`packaging.anomalyType.${anomaly.anomaly_type}`)}
                    </p>
                    {anomaly.expected_value && anomaly.actual_value && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('packaging.expected')}: {anomaly.expected_value} → {t('packaging.actual')}: {anomaly.actual_value}
                      </p>
                    )}
                    {anomaly.potential_savings_cents && anomaly.potential_savings_cents > 0 && (
                      <p className="text-xs text-amber-500 mt-1">
                        {t('packaging.potentialSavings')}: CHF {(anomaly.potential_savings_cents / 100).toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/orders/${anomaly.order_id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolve(anomaly)}
                      disabled={resolveAnomaly.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
