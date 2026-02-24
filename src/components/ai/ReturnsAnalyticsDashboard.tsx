import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RotateCcw, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Package,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReturnsData {
  overview: {
    totalReturns: number;
    returnRate: number;
    totalOrders: number;
    trend: 'up' | 'down' | 'stable';
    previousRate: number;
  };
  topItems: {
    sku: string;
    name: string;
    returnCount: number;
    returnRate: number;
  }[];
  byStatus: {
    status: string;
    count: number;
  }[];
  reasons: {
    reason: string;
    count: number;
    percentage: number;
  }[];
}

export const ReturnsAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<ReturnsData | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { profile, activeCompanyId } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const effectiveCompanyId = activeCompanyId === 'ALL' ? profile?.company_id : activeCompanyId;

  const fetchReturnsData = async (showRefresh = false) => {
    if (!effectiveCompanyId) return;
    
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Current period
      const { count: currentReturns } = await supabase
        .from('returns')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', effectiveCompanyId)
        .gte('return_date', thirtyDaysAgo.toISOString().split('T')[0]);

      const { count: currentOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', effectiveCompanyId)
        .gte('order_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Previous period
      const { count: previousReturns } = await supabase
        .from('returns')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', effectiveCompanyId)
        .gte('return_date', sixtyDaysAgo.toISOString().split('T')[0])
        .lt('return_date', thirtyDaysAgo.toISOString().split('T')[0]);

      const { count: previousOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', effectiveCompanyId)
        .gte('order_date', sixtyDaysAgo.toISOString().split('T')[0])
        .lt('order_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Returns by status
      const { data: returnsByStatus } = await supabase
        .from('returns')
        .select('status')
        .eq('company_id', effectiveCompanyId)
        .gte('return_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Top returned items from return_lines
      const { data: returnLines } = await supabase
        .from('return_lines')
        .select('sku, name, quantity, return_id, returns!inner(company_id, return_date)')
        .eq('returns.company_id', effectiveCompanyId)
        .gte('returns.return_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Group return lines by SKU
      const itemStats = new Map<string, { sku: string; name: string; count: number }>();
      returnLines?.forEach(line => {
        const existing = itemStats.get(line.sku) || { sku: line.sku, name: line.name, count: 0 };
        existing.count += line.quantity;
        itemStats.set(line.sku, existing);
      });

      const topItems = Array.from(itemStats.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(item => ({
          sku: item.sku,
          name: item.name,
          returnCount: item.count,
          returnRate: 0 // Would need order line data to calculate
        }));

      // Group by status
      const statusCounts = new Map<string, number>();
      returnsByStatus?.forEach(r => {
        statusCounts.set(r.status, (statusCounts.get(r.status) || 0) + 1);
      });
      const byStatus = Array.from(statusCounts.entries()).map(([status, count]) => ({ status, count }));

      // Reasons (from reason field if available)
      const { data: returnsWithReason } = await supabase
        .from('returns')
        .select('reason')
        .eq('company_id', effectiveCompanyId)
        .gte('return_date', thirtyDaysAgo.toISOString().split('T')[0])
        .not('reason', 'is', null);

      const reasonCounts = new Map<string, number>();
      returnsWithReason?.forEach(r => {
        if (r.reason) {
          reasonCounts.set(r.reason, (reasonCounts.get(r.reason) || 0) + 1);
        }
      });
      const totalWithReason = returnsWithReason?.length || 0;
      const reasons = Array.from(reasonCounts.entries())
        .map(([reason, count]) => ({
          reason,
          count,
          percentage: totalWithReason > 0 ? (count / totalWithReason) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate rates and trends
      const currentRate = currentOrders && currentOrders > 0 ? ((currentReturns || 0) / currentOrders) * 100 : 0;
      const previousRate = previousOrders && previousOrders > 0 ? ((previousReturns || 0) / previousOrders) * 100 : 0;
      const trend = currentRate > previousRate * 1.1 ? 'up' : currentRate < previousRate * 0.9 ? 'down' : 'stable';

      setData({
        overview: {
          totalReturns: currentReturns || 0,
          returnRate: currentRate,
          totalOrders: currentOrders || 0,
          trend,
          previousRate
        },
        topItems,
        byStatus,
        reasons
      });

      // Generate AI insight
      if (currentReturns && currentReturns > 0) {
        const { data: aiData } = await supabase.functions.invoke('fulfillment-ai', {
          body: {
            messages: [
              { 
                role: 'user', 
                content: `Analysiere unsere Retouren-Daten: ${currentReturns} Retouren bei ${currentOrders} Bestellungen (${currentRate.toFixed(1)}% Retourenquote). Top-Retouren-Artikel: ${topItems.slice(0, 3).map(i => i.name).join(', ')}. Gib eine kurze Empfehlung (2 Sätze).`
              }
            ],
            companyId: effectiveCompanyId
          }
        });
        if (aiData?.response) {
          setAiInsight(aiData.response.slice(0, 200));
        }
      }
    } catch (error) {
      console.error('Error fetching returns data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReturnsData();
  }, [effectiveCompanyId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {t('returns.analytics')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t('returns.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = data.overview.trend === 'up' ? TrendingUp : data.overview.trend === 'down' ? TrendingDown : Minus;
  const trendColor = data.overview.trend === 'up' ? 'text-red-500' : data.overview.trend === 'down' ? 'text-green-500' : 'text-muted-foreground';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {t('returns.analytics')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('returns.last30Days')}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchReturnsData(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm">{aiInsight}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('returns.totalReturns')}</p>
                <p className="text-2xl font-bold">{data.overview.totalReturns}</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <RotateCcw className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('returns.returnRate')}</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{data.overview.returnRate.toFixed(1)}%</p>
                  <TrendIcon className={cn("h-4 w-4", trendColor)} />
                </div>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('returns.previous')}: {data.overview.previousRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('returns.totalOrders')}</p>
                <p className="text-2xl font-bold">{data.overview.totalOrders}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('returns.trend')}</p>
                <Badge variant={data.overview.trend === 'up' ? 'destructive' : data.overview.trend === 'down' ? 'default' : 'secondary'}>
                  {data.overview.trend === 'up' ? t('returns.increasing') : data.overview.trend === 'down' ? t('returns.decreasing') : t('returns.stable')}
                </Badge>
              </div>
              <TrendIcon className={cn("h-6 w-6", trendColor)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Top Returned Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t('returns.topReturnedItems')}
            </CardTitle>
            <CardDescription>{t('returns.itemsWithMostReturns')}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('returns.noReturnedItems')}</p>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {data.topItems.map((item, index) => (
                    <div key={item.sku} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-orange-500/10 text-orange-600 text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                      </div>
                      <Badge variant="secondary">{item.returnCount}x</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* By Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {t('returns.byStatus')}
            </CardTitle>
            <CardDescription>{t('returns.currentStatusDistribution')}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('returns.noStatusData')}</p>
            ) : (
              <div className="space-y-3">
                {data.byStatus.map((status) => {
                  const total = data.byStatus.reduce((sum, s) => sum + s.count, 0);
                  const percentage = total > 0 ? (status.count / total) * 100 : 0;
                  return (
                    <div key={status.status} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{status.status}</span>
                        <span className="font-medium">{status.count}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <Card>
        <CardContent className="py-4">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/returns')}
          >
            {t('returns.viewAllReturns')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
