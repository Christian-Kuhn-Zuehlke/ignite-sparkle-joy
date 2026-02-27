import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  Target, 
  Activity,
  Users,
  BarChart3,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CalendarDays
} from '@/components/icons';
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, subQuarters, startOfQuarter, endOfQuarter, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useExecutiveMetrics, useCustomerPortfolio } from '@/hooks/useExecutiveMetrics';
import { useDateLocale } from '@/hooks/useDateLocale';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { CompanyFilterDropdown } from '@/components/filters/CompanyFilterDropdown';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type PeriodType = 'custom' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'lastQuarter' | 'thisYear' | 'lastYear';

function TrendIndicator({ value, suffix = '%' }: { value: number; suffix?: string }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
        <ArrowUpRight className="h-4 w-4" />
        +{value.toFixed(1)}{suffix}
      </span>
    );
  } else if (value < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
        <ArrowDownRight className="h-4 w-4" />
        {value.toFixed(1)}{suffix}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <Minus className="h-4 w-4" />
      0{suffix}
    </span>
  );
}

function MetricCardExecutive({ 
  title, 
  value, 
  subtitle,
  trend,
  icon: Icon,
  loading = false 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  trend?: number;
  icon: React.ElementType;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden h-full min-h-[140px]">
      <CardContent className="p-6 h-full flex flex-col">
        <div className="flex items-start justify-between flex-1">
          <div className="min-w-0 flex-1 pr-3">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3 flex-shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {trend !== undefined && (
          <div className="mt-auto pt-3 border-t border-border/30">
            <TrendIndicator value={trend} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ExecutiveDashboard() {
  const dateLocale = useDateLocale();
  const { t } = useLanguage();
  const { activeCompanyId } = useAuth();
  const [periodType, setPeriodType] = useState<PeriodType>('thisMonth');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  
  // Memoize 'now' to prevent it from changing on every render
  // This ensures dateRange stays stable and doesn't trigger infinite re-renders
  const now = useMemo(() => new Date(), []);
  const dateRange = useMemo(() => {
    switch (periodType) {
      case 'thisWeek':
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'lastWeek':
        const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        return { from: lastWeekStart, to: endOfWeek(lastWeekStart, { weekStartsOn: 1 }) };
      case 'thisMonth':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case 'thisQuarter':
        return { from: startOfQuarter(now), to: endOfQuarter(now) };
      case 'lastQuarter':
        const lastQuarter = subQuarters(now, 1);
        return { from: startOfQuarter(lastQuarter), to: endOfQuarter(lastQuarter) };
      case 'thisYear':
        return { from: startOfYear(now), to: now };
      case 'lastYear':
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        return { from: lastYear, to: new Date(now.getFullYear() - 1, 11, 31) };
      case 'custom':
        return { from: customDateRange.from || now, to: customDateRange.to || now };
      default:
        return { from: startOfMonth(now), to: endOfMonth(now) };
    }
  }, [periodType, customDateRange, now]);

  // Map to hook's expected periodType
  const hookPeriodType = useMemo(() => {
    if (periodType === 'thisYear' || periodType === 'lastYear') return 'yearly';
    if (periodType === 'thisQuarter' || periodType === 'lastQuarter') return 'quarterly';
    return 'monthly';
  }, [periodType]);

  const { data: metrics, isLoading: metricsLoading } = useExecutiveMetrics({
    periodType: hookPeriodType,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    companyId: activeCompanyId,
  });

  const { data: portfolio, isLoading: portfolioLoading } = useCustomerPortfolio();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('de-CH').format(value);
  };

  return (
    <MainLayout 
      title={t('executive.title')} 
      subtitle={t('executive.subtitle')}
      breadcrumbs={[{ label: t('executive.title') }]}
    >
      {/* Filter Section */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Company Filter */}
        <CompanyFilterDropdown />
        
        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="thisWeek">{t('executive.thisWeek')}</SelectItem>
              <SelectItem value="lastWeek">{t('executive.lastWeek')}</SelectItem>
              <SelectItem value="thisMonth">{t('executive.thisMonth')}</SelectItem>
              <SelectItem value="lastMonth">{t('executive.lastMonth')}</SelectItem>
              <SelectItem value="thisQuarter">{t('executive.thisQuarter')}</SelectItem>
              <SelectItem value="lastQuarter">{t('executive.lastQuarter')}</SelectItem>
              <SelectItem value="thisYear">{t('executive.thisYear')}</SelectItem>
              <SelectItem value="lastYear">{t('executive.lastYear')}</SelectItem>
              <SelectItem value="custom">{t('executive.custom')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Custom Date Range Picker */}
        {periodType === 'custom' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !customDateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {customDateRange.from ? (
                  customDateRange.to ? (
                    <>
                      {format(customDateRange.from, "dd.MM.yyyy")} - {format(customDateRange.to, "dd.MM.yyyy")}
                    </>
                  ) : (
                    format(customDateRange.from, "dd.MM.yyyy")
                  )
                ) : (
                  t('executive.selectDateRange')
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{ from: customDateRange.from, to: customDateRange.to }}
                onSelect={(range) => setCustomDateRange({ from: range?.from, to: range?.to })}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        )}
        
        <span className="text-sm text-muted-foreground">
          {format(dateRange.from, 'd. MMM', { locale: dateLocale })} – {format(dateRange.to, 'd. MMM yyyy', { locale: dateLocale })}
        </span>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <MetricCardExecutive
          title={t('executive.totalVolume')}
          value={formatNumber(metrics?.totalOrders || 0)}
          subtitle={`${formatNumber(metrics?.totalShipments || 0)} ${t('executive.shipped')}`}
          trend={metrics?.yoyGrowthPercent}
          icon={Package}
          loading={metricsLoading}
        />
        <MetricCardExecutive
          title={t('executive.revenue')}
          value={formatCurrency(metrics?.totalRevenue || 0)}
          subtitle={`${t('executive.plan')}: ${formatCurrency(metrics?.plannedRevenue || 0)}`}
          trend={metrics?.revenueVsPlanPercent}
          icon={DollarSign}
          loading={metricsLoading}
        />
        <MetricCardExecutive
          title={t('executive.slaFulfillment')}
          value={`${(metrics?.slaFulfillmentPercent || 0).toFixed(1)}%`}
          subtitle={t('executive.total')}
          icon={Target}
          loading={metricsLoading}
        />
        <MetricCardExecutive
          title={t('executive.qualityIndex')}
          value={`${(metrics?.qualityIndex || 0).toFixed(1)}%`}
          subtitle={t('executive.errorRateInverse')}
          icon={Activity}
          loading={metricsLoading}
        />
      </div>

      {/* Plan vs Actual Comparison */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('executive.volumeVsPlanForecast')}
            </CardTitle>
            <CardDescription>{t('executive.comparisonCurrentPeriod')}</CardDescription>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('executive.actual')}</span>
                    <span className="font-medium">{formatNumber(metrics?.totalOrders || 0)} {t('executive.orders')}</span>
                  </div>
                  <Progress value={100} className="h-3" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('executive.plan')}</span>
                    <span className="font-medium">{formatNumber(metrics?.plannedOrders || 0)} {t('executive.orders')}</span>
                  </div>
                  <Progress 
                    value={metrics?.totalOrders && metrics?.plannedOrders 
                      ? Math.min(100, (metrics.plannedOrders / metrics.totalOrders) * 100) 
                      : 0
                    } 
                    className="h-3 bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t('executive.forecast')}</span>
                    <span className="font-medium">{formatNumber(metrics?.forecastedOrders || 0)} {t('executive.orders')}</span>
                  </div>
                  <Progress 
                    value={metrics?.totalOrders && metrics?.forecastedOrders 
                      ? Math.min(100, (metrics.forecastedOrders / metrics.totalOrders) * 100) 
                      : 0
                    } 
                    className="h-3 bg-muted"
                  />
                </div>
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{t('executive.vsPlan')}</span>
                    <TrendIndicator value={metrics?.volumeVsPlanPercent || 0} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">{t('executive.vsForecast')}</span>
                    <TrendIndicator value={metrics?.volumeVsForecastPercent || 0} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-muted-foreground">{t('executive.vsLastYear')}</span>
                    <TrendIndicator value={metrics?.yoyGrowthPercent || 0} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('executive.productivity')}
            </CardTitle>
            <CardDescription>{t('executive.averagesCurrentPeriod')}</CardDescription>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{(metrics?.avgUph || 0).toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">UPH</p>
                  <p className="text-xs text-muted-foreground">{t('executive.unitsPerHour')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{(metrics?.avgOph || 0).toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">OPH</p>
                  <p className="text-xs text-muted-foreground">{t('executive.ordersPerHour')}</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{(metrics?.ordersPerFte || 0).toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">{t('executive.ordersPerFte')}</p>
                  <p className="text-xs text-muted-foreground">{t('executive.perEmployee')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trends Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('executive.longTermTrends')}
          </CardTitle>
          <CardDescription>{t('executive.trendsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {metricsLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={metrics?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="orders" 
                  name={t('executive.orders')}
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.2}
                />
                <Area 
                  type="monotone" 
                  dataKey="sla" 
                  name="SLA %"
                  stroke="hsl(var(--accent))" 
                  fill="hsl(var(--accent))" 
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Customer Portfolio */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('executive.customerPortfolio')}
              </CardTitle>
              <CardDescription>{t('executive.topCustomersByVolume')}</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <PieChart className="h-4 w-4 mr-2" />
              {t('executive.export')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {portfolioLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('executive.customer')}</TableHead>
                  <TableHead className="text-right">{t('executive.orders')}</TableHead>
                  <TableHead className="text-right">{t('executive.revenue')}</TableHead>
                  <TableHead className="text-right">{t('executive.vsLastYear')}</TableHead>
                  <TableHead className="text-right">SLA</TableHead>
                  <TableHead className="text-right">{t('executive.quality')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolio?.slice(0, 10).map((customer) => (
                  <TableRow key={customer.companyId}>
                    <TableCell className="font-medium">{customer.companyName}</TableCell>
                    <TableCell className="text-right">{formatNumber(customer.totalOrders)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(customer.totalRevenue)}</TableCell>
                    <TableCell className="text-right">
                      <TrendIndicator value={customer.yoyGrowthPercent} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={customer.slaFulfillmentPercent >= 95 ? 'default' : 'destructive'}>
                        {customer.slaFulfillmentPercent.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={customer.qualityIndex >= 95 ? 'default' : 'secondary'}>
                        {customer.qualityIndex.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
