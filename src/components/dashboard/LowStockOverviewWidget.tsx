import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package, AlertTriangle, TrendingDown, ChevronRight } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface InventoryHealthData {
  total: number;
  healthy: number;
  lowStock: number;
  outOfStock: number;
  criticalItems: Array<{
    id: string;
    sku: string;
    name: string;
    available: number;
    threshold: number;
    percentOfThreshold: number;
  }>;
}

export function LowStockOverviewWidget() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const effectiveCompanyId = useEffectiveCompanyId();

  const { data, isLoading } = useQuery({
    queryKey: ['inventory-health', effectiveCompanyId],
    queryFn: async (): Promise<InventoryHealthData> => {
      let query = supabase
        .from('inventory')
        .select('id, sku, name, on_hand, reserved, available, low_stock_threshold');

      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }

      const { data: items, error } = await query.limit(5000);
      
      if (error) throw error;

      const itemsWithThreshold = items?.filter(item => item.low_stock_threshold != null) || [];
      const total = itemsWithThreshold.length;
      
      let outOfStock = 0;
      let lowStock = 0;
      let healthy = 0;
      const criticalItems: InventoryHealthData['criticalItems'] = [];

      for (const item of itemsWithThreshold) {
        const available = item.available ?? (item.on_hand - item.reserved);
        const threshold = item.low_stock_threshold!;
        
        if (available <= 0) {
          outOfStock++;
          criticalItems.push({
            id: item.id,
            sku: item.sku,
            name: item.name,
            available,
            threshold,
            percentOfThreshold: 0
          });
        } else if (available <= threshold) {
          lowStock++;
          criticalItems.push({
            id: item.id,
            sku: item.sku,
            name: item.name,
            available,
            threshold,
            percentOfThreshold: Math.round((available / threshold) * 100)
          });
        } else {
          healthy++;
        }
      }

      // Sort by urgency (lowest percentage first), take top 5
      criticalItems.sort((a, b) => a.percentOfThreshold - b.percentOfThreshold);
      
      return {
        total,
        healthy,
        lowStock,
        outOfStock,
        criticalItems: criticalItems.slice(0, 5)
      };
    },
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: t('inventory.healthy'), value: data.healthy, color: 'hsl(var(--status-shipped))' },
      { name: t('inventory.lowStock'), value: data.lowStock, color: 'hsl(var(--status-warning))' },
      { name: t('inventory.outOfStock'), value: data.outOfStock, color: 'hsl(var(--destructive))' },
    ].filter(d => d.value > 0);
  }, [data, t]);

  const healthPercentage = useMemo(() => {
    if (!data || data.total === 0) return 100;
    return Math.round((data.healthy / data.total) * 100);
  }, [data]);

  if (isLoading) {
    return (
      <Card className="shadow-card border-border">
        <CardHeader className="pb-3">
          <div className="h-5 w-40 bg-muted animate-shimmer rounded" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="h-32 w-32 bg-muted animate-shimmer rounded-full" />
            <div className="flex-1 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-muted animate-shimmer rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.total === 0) {
    return (
      <Card className="shadow-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Package className="h-4 w-4 text-amber-500" />
            </div>
            {t('inventory.lowStockOverview')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('inventory.noThresholdsConfigured')}</p>
        </CardContent>
      </Card>
    );
  }

  const hasCriticalItems = data.outOfStock > 0 || data.lowStock > 0;

  return (
    <Card className="shadow-card border-border overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg bg-gradient-to-br",
              hasCriticalItems 
                ? "from-amber-500/20 to-orange-500/20" 
                : "from-emerald-500/20 to-green-500/20"
            )}>
              {hasCriticalItems ? (
                <TrendingDown className="h-4 w-4 text-amber-500" />
              ) : (
                <Package className="h-4 w-4 text-emerald-500" />
              )}
            </div>
            {t('inventory.lowStockOverview')}
          </div>
          {hasCriticalItems && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs",
                data.outOfStock > 0 && "bg-destructive/20 text-destructive"
              )}
            >
              {data.lowStock + data.outOfStock} {t('inventory.itemsAtRisk')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Donut Chart */}
          <div className="relative shrink-0 mx-auto lg:mx-0">
            <div className="w-28 h-28 lg:w-32 lg:h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="90%"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string) => [value, name]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Center percentage */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(
                "text-xl lg:text-2xl font-bold",
                healthPercentage >= 80 ? "text-status-shipped" : 
                healthPercentage >= 50 ? "text-status-warning" : 
                "text-destructive"
              )}>
                {healthPercentage}%
              </span>
              <span className="text-[10px] text-muted-foreground">{t('inventory.healthy')}</span>
            </div>
          </div>

          {/* Stats & Critical Items */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-status-shipped/10">
                <div className="text-lg font-semibold text-status-shipped">{data.healthy}</div>
                <div className="text-[10px] text-muted-foreground">{t('inventory.healthy')}</div>
              </div>
              <div className="p-2 rounded-lg bg-status-warning/10">
                <div className="text-lg font-semibold text-status-warning">{data.lowStock}</div>
                <div className="text-[10px] text-muted-foreground">{t('inventory.lowStock')}</div>
              </div>
              <div className="p-2 rounded-lg bg-destructive/10">
                <div className="text-lg font-semibold text-destructive">{data.outOfStock}</div>
                <div className="text-[10px] text-muted-foreground">{t('inventory.outOfStock')}</div>
              </div>
            </div>

            {/* Critical items list */}
            {data.criticalItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  {t('inventory.criticalItems')}
                </div>
                <div className="space-y-1.5">
                  {data.criticalItems.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer group"
                      onClick={() => navigate(`/inventory?sku=${encodeURIComponent(item.sku)}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-medium truncate">
                            {item.sku}
                          </span>
                          {item.available <= 0 && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0">
                              {t('inventory.outOfStock')}
                            </Badge>
                          )}
                        </div>
                        <Progress 
                          value={item.percentOfThreshold} 
                          className="h-1 mt-1"
                        />
                      </div>
                      <div className="text-right shrink-0">
                        <div className={cn(
                          "text-xs font-medium",
                          item.available <= 0 ? "text-destructive" : "text-status-warning"
                        )}>
                          {item.available}/{item.threshold}
                        </div>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer action */}
        {hasCriticalItems && (
          <div className="mt-4 pt-3 border-t border-border">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between text-xs"
              onClick={() => navigate('/inventory?filter=low-stock')}
            >
              {t('inventory.viewAllLowStock')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
