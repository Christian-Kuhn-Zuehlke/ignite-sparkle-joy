import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrendingDown, TrendingUp, Package, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface ReturnRateData {
  sku: string;
  name: string;
  returnCount: number;
  orderCount: number;
  returnRate: number;
  trend: number; // positive = increasing returns (bad)
}

export function ReturnRatesWidget() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const effectiveCompanyId = useEffectiveCompanyId();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['return-rates-analysis', effectiveCompanyId],
    queryFn: async (): Promise<{ topReturns: ReturnRateData[]; overallRate: number; trend: number }> => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const sixtyDaysAgo = new Date(now);
      sixtyDaysAgo.setDate(now.getDate() - 60);

      // Get return counts by SKU (last 30 days)
      let returnsQuery = supabase
        .from('return_lines')
        .select(`
          sku,
          name,
          quantity,
          return:returns!inner(return_date, company_id)
        `)
        .gte('return.return_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Get order counts by SKU (last 30 days)
      let ordersQuery = supabase
        .from('order_lines')
        .select(`
          sku,
          quantity,
          order:orders!inner(order_date, company_id)
        `)
        .gte('order.order_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Previous period for trend
      let prevReturnsQuery = supabase
        .from('returns')
        .select('id', { count: 'exact' })
        .gte('return_date', sixtyDaysAgo.toISOString().split('T')[0])
        .lt('return_date', thirtyDaysAgo.toISOString().split('T')[0]);

      let prevOrdersQuery = supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .gte('order_date', sixtyDaysAgo.toISOString().split('T')[0])
        .lt('order_date', thirtyDaysAgo.toISOString().split('T')[0]);

      let currReturnsQuery = supabase
        .from('returns')
        .select('id', { count: 'exact' })
        .gte('return_date', thirtyDaysAgo.toISOString().split('T')[0]);

      let currOrdersQuery = supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .gte('order_date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (effectiveCompanyId) {
        returnsQuery = returnsQuery.eq('return.company_id', effectiveCompanyId);
        ordersQuery = ordersQuery.eq('order.company_id', effectiveCompanyId);
        prevReturnsQuery = prevReturnsQuery.eq('company_id', effectiveCompanyId);
        prevOrdersQuery = prevOrdersQuery.eq('company_id', effectiveCompanyId);
        currReturnsQuery = currReturnsQuery.eq('company_id', effectiveCompanyId);
        currOrdersQuery = currOrdersQuery.eq('company_id', effectiveCompanyId);
      }

      const [returnsRes, ordersRes, prevReturns, prevOrders, currReturns, currOrders] = await Promise.all([
        returnsQuery.limit(5000),
        ordersQuery.limit(10000),
        prevReturnsQuery,
        prevOrdersQuery,
        currReturnsQuery,
        currOrdersQuery
      ]);

      // Aggregate returns by SKU
      const returnsBySku = new Map<string, { name: string; count: number }>();
      for (const line of (returnsRes.data || [])) {
        const existing = returnsBySku.get(line.sku) || { name: line.name, count: 0 };
        existing.count += line.quantity;
        returnsBySku.set(line.sku, existing);
      }

      // Aggregate orders by SKU
      const ordersBySku = new Map<string, number>();
      for (const line of (ordersRes.data || [])) {
        ordersBySku.set(line.sku, (ordersBySku.get(line.sku) || 0) + line.quantity);
      }

      // Calculate return rates
      const skuRates: ReturnRateData[] = [];
      for (const [sku, data] of returnsBySku) {
        const orderCount = ordersBySku.get(sku) || 0;
        if (orderCount > 0 && !sku.startsWith('100') && !sku.startsWith('110') && !sku.startsWith('400')) {
          skuRates.push({
            sku,
            name: data.name,
            returnCount: data.count,
            orderCount,
            returnRate: (data.count / orderCount) * 100,
            trend: 0 // Would need historical data per SKU
          });
        }
      }

      // Sort by return rate, take top 10
      skuRates.sort((a, b) => b.returnRate - a.returnRate);
      const topReturns = skuRates.slice(0, 10);

      // Calculate overall return rate and trend
      const currReturnCount = currReturns.count || 0;
      const currOrderCount = currOrders.count || 0;
      const prevReturnCount = prevReturns.count || 0;
      const prevOrderCount = prevOrders.count || 0;

      const overallRate = currOrderCount > 0 ? (currReturnCount / currOrderCount) * 100 : 0;
      const prevRate = prevOrderCount > 0 ? (prevReturnCount / prevOrderCount) * 100 : 0;
      const trend = overallRate - prevRate;

      return { topReturns, overallRate, trend };
    },
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useMemo(() => {
    if (!data?.topReturns) return [];
    return data.topReturns.slice(0, 6).map(item => ({
      name: item.sku.length > 12 ? item.sku.slice(0, 12) + '...' : item.sku,
      rate: item.returnRate,
      fullName: item.name
    }));
  }, [data]);

  if (isLoading) {
    return (
      <Card className="shadow-card border-border">
        <CardHeader className="pb-3">
          <div className="h-5 w-40 bg-muted animate-shimmer rounded" />
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
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30">
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="truncate">{t('returns.returnRateAnalysis')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">{t('common.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const hasHighReturns = data && data.overallRate > 5;

  return (
    <Card 
      className="shadow-card border-border overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
      onClick={() => navigate('/returns')}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm sm:text-base font-semibold">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg bg-gradient-to-br",
              hasHighReturns ? "from-red-500/20 to-orange-500/20" : "from-emerald-500/20 to-green-500/20"
            )}>
              <Package className={cn("h-4 w-4", hasHighReturns ? "text-red-500" : "text-emerald-500")} />
            </div>
            <span className="truncate">{t('returns.returnRateAnalysis')}</span>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <span className={cn(
                "text-base sm:text-lg font-bold",
                data.overallRate > 10 ? "text-destructive" :
                data.overallRate > 5 ? "text-status-warning" : "text-status-shipped"
              )}>
                {data.overallRate.toFixed(1)}%
              </span>
            )}
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardTitle>
        {data && data.trend !== 0 && (
          <Badge variant="secondary" className={cn(
            "text-xs w-fit mt-1",
            data.trend > 0 ? "bg-destructive/20 text-destructive" : "bg-status-shipped/20 text-status-shipped"
          )}>
            {data.trend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {Math.abs(data.trend).toFixed(1)}% vs. Vormonat
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0" onClick={(e) => e.stopPropagation()}>
        {/* Chart */}
        {chartData.length > 0 && (
          <div className="h-40 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" domain={[0, 'auto']} tickFormatter={(v) => `${v.toFixed(0)}%`} fontSize={10} />
                <YAxis type="category" dataKey="name" width={80} fontSize={10} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, t('returns.returnRate')]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.rate > 15 ? 'hsl(var(--destructive))' : 
                            entry.rate > 8 ? 'hsl(var(--status-warning))' : 
                            'hsl(var(--status-shipped))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top problem products */}
        {data?.topReturns && data.topReturns.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                {t('returns.topReturnProducts')}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs"
                onClick={(e) => { e.stopPropagation(); navigate('/returns'); }}
              >
                Alle anzeigen
              </Button>
            </div>
            <div className="space-y-1.5">
              {data.topReturns.slice(0, 3).map((item) => (
                <div key={item.sku} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-mono truncate">{item.sku}</div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{item.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn(
                      "text-sm sm:text-base font-semibold",
                      item.returnRate > 15 ? "text-destructive" :
                      item.returnRate > 8 ? "text-status-warning" : "text-status-shipped"
                    )}>
                      {item.returnRate.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {item.returnCount}/{item.orderCount}
                    </div>
                  </div>
                  <Progress 
                    value={Math.min(item.returnRate * 3, 100)} 
                    className="w-12 h-2"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
