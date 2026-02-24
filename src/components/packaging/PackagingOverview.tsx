import { Package, Truck, AlertTriangle, Leaf, TrendingDown, DollarSign } from '@/components/icons';
import { Card, CardContent } from '@/components/ui/card';
import { usePackagingStats } from '@/hooks/usePackagingIntelligence';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';

interface PackagingOverviewProps {
  days?: number;
}

export function PackagingOverview({ days = 30 }: PackagingOverviewProps) {
  const { stats, isLoading } = usePackagingStats(days);
  const { t } = useLanguage();

  const metrics = [
    {
      title: t('packaging.totalShipments'),
      value: stats.totalShipments.toLocaleString(),
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: t('packaging.avgFillRate'),
      value: `${stats.avgFillRate.toFixed(1)}%`,
      icon: TrendingDown,
      color: stats.avgFillRate >= 70 ? 'text-green-500' : 'text-amber-500',
      bgColor: stats.avgFillRate >= 70 ? 'bg-green-500/10' : 'bg-amber-500/10',
      subtitle: stats.avgFillRate >= 70 ? t('packaging.good') : t('packaging.improvable'),
    },
    {
      title: t('packaging.overpackagedRate'),
      value: `${stats.overpackagedRate.toFixed(1)}%`,
      icon: AlertTriangle,
      color: stats.overpackagedRate <= 5 ? 'text-green-500' : 'text-red-500',
      bgColor: stats.overpackagedRate <= 5 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
    {
      title: t('packaging.shippingCost'),
      value: `CHF ${stats.totalShippingCost.toLocaleString()}`,
      icon: Truck,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: t('packaging.co2Footprint'),
      value: `${stats.totalCO2.toFixed(1)} kg`,
      icon: Leaf,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: t('packaging.potentialSavings'),
      value: `CHF ${stats.potentialSavings.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      subtitle: t('packaging.identified'),
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1">{metric.title}</p>
            <p className="text-xl font-bold">{metric.value}</p>
            {metric.subtitle && (
              <p className={`text-xs ${metric.color}`}>{metric.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
