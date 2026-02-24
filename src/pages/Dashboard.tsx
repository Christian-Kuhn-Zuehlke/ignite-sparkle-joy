import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Package, Truck, Clock, RotateCcw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { OrderPipeline } from '@/components/dashboard/OrderPipeline';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { SmartAlertsWidget } from '@/components/dashboard/SmartAlertsWidget';
import { AIForecastWidget } from '@/components/dashboard/AIForecastWidget';
import { KpiWidget } from '@/components/dashboard/KpiWidget';
import { SLAComplianceWidget } from '@/components/dashboard/SLAComplianceWidget';
import { PersonalizedGreeting } from '@/components/dashboard/PersonalizedGreeting';
import { LiveActivityFeed } from '@/components/dashboard/LiveActivityFeed';
import { PendingRegistrationsWidget } from '@/components/dashboard/PendingRegistrationsWidget';
import { CustomerActivityWidget } from '@/components/dashboard/CustomerActivityWidget';
import { QuickActionsWidget } from '@/components/dashboard/QuickActionsWidget';
import { WeeklyDigestWidget } from '@/components/dashboard/WeeklyDigestWidget';
import { OrderAnalyticsWidget } from '@/components/dashboard/OrderAnalyticsWidget';
import { LowStockOverviewWidget } from '@/components/dashboard/LowStockOverviewWidget';
import { AIReportWidget } from '@/components/dashboard/AIReportWidget';
import { CompanyFilterDropdown } from '@/components/filters/CompanyFilterDropdown';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const effectiveCompanyId = useEffectiveCompanyId();
  
  // Date range filter - uses global default from hook (last_30_days)
  const { preset: datePreset, dateRange, setPreset: setDatePreset, setCustomRange } = useDateRangeFilter();

  // React Query: Fetch dashboard metrics
  const { 
    data: metrics, 
    isLoading, 
    error,
    refetch 
  } = useDashboardMetrics({
    dateFrom: dateRange.from ?? undefined,
    dateTo: dateRange.to ?? undefined,
    companyId: effectiveCompanyId,
  });

  // Realtime subscriptions - invalidate queries on change
  const handleRealtimeChange = useCallback(() => {
    // Invalidate dashboard metrics query to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  }, [queryClient]);

  useRealtimeSubscription({ table: 'orders', onAnyChange: handleRealtimeChange });
  useRealtimeSubscription({ table: 'returns', onAnyChange: handleRealtimeChange });

  // Error handling
  if (error) {
    return (
      <MainLayout title="Dashboard" subtitle={t('dashboard.overview')}>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-destructive mb-4">
              {t('common.error')}
            </p>
            <button 
              onClick={() => refetch()}
              className="text-accent hover:underline"
            >
              {t('orders.tryAgain')}
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Navigation handlers for clickable cards - memoized with useCallback
  const handleOrdersTodayClick = useCallback(() => {
    navigate('/orders');
  }, [navigate]);

  const handlePendingClick = useCallback(() => {
    navigate('/orders?status=pending');
  }, [navigate]);

  const handleShippedClick = useCallback(() => {
    navigate('/orders?status=shipped');
  }, [navigate]);

  const handleReturnsClick = useCallback(() => {
    navigate('/returns');
  }, [navigate]);


  // Loading state with skeleton
  if (isLoading && !metrics) {
    return (
      <MainLayout title="Dashboard" subtitle={t('dashboard.overview')}>
        <div className="mb-6">
          <div className="h-12 w-64 rounded bg-muted animate-shimmer mb-6" />
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 rounded bg-muted animate-shimmer" />
                  <div className="h-8 w-16 rounded bg-muted animate-shimmer" />
                </div>
                <div className="h-11 w-11 rounded-lg bg-muted animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard" subtitle={t('dashboard.overview')}>
      {/* Personalized Greeting */}
      <PersonalizedGreeting />

      {/* Pending Registrations Alert (for System Admins) */}
      <div className="mb-4 sm:mb-6">
        <PendingRegistrationsWidget />
      </div>

      {/* Filters Row - Scrollable on mobile */}
      <div className="mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-max">
          {/* Company Filter */}
          <CompanyFilterDropdown className="shrink-0" />

          {/* Date Range Filter */}
          <DateRangeFilter
            preset={datePreset}
            dateRange={dateRange}
            onPresetChange={setDatePreset}
            onCustomRangeChange={(from, to) => setCustomRange({ from, to })}
            onClear={() => setDatePreset('all_time')}
            compact
          />
        </div>
      </div>

      {/* Metrics Grid - 2 columns on mobile, 4 on desktop */}
      <div className="mb-4 sm:mb-6 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="animate-card-entrance animate-card-entrance-1">
          <MetricCard
            title={t('nav.orders')}
            value={metrics?.ordersToday || 0}
            icon={<Package className="h-4 w-4 sm:h-5 sm:w-5" />}
            accentColor="default"
            onClick={handleOrdersTodayClick}
            trend={metrics?.ordersTrend}
            animationDelay={0}
          />
        </div>
        <div className="animate-card-entrance animate-card-entrance-2">
          <MetricCard
            title={t('orders.inProgress')}
            value={metrics?.ordersPending || 0}
            icon={<Clock className="h-4 w-4 sm:h-5 sm:w-5" />}
            accentColor="warning"
            onClick={handlePendingClick}
            trend={metrics?.pendingTrend}
            animationDelay={100}
          />
        </div>
        <div className="animate-card-entrance animate-card-entrance-3">
          <MetricCard
            title={t('status.shipped')}
            value={metrics?.ordersShipped || 0}
            icon={<Truck className="h-4 w-4 sm:h-5 sm:w-5" />}
            accentColor="success"
            onClick={handleShippedClick}
            trend={metrics?.shippedTrend}
            animationDelay={200}
          />
        </div>
        <div className="animate-card-entrance animate-card-entrance-4">
          <MetricCard
            title={t('returns.openReturns')}
            value={metrics?.returnsOpen || 0}
            icon={<RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />}
            accentColor="danger"
            onClick={handleReturnsClick}
            trend={metrics?.returnsTrend}
            animationDelay={300}
          />
        </div>
      </div>

      {/* KPI & SLA Widgets - Stack on mobile */}
      <div className="mb-4 sm:mb-6 grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <KpiWidget companyId={effectiveCompanyId} />
        <SLAComplianceWidget companyId={effectiveCompanyId} />
      </div>

      {/* Low Stock Overview Widget */}
      <div className="mb-4 sm:mb-6">
        <LowStockOverviewWidget />
      </div>

      {/* Order Analytics - NEW WOW Widget */}
      <div className="mb-4 sm:mb-6">
        <OrderAnalyticsWidget companyId={effectiveCompanyId} />
      </div>

      {/* AI Forecasting */}
      <div className="mb-4 sm:mb-6">
        <AIForecastWidget />
      </div>

      {/* Main Content Grid - Single column on mobile */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Left Column - Quick Actions, Live Activity, AI Alerts & Pipeline */}
        <div className="space-y-4 sm:space-y-6 order-2 lg:order-1">
          <QuickActionsWidget />
          <AIReportWidget />
          <WeeklyDigestWidget />
          <LiveActivityFeed />
          <SmartAlertsWidget />
          <OrderPipeline companyId={effectiveCompanyId} />
        </div>

        {/* Middle + Right Column - Recent Orders & Customer Activity */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-1 lg:order-2">
          <RecentOrders companyId={effectiveCompanyId} />
          <CustomerActivityWidget />
        </div>
      </div>
    </MainLayout>
  );
}