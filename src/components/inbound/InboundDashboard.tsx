import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePurchaseOrderStats } from '@/hooks/usePurchaseOrders';
import { Package, Truck, Clock, AlertTriangle, CheckCircle, Loader2 } from '@/components/icons';

export function InboundDashboard() {
  const { t } = useLanguage();
  const { data: stats, isLoading } = usePurchaseOrderStats();

  const kpiCards = [
    {
      title: t('inbound.kpi.expectedToday'),
      value: stats?.expectedToday ?? 0,
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: t('inbound.kpi.arrivedNotReceived'),
      value: stats?.arrivedNotReceived ?? 0,
      icon: Truck,
      color: 'text-warning',
      bgColor: 'bg-warning-bg',
    },
    {
      title: t('inbound.kpi.inProgress'),
      value: stats?.inProgress ?? 0,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: t('inbound.kpi.discrepancies'),
      value: stats?.discrepancies ?? 0,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive-bg',
    },
    {
      title: t('inbound.kpi.completedThisWeek'),
      value: stats?.completedThisWeek ?? 0,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success-bg',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className={`rounded-full p-2 ${kpi.bgColor}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t('inbound.recentActivity')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('inbound.noRecentActivity')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
