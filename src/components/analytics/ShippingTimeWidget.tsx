import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Truck, Clock, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, ExternalLink } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ShippingTimeData {
  week: string;
  avgProcessingDays: number;
  orderCount: number;
  slaCompliance: number;
}

export function ShippingTimeWidget() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const effectiveCompanyId = useEffectiveCompanyId();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shipping-time-monitoring', effectiveCompanyId],
    queryFn: async () => {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Get weekly shipping metrics
      let query = supabase
        .from('orders')
        .select('order_date, posted_shipment_date, company_id')
        .not('posted_shipment_date', 'is', null)
        .gte('order_date', ninetyDaysAgo.toISOString().split('T')[0]);

      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }

      const { data: orders, error } = await query.limit(50000);
      if (error) throw error;

      // Group by week and calculate metrics
      const weeklyData = new Map<string, { 
        totalDays: number; 
        count: number; 
        withinSla: number;
        weekStart: Date;
      }>();

      const SLA_TARGET_DAYS = 1; // 24 hours

      for (const order of (orders || [])) {
        if (!order.posted_shipment_date) continue;
        const orderDate = new Date(order.order_date);
        const shipDate = new Date(order.posted_shipment_date);
        const processingDays = (shipDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
        
        // Get week start (Monday)
        const weekStart = new Date(orderDate);
        weekStart.setDate(orderDate.getDate() - orderDate.getDay() + 1);
        const weekKey = weekStart.toISOString().split('T')[0];

        const existing = weeklyData.get(weekKey) || { 
          totalDays: 0, 
          count: 0, 
          withinSla: 0,
          weekStart 
        };
        existing.totalDays += Math.max(0, processingDays);
        existing.count += 1;
        if (processingDays <= SLA_TARGET_DAYS) {
          existing.withinSla += 1;
        }
        weeklyData.set(weekKey, existing);
      }

      // Convert to array and sort by date
      const weeklyMetrics: ShippingTimeData[] = Array.from(weeklyData.entries())
        .map(([_key, data]) => ({
          week: `W${getWeekNumber(data.weekStart)}`,
          avgProcessingDays: data.count > 0 ? data.totalDays / data.count : 0,
          orderCount: data.count,
          slaCompliance: data.count > 0 ? (data.withinSla / data.count) * 100 : 100
        }))
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-12);

      // Calculate current week and previous week metrics
      const currentWeek = weeklyMetrics[weeklyMetrics.length - 1];
      const previousWeek = weeklyMetrics[weeklyMetrics.length - 2];

      const processingTrend = currentWeek && previousWeek 
        ? currentWeek.avgProcessingDays - previousWeek.avgProcessingDays 
        : 0;

      const slaTrend = currentWeek && previousWeek
        ? currentWeek.slaCompliance - previousWeek.slaCompliance
        : 0;

      // Calculate overall metrics (last 30 days)
      const last30Days = weeklyMetrics.slice(-4);
      const overallAvg = last30Days.length > 0
        ? last30Days.reduce((sum, w) => sum + w.avgProcessingDays, 0) / last30Days.length
        : 0;
      const overallSla = last30Days.length > 0
        ? last30Days.reduce((sum, w) => sum + w.slaCompliance, 0) / last30Days.length
        : 100;

      return {
        weeklyMetrics,
        avgProcessingTime: overallAvg,
        processingTrend,
        slaCompliance: overallSla,
        slaTrend,
        slaTarget: SLA_TARGET_DAYS
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="shadow-card border-border">
        <CardHeader className="pb-3">
          <div className="h-5 w-44 bg-muted animate-shimmer rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted animate-shimmer rounded" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="shadow-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-semibold">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20">
              <Truck className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="truncate">{t('shipping.timeMonitoring')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">{t('common.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const isGoodPerformance = (data?.slaCompliance || 0) >= 90;

  return (
    <Card 
      className="shadow-card border-border overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
      onClick={() => navigate('/orders')}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm sm:text-base font-semibold">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg bg-gradient-to-br",
              isGoodPerformance ? "from-emerald-500/20 to-green-500/20" : "from-amber-500/20 to-orange-500/20"
            )}>
              <Truck className={cn("h-4 w-4", isGoodPerformance ? "text-emerald-500" : "text-amber-500")} />
            </div>
            <span className="truncate">{t('shipping.timeMonitoring')}</span>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4" onClick={(e) => e.stopPropagation()}>
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('shipping.avgProcessingTime')}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-xl sm:text-2xl font-bold",
                (data?.avgProcessingTime || 0) <= 1 ? "text-status-shipped" :
                (data?.avgProcessingTime || 0) <= 2 ? "text-status-warning" : "text-destructive"
              )}>
                {(data?.avgProcessingTime || 0).toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">{t('shipping.days')}</span>
              {data?.processingTrend !== 0 && (
                <Badge variant="secondary" className={cn(
                  "text-[10px] px-1.5",
                  (data?.processingTrend || 0) < 0 ? "bg-status-shipped/20 text-status-shipped" : "bg-destructive/20 text-destructive"
                )}>
                  {(data?.processingTrend || 0) < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                </Badge>
              )}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('shipping.slaCompliance')}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-xl sm:text-2xl font-bold",
                (data?.slaCompliance || 0) >= 95 ? "text-status-shipped" :
                (data?.slaCompliance || 0) >= 85 ? "text-status-warning" : "text-destructive"
              )}>
                {(data?.slaCompliance || 0).toFixed(0)}%
              </span>
              {data?.slaTrend !== 0 && (
                <Badge variant="secondary" className={cn(
                  "text-[10px] px-1.5",
                  (data?.slaTrend || 0) > 0 ? "bg-status-shipped/20 text-status-shipped" : "bg-destructive/20 text-destructive"
                )}>
                  {(data?.slaTrend || 0) > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                </Badge>
              )}
            </div>
            <Progress 
              value={data?.slaCompliance || 0} 
              className="h-2 mt-2"
            />
          </div>
        </div>

        {/* Trend chart */}
        {data?.weeklyMetrics && data.weeklyMetrics.length > 0 && (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeklyMetrics} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorProcessing" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} domain={[0, 'auto']} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'avgProcessingDays' 
                      ? `${value.toFixed(2)} ${t('shipping.days')}` 
                      : `${value.toFixed(1)}%`,
                    name === 'avgProcessingDays' ? t('shipping.processingTime') : t('shipping.slaCompliance')
                  ]}
                />
                <ReferenceLine 
                  y={data.slaTarget} 
                  stroke="hsl(var(--status-shipped))" 
                  strokeDasharray="5 5" 
                  label={{ value: 'SLA', position: 'right', fontSize: 10 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="avgProcessingDays" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1}
                  fill="url(#colorProcessing)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* SLA target info */}
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('shipping.slaTarget')}</span>
          </div>
          <span className="font-semibold">{data?.slaTarget} {t('shipping.day')}</span>
        </div>
        
        {/* View all button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-8 text-xs"
          onClick={(e) => { e.stopPropagation(); navigate('/orders'); }}
        >
          Zu den Bestellungen
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

// Helper function to get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
