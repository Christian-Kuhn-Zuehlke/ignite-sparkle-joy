import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useLanguage } from '@/contexts/LanguageContext';
import { Truck, Clock, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { exportToCSV, CARRIER_EXPORT_COLUMNS } from '@/lib/exportUtils';
import { toast } from 'sonner';

interface CarrierMetrics {
  carrier: string;
  totalShipments: number;
  deliveredCount: number;
  delayedCount: number;
  deliveryRate: number;
  avgDeliveryDays: number;
  onTimeRate: number;
}

interface WeeklyTrend {
  week: string;
  onTimeRate: number;
  avgDays: number;
}

export function CarrierPerformanceWidget() {
  const { t } = useLanguage();
  const effectiveCompanyId = useEffectiveCompanyId();
  const [days] = useState(90);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['carrier-performance', effectiveCompanyId, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Fetch shipped orders with delivery info
      let query = supabase
        .from('orders')
        .select('id, shipping_agent_code, posted_shipment_date, status, status_date, order_date')
        .in('status', ['shipped', 'delivered'])
        .gte('order_date', startDateStr);

      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }

      const { data: orders } = await query;

      if (!orders || orders.length === 0) {
        return { carriers: [], weeklyTrends: [], summary: null };
      }

      // Aggregate by carrier
      const carrierMap = new Map<string, {
        total: number;
        delivered: number;
        delayed: number;
        deliveryDays: number[];
      }>();

      const SLA_TARGET_DAYS = 3; // Consider on-time if delivered within 3 days

      orders.forEach(order => {
        const carrier = order.shipping_agent_code || 'Unbekannt';
        if (!carrierMap.has(carrier)) {
          carrierMap.set(carrier, { total: 0, delivered: 0, delayed: 0, deliveryDays: [] });
        }
        const stats = carrierMap.get(carrier)!;
        stats.total++;

        if (order.status === 'delivered' && order.posted_shipment_date && order.status_date) {
          stats.delivered++;
          const shipDate = new Date(order.posted_shipment_date);
          const deliverDate = new Date(order.status_date);
          const days = Math.ceil((deliverDate.getTime() - shipDate.getTime()) / (1000 * 60 * 60 * 24));
          stats.deliveryDays.push(days);
          if (days > SLA_TARGET_DAYS) {
            stats.delayed++;
          }
        }
      });

      const carriers: CarrierMetrics[] = Array.from(carrierMap.entries())
        .map(([carrier, stats]) => {
          const avgDays = stats.deliveryDays.length > 0
            ? stats.deliveryDays.reduce((a, b) => a + b, 0) / stats.deliveryDays.length
            : 0;
          const onTimeCount = stats.deliveryDays.filter(d => d <= SLA_TARGET_DAYS).length;
          return {
            carrier,
            totalShipments: stats.total,
            deliveredCount: stats.delivered,
            delayedCount: stats.delayed,
            deliveryRate: stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0,
            avgDeliveryDays: avgDays,
            onTimeRate: stats.deliveryDays.length > 0 ? (onTimeCount / stats.deliveryDays.length) * 100 : 0,
          };
        })
        .sort((a, b) => b.totalShipments - a.totalShipments);

      // Weekly trends
      const weeklyMap = new Map<string, { onTime: number; total: number; days: number[] }>();
      orders.forEach(order => {
        if (order.status === 'delivered' && order.posted_shipment_date && order.status_date) {
          const shipDate = new Date(order.posted_shipment_date);
          const weekStart = new Date(shipDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];

          if (!weeklyMap.has(weekKey)) {
            weeklyMap.set(weekKey, { onTime: 0, total: 0, days: [] });
          }
          const stats = weeklyMap.get(weekKey)!;
          stats.total++;
          
          const deliverDate = new Date(order.status_date);
          const deliveryDays = Math.ceil((deliverDate.getTime() - shipDate.getTime()) / (1000 * 60 * 60 * 24));
          stats.days.push(deliveryDays);
          if (deliveryDays <= SLA_TARGET_DAYS) {
            stats.onTime++;
          }
        }
      });

      const weeklyTrends: WeeklyTrend[] = Array.from(weeklyMap.entries())
        .map(([week, stats]) => ({
          week: new Date(week).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }),
          onTimeRate: stats.total > 0 ? (stats.onTime / stats.total) * 100 : 0,
          avgDays: stats.days.length > 0 ? stats.days.reduce((a, b) => a + b, 0) / stats.days.length : 0,
        }))
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-12);

      // Summary
      const totalShipments = carriers.reduce((sum, c) => sum + c.totalShipments, 0);
      const totalDelivered = carriers.reduce((sum, c) => sum + c.deliveredCount, 0);
      const totalDelayed = carriers.reduce((sum, c) => sum + c.delayedCount, 0);
      const allDeliveryDays = carriers.flatMap(c => 
        Array(c.deliveredCount).fill(c.avgDeliveryDays)
      );
      const avgDeliveryDays = allDeliveryDays.length > 0
        ? allDeliveryDays.reduce((a, b) => a + b, 0) / allDeliveryDays.length
        : 0;

      return {
        carriers,
        weeklyTrends,
        summary: {
          totalShipments,
          deliveryRate: totalShipments > 0 ? (totalDelivered / totalShipments) * 100 : 0,
          delayedCount: totalDelayed,
          avgDeliveryDays,
        },
      };
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  // Export functionality - must be before any early returns!
  const handleExport = useCallback(() => {
    if (!data?.carriers || data.carriers.length === 0) {
      toast.error(t('common.noDataToExport'));
      return;
    }
    
    const exportData = data.carriers.map(c => ({
      carrier: c.carrier,
      totalOrders: c.totalShipments,
      deliveredCount: c.deliveredCount,
      deliveryRate: c.deliveryRate.toFixed(1),
      avgDeliveryDays: c.avgDeliveryDays.toFixed(1),
      onTimeRate: c.onTimeRate.toFixed(1),
    }));
    
    const filename = `carrier_performance_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(exportData, CARRIER_EXPORT_COLUMNS, filename);
    toast.success(t('export.carrierExported'));
  }, [data, t]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {t('carrier.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data?.summary || isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {t('carrier.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">{t('common.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            {t('carrier.title')}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="h-8">
              <Download className="h-4 w-4 mr-1" />
              {t('common.export')}
            </Button>
            <Badge variant="outline">{t('common.last90Days')}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('carrier.totalShipments')}</span>
            </div>
            <p className="text-xl font-bold">{data.summary.totalShipments}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-muted-foreground">{t('carrier.deliveryRate')}</span>
            </div>
            <p className="text-xl font-bold text-emerald-500">{data.summary.deliveryRate.toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">{t('carrier.avgDeliveryDays')}</span>
            </div>
            <p className="text-xl font-bold">{data.summary.avgDeliveryDays.toFixed(1)} {t('common.days')}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">{t('carrier.delayed')}</span>
            </div>
            <p className="text-xl font-bold text-amber-500">{data.summary.delayedCount}</p>
          </div>
        </div>

        <Tabs defaultValue="carriers" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="carriers">{t('carrier.byCarrier')}</TabsTrigger>
            <TabsTrigger value="trends">{t('carrier.trends')}</TabsTrigger>
          </TabsList>

          <TabsContent value="carriers" className="space-y-4">
            {data.carriers.slice(0, 6).map((carrier) => (
              <div key={carrier.carrier} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{carrier.carrier}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{carrier.totalShipments} {t('carrier.shipments')}</span>
                    <Badge variant={carrier.onTimeRate >= 90 ? 'default' : carrier.onTimeRate >= 70 ? 'secondary' : 'destructive'}>
                      {carrier.onTimeRate.toFixed(0)}% {t('carrier.onTime')}
                    </Badge>
                  </div>
                </div>
                <Progress value={carrier.onTimeRate} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{carrier.deliveredCount} {t('carrier.delivered')}</span>
                  <span className="text-amber-500">{carrier.delayedCount} {t('carrier.delayedShort')}</span>
                  <span>{carrier.avgDeliveryDays.toFixed(1)} {t('common.days')} Ø</span>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="trends">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.weeklyTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px' 
                    }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="onTimeRate" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name={t('carrier.onTimeRate')}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="avgDays" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    name={t('carrier.avgDays')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
