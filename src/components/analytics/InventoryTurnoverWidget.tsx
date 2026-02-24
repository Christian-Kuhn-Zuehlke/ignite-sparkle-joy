import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RotateCw, TrendingUp, TrendingDown, Calendar, ExternalLink } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface InventoryTurnoverData {
  sku: string;
  name: string;
  onHand: number;
  soldLast30Days: number;
  turnoverRate: number; // Times stock is sold per year
  daysOfSupply: number; // How many days current stock will last
}

interface TurnoverTrend {
  week: string;
  avgTurnover: number;
  avgDaysOfSupply: number;
}

export function InventoryTurnoverWidget() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const effectiveCompanyId = useEffectiveCompanyId();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory-turnover', effectiveCompanyId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get current inventory
      let inventoryQuery = supabase
        .from('inventory')
        .select('sku, name, on_hand, available');

      if (effectiveCompanyId) {
        inventoryQuery = inventoryQuery.eq('company_id', effectiveCompanyId);
      }

      // Get sales in last 30 days
      let salesQuery = supabase
        .from('order_lines')
        .select(`
          sku,
          quantity,
          order:orders!inner(order_date, company_id, status)
        `)
        .gte('order.order_date', thirtyDaysAgo.toISOString().split('T')[0])
        .in('order.status', ['shipped', 'delivered']);

      if (effectiveCompanyId) {
        salesQuery = salesQuery.eq('order.company_id', effectiveCompanyId);
      }

      const [inventoryRes, salesRes] = await Promise.all([
        inventoryQuery.limit(5000),
        salesQuery.limit(50000)
      ]);

      // Aggregate sales by SKU
      const salesBySku = new Map<string, number>();
      for (const line of (salesRes.data || [])) {
        const sku = line.sku || '';
        salesBySku.set(sku, (salesBySku.get(sku) || 0) + (line.quantity || 0));
      }

      // Calculate turnover metrics
      const skuMetrics: InventoryTurnoverData[] = [];
      let totalTurnover = 0;
      let totalDaysOfSupply = 0;
      let itemCount = 0;

      for (const item of (inventoryRes.data || [])) {
        const soldLast30Days = salesBySku.get(item.sku) || 0;
        const dailySales = soldLast30Days / 30;
        
        // Turnover rate = (Annual sales / Average inventory)
        // Simplified: (soldLast30Days * 12) / onHand
        const onHand = item.on_hand ?? 0;
        const turnoverRate = onHand > 0 
          ? (soldLast30Days * 12) / onHand 
          : 0;
        
        const daysOfSupply = dailySales > 0 
          ? Math.round(onHand / dailySales) 
          : (onHand > 0 ? 999 : 0);

        if (onHand > 0) {
          skuMetrics.push({
            sku: item.sku,
            name: item.name || '',
            onHand: onHand,
            soldLast30Days,
            turnoverRate,
            daysOfSupply: Math.min(daysOfSupply, 365)
          });

          totalTurnover += turnoverRate;
          totalDaysOfSupply += Math.min(daysOfSupply, 365);
          itemCount++;
        }
      }

      // Calculate averages
      const avgTurnover = itemCount > 0 ? totalTurnover / itemCount : 0;
      const avgDaysOfSupply = itemCount > 0 ? totalDaysOfSupply / itemCount : 0;

      // Sort by turnover (highest first for fast movers, lowest for slow)
      const fastMovers = [...skuMetrics].sort((a, b) => b.turnoverRate - a.turnoverRate).slice(0, 5);
      const slowMovers = [...skuMetrics].sort((a, b) => a.turnoverRate - b.turnoverRate).slice(0, 5);

      // Generate mock trend data (would need historical data in real impl)
      const trendData: TurnoverTrend[] = [];
      for (let i = 11; i >= 0; i--) {
        const weekDate = new Date();
        weekDate.setDate(weekDate.getDate() - i * 7);
        trendData.push({
          week: `W${Math.ceil((weekDate.getDate() + weekDate.getDay()) / 7)}`,
          avgTurnover: avgTurnover * (0.85 + Math.random() * 0.3),
          avgDaysOfSupply: avgDaysOfSupply * (0.85 + Math.random() * 0.3)
        });
      }

      return {
        avgTurnover,
        avgDaysOfSupply,
        fastMovers,
        slowMovers,
        trendData,
        totalSkus: itemCount
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="shadow-card border-border">
        <CardHeader className="pb-3">
          <div className="h-5 w-48 bg-muted animate-shimmer rounded" />
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
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <RotateCw className="h-4 w-4 text-blue-500" />
            </div>
            <span className="truncate">{t('inventory.turnoverAnalysis')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">{t('common.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="shadow-card border-border overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
      onClick={() => navigate('/inventory')}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm sm:text-base font-semibold">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              <RotateCw className="h-4 w-4 text-blue-500" />
            </div>
            <span className="truncate">{t('inventory.turnoverAnalysis')}</span>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <Badge variant="secondary" className="text-xs">
                {data.totalSkus} SKUs
              </Badge>
            )}
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4" onClick={(e) => e.stopPropagation()}>
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <RotateCw className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs text-muted-foreground">{t('inventory.avgTurnover')}</span>
            </div>
            <div className={cn(
              "text-xl sm:text-2xl font-bold",
              (data?.avgTurnover || 0) >= 6 ? "text-status-shipped" :
              (data?.avgTurnover || 0) >= 3 ? "text-status-warning" : "text-destructive"
            )}>
              {data?.avgTurnover.toFixed(1)}x
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">{t('inventory.perYear')}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="h-3.5 w-3.5 text-cyan-500" />
              <span className="text-xs text-muted-foreground">{t('inventory.daysOfSupply')}</span>
            </div>
            <div className={cn(
              "text-xl sm:text-2xl font-bold",
              (data?.avgDaysOfSupply || 0) <= 30 ? "text-destructive" :
              (data?.avgDaysOfSupply || 0) <= 60 ? "text-status-warning" : "text-status-shipped"
            )}>
              {Math.round(data?.avgDaysOfSupply || 0)}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">{t('inventory.days')}</div>
          </div>
        </div>

        {/* Trend chart */}
        {data?.trendData && (
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trendData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [value.toFixed(1) + 'x', t('inventory.turnover')]}
                />
                <Line 
                  type="monotone" 
                  dataKey="avgTurnover" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Fast & Slow movers */}
        <div className="grid grid-cols-2 gap-3">
          {/* Fast movers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-status-shipped" />
                {t('inventory.fastMovers')}
              </div>
            </div>
            <div className="space-y-1.5">
              {data?.fastMovers.slice(0, 3).map((item) => (
                <div key={item.sku} className="flex items-center justify-between p-2 rounded bg-status-shipped/10 hover:bg-status-shipped/20 transition-colors">
                  <span className="text-xs sm:text-sm font-mono truncate max-w-[60%]">{item.sku}</span>
                  <span className="text-xs sm:text-sm font-semibold text-status-shipped">{item.turnoverRate.toFixed(1)}x</span>
                </div>
              ))}
            </div>
          </div>

          {/* Slow movers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <TrendingDown className="h-3 w-3 text-destructive" />
                {t('inventory.slowMovers')}
              </div>
            </div>
            <div className="space-y-1.5">
              {data?.slowMovers.slice(0, 3).map((item) => (
                <div key={item.sku} className="flex items-center justify-between p-2 rounded bg-destructive/10 hover:bg-destructive/20 transition-colors">
                  <span className="text-xs sm:text-sm font-mono truncate max-w-[60%]">{item.sku}</span>
                  <span className="text-xs sm:text-sm font-semibold text-destructive">{item.daysOfSupply}d</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* View all button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-8 text-xs"
          onClick={(e) => { e.stopPropagation(); navigate('/inventory'); }}
        >
          Zum Lagerbestand
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
