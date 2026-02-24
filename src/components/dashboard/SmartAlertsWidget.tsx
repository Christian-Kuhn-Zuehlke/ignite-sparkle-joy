import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Clock, 
  Bell,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Package,
  RotateCcw
} from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { subHours, subDays, differenceInHours } from 'date-fns';

interface SmartAlert {
  id: string;
  type: 'sla_risk' | 'low_stock' | 'return_spike' | 'order_surge' | 'delayed_orders' | 'revenue_change' | 'customer_churn';
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  count?: number;
  value?: string;
  trend?: 'up' | 'down';
  action?: () => void;
  actionLabel?: string;
}

const alertIcons = {
  sla_risk: Clock,
  low_stock: Package,
  return_spike: RotateCcw,
  order_surge: TrendingUp,
  delayed_orders: Clock,
  revenue_change: DollarSign,
  customer_churn: Users,
};

export function SmartAlertsWidget() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const effectiveCompanyId = useEffectiveCompanyId();
  const [dismissedAlerts] = useState<Set<string>>(new Set());

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['smart-alerts', effectiveCompanyId],
    queryFn: async (): Promise<SmartAlert[]> => {
      const generatedAlerts: SmartAlert[] = [];
      const now = new Date();

      // Check for SLA risks - orders older than 24h not shipped
      let slaQuery = supabase
        .from('orders')
        .select('id, order_date, status')
        .in('status', ['received', 'putaway', 'picking', 'packing', 'ready_to_ship'])
        .lt('order_date', subHours(now, 24).toISOString());

      if (effectiveCompanyId) {
        slaQuery = slaQuery.eq('company_id', effectiveCompanyId);
      }

      const { data: slaRiskOrders } = await slaQuery.limit(100);

      if (slaRiskOrders && slaRiskOrders.length > 0) {
        const criticalCount = slaRiskOrders.filter(o => 
          differenceInHours(now, new Date(o.order_date || '')) > 48
        ).length;

        generatedAlerts.push({
          id: 'sla_risk',
          type: 'sla_risk',
          severity: criticalCount > 0 ? 'critical' : 'warning',
          title: t('smartAlerts.slaRisk'),
          description: `${slaRiskOrders.length} ${t('smartAlerts.ordersAtRisk')}`,
          count: slaRiskOrders.length,
          action: () => navigate('/orders?status=pending'),
          actionLabel: t('common.actions')
        });
      }

      // Check for low stock
      let stockQuery = supabase
        .from('inventory')
        .select('id, sku, name, on_hand, available, low_stock_threshold');

      if (effectiveCompanyId) {
        stockQuery = stockQuery.eq('company_id', effectiveCompanyId);
      }

      const { data: inventoryItems } = await stockQuery.limit(1000);

      if (inventoryItems) {
        const lowStockItems = inventoryItems.filter(item => 
          item.low_stock_threshold && (item.on_hand ?? 0) <= item.low_stock_threshold
        );
        const criticalItems = lowStockItems.filter(item => (item.available || 0) <= 5);

        if (lowStockItems.length > 0) {
          generatedAlerts.push({
            id: 'low_stock',
            type: 'low_stock',
            severity: criticalItems.length > 3 ? 'critical' : 'warning',
            title: t('smartAlerts.lowStock'),
            description: `${lowStockItems.length} ${t('smartAlerts.itemsBelowThreshold')}`,
            count: lowStockItems.length,
            value: criticalItems.length > 0 ? `${criticalItems.length} kritisch` : undefined,
            action: () => navigate('/inventory?filter=low-stock'),
            actionLabel: t('nav.inventory')
          });
        }
      }

      // Check for return spikes
      let returnsQuery = supabase
        .from('returns')
        .select('id, return_date', { count: 'exact' })
        .gte('return_date', subDays(now, 7).toISOString());

      let previousReturnsQuery = supabase
        .from('returns')
        .select('id', { count: 'exact' })
        .gte('return_date', subDays(now, 14).toISOString())
        .lt('return_date', subDays(now, 7).toISOString());

      if (effectiveCompanyId) {
        returnsQuery = returnsQuery.eq('company_id', effectiveCompanyId);
        previousReturnsQuery = previousReturnsQuery.eq('company_id', effectiveCompanyId);
      }

      const [returnsResult, previousReturnsResult] = await Promise.all([
        returnsQuery,
        previousReturnsQuery
      ]);

      const returnsThisWeek = returnsResult.count || 0;
      const returnsLastWeek = previousReturnsResult.count || 0;

      if (returnsThisWeek > returnsLastWeek * 1.5 && returnsThisWeek > 5) {
        const changePercent = returnsLastWeek > 0 
          ? Math.round(((returnsThisWeek - returnsLastWeek) / returnsLastWeek) * 100) 
          : 100;
        generatedAlerts.push({
          id: 'return_spike',
          type: 'return_spike',
          severity: 'warning',
          title: t('smartAlerts.returnSpike'),
          description: `+${changePercent}% ${t('smartAlerts.vsLastWeek')}`,
          count: returnsThisWeek,
          trend: 'up',
          action: () => navigate('/returns'),
          actionLabel: t('nav.returns')
        });
      }

      // Check for order/revenue trends
      let weekOrdersQuery = supabase
        .from('orders')
        .select('id, order_amount')
        .gte('order_date', subDays(now, 7).toISOString());

      let prevWeekOrdersQuery = supabase
        .from('orders')
        .select('id, order_amount')
        .gte('order_date', subDays(now, 14).toISOString())
        .lt('order_date', subDays(now, 7).toISOString());

      if (effectiveCompanyId) {
        weekOrdersQuery = weekOrdersQuery.eq('company_id', effectiveCompanyId);
        prevWeekOrdersQuery = prevWeekOrdersQuery.eq('company_id', effectiveCompanyId);
      }

      const [weekOrdersResult, prevWeekOrdersResult] = await Promise.all([
        weekOrdersQuery,
        prevWeekOrdersQuery
      ]);

      const weekOrders = weekOrdersResult.data || [];
      const prevWeekOrders = prevWeekOrdersResult.data || [];
      
      const weekRevenue = weekOrders.reduce((sum, o) => sum + (o.order_amount || 0), 0);
      const prevWeekRevenue = prevWeekOrders.reduce((sum, o) => sum + (o.order_amount || 0), 0);
      
      const revenueChange = prevWeekRevenue > 0 
        ? ((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100 
        : 0;

      if (revenueChange >= 20) {
        generatedAlerts.push({
          id: 'revenue_up',
          type: 'revenue_change',
          severity: 'success',
          title: t('smartAlerts.revenueSpike'),
          description: `+${revenueChange.toFixed(0)}% ${t('smartAlerts.vsLastWeek')}`,
          value: `CHF ${weekRevenue.toLocaleString('de-CH')}`,
          trend: 'up',
          action: () => navigate('/kpis'),
          actionLabel: t('nav.kpis')
        });
      } else if (revenueChange <= -20) {
        generatedAlerts.push({
          id: 'revenue_down',
          type: 'revenue_change',
          severity: 'warning',
          title: t('smartAlerts.revenueDrop'),
          description: `${revenueChange.toFixed(0)}% ${t('smartAlerts.vsLastWeek')}`,
          value: `CHF ${weekRevenue.toLocaleString('de-CH')}`,
          trend: 'down',
          action: () => navigate('/kpis'),
          actionLabel: t('nav.kpis')
        });
      }

// Check for processing delays (orders older than 7 days not shipped)
      let delayedQuery = supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .in('status', ['received', 'picking', 'packing'])
        .lt('order_date', subDays(now, 7).toISOString());

      if (effectiveCompanyId) {
        delayedQuery = delayedQuery.eq('company_id', effectiveCompanyId);
      }

      const { count: delayedCount } = await delayedQuery;

      if (delayedCount && delayedCount > 5) {
        generatedAlerts.push({
          id: 'delayed_orders',
          type: 'delayed_orders',
          severity: delayedCount > 20 ? 'critical' : 'warning',
          title: t('smartAlerts.processingDelays'),
          description: t('smartAlerts.ordersOlderThan7Days'),
          count: delayedCount,
          action: () => navigate('/orders?status=pending'),
          actionLabel: t('nav.orders')
        });
      }

      // No alerts = good news!
      if (generatedAlerts.length === 0) {
        generatedAlerts.push({
          id: 'all_good',
          type: 'order_surge',
          severity: 'info',
          title: t('smartAlerts.allGood'),
          description: t('smartAlerts.allGoodDesc')
        });
      }

      return generatedAlerts;
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000 // 5 minutes
  });

const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));
  const criticalCount = visibleAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = visibleAlerts.filter(a => a.severity === 'warning').length;
  const successCount = visibleAlerts.filter(a => a.severity === 'success').length;

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive/10 border-destructive/30 hover:bg-destructive/15';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15';
      case 'success':
        return 'bg-green-500/10 border-green-500/30 hover:bg-green-500/15';
      default:
        return 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15';
    }
  };

  const getSeverityIconStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive/20 text-destructive';
      case 'warning':
        return 'bg-amber-500/20 text-amber-600 dark:text-amber-400';
      case 'success':
        return 'bg-green-500/20 text-green-600 dark:text-green-400';
      default:
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-card border-border overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="h-5 w-32 bg-muted animate-shimmer rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-shimmer rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-border overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50">
        <CardTitle className="flex items-center justify-between text-base font-semibold">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500/20 to-pink-500/20">
              <Bell className="h-4 w-4 text-rose-500" />
            </div>
            {t('smartAlerts.title')}
          </div>
          <div className="flex gap-1.5">
            {successCount > 0 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 text-green-600 border-green-500/50 bg-green-500/10">
                {successCount} ↑
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 text-amber-600 border-amber-500/50 bg-amber-500/10">
                {warningCount}
              </Badge>
            )}
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs px-2 py-0.5">
                {criticalCount}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {visibleAlerts.length === 0 || (visibleAlerts.length === 1 && visibleAlerts[0].id === 'all_good') ? (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm font-medium text-foreground">{t('smartAlerts.allGood')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('smartAlerts.allGoodDesc')}</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="p-2 space-y-1.5">
              {visibleAlerts.filter(a => a.id !== 'all_good').map((alert) => {
                const Icon = alertIcons[alert.type] || AlertTriangle;
                return (
                  <button
                    key={alert.id}
                    onClick={alert.action}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg border transition-all",
                      getSeverityStyles(alert.severity)
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        "p-1.5 rounded-md flex-shrink-0",
                        getSeverityIconStyles(alert.severity)
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm text-foreground truncate flex items-center gap-1.5">
                            {alert.title}
                            {alert.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                            {alert.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {alert.count && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                                {alert.count}
                              </Badge>
                            )}
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {alert.description}
                          </p>
                          {alert.value && (
                            <span className="text-xs font-semibold text-foreground ml-2 whitespace-nowrap">
                              {alert.value}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
