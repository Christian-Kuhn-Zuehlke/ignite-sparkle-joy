import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown,
  Package,
  RotateCcw,
  Boxes,
  RefreshCw,
  Sparkles,
  AlertTriangle
} from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface ForecastData {
  orders: { date: string; actual: number; predicted?: number }[];
  inventory: { sku: string; name: string; current: number; predictedDemand: number; daysUntilStockout: number | null; recommendation: string }[];
  returns: { date: string; actual: number; predicted?: number }[];
  insights: string;
}

export const AIForecastWidget: React.FC = () => {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const fetchForecast = async (showRefresh = false) => {
    if (!profile?.company_id) return;
    
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-forecast', {
        body: { companyId: profile.company_id, language }
      });

      if (error) throw error;
      setForecast(data);
    } catch (error) {
      console.error('Error fetching forecast:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [profile?.company_id, language]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = language === 'de' ? 'de-CH' : language === 'fr' ? 'fr-CH' : language === 'it' ? 'it-CH' : language === 'es' ? 'es-ES' : 'en-GB';
    return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  };

  const getRecommendationColor = (rec: string) => {
    // Works for all languages
    const urgentKeywords = ['Dringend', 'urgently', 'urgemment', 'urgente', '¡Reordenar urgente'];
    const soonKeywords = ['Bald', 'soon', 'bientôt', 'presto', 'pronto'];
    const watchKeywords = ['Auge', 'eye', 'surveiller', 'occhio', 'Vigilar'];
    
    if (urgentKeywords.some(k => rec.includes(k))) return 'destructive';
    if (soonKeywords.some(k => rec.includes(k))) return 'outline';
    if (watchKeywords.some(k => rec.includes(k))) return 'secondary';
    return 'secondary';
  };

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            AI Forecasting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!forecast) return null;

  // Calculate trend from forecast data
  const ordersPredicted = forecast.orders.filter(o => o.predicted !== undefined && o.predicted > 0);
  const ordersHistorical = forecast.orders.filter(o => o.actual > 0);
  const avgHistorical = ordersHistorical.length > 0 
    ? ordersHistorical.reduce((a, b) => a + b.actual, 0) / ordersHistorical.length 
    : 0;
  const avgPredicted = ordersPredicted.length > 0 
    ? ordersPredicted.reduce((a, b) => a + (b.predicted || 0), 0) / ordersPredicted.length 
    : 0;
  // Only show trend if we have both historical AND predicted data
  const orderTrend = (avgHistorical > 0 && avgPredicted > 0) 
    ? ((avgPredicted - avgHistorical) / avgHistorical * 100) 
    : null;

  const criticalItems = forecast.inventory.filter(i => i.daysUntilStockout !== null && i.daysUntilStockout <= 14);

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t('widgets.aiForecast')}
            <Badge variant="secondary" className="ml-2">{t('widgets.7dayForecast')}</Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => fetchForecast(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* AI Insights */}
        {forecast.insights && (
          <div className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm mb-1">{t('widgets.aiAnalysis')}</p>
                <p className="text-sm text-muted-foreground">{forecast.insights}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats - Clickable */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button 
            onClick={() => navigate('/orders')}
            className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{t('widgets.orderTrend')}</span>
            </div>
            <div className="flex items-center gap-2">
              {orderTrend !== null ? (
                <>
                  <span className="text-2xl font-bold">
                    {orderTrend > 0 ? '+' : ''}{orderTrend.toFixed(0)}%
                  </span>
                  {orderTrend > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : orderTrend < 0 ? (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  ) : null}
                </>
              ) : (
                <span className="text-lg text-muted-foreground">–</span>
              )}
            </div>
          </button>

          <button 
            onClick={() => {
              // Pass critical SKUs as query parameter for precise filtering
              const criticalSkus = criticalItems.map(i => i.sku).join(',');
              navigate(`/inventory?filter=critical&skus=${encodeURIComponent(criticalSkus)}`);
            }}
            className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Boxes className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">{t('widgets.criticalItems')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{criticalItems.length}</span>
              {criticalItems.length > 0 && (
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              )}
            </div>
          </button>

          <button 
            onClick={() => navigate('/returns')}
            className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <RotateCcw className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">{t('widgets.expectedReturns')}</span>
            </div>
            <span className="text-2xl font-bold">
              {forecast.returns.filter(r => r.predicted).reduce((a, b) => a + (b.predicted || 0), 0)}
            </span>
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" />
              {t('nav.orders')}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <Boxes className="h-4 w-4" />
              {t('nav.inventory')}
            </TabsTrigger>
            <TabsTrigger value="returns" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {t('nav.returns')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast.orders}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={formatDate}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#colorActual)"
                    name="Ist"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="hsl(var(--accent))" 
                    fill="url(#colorPredicted)"
                    strokeDasharray="5 5"
                    name="Prognose"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>{t('widgets.actualValues')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span>{t('widgets.forecast')}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="inventory">
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
              {forecast.inventory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('widgets.noInventoryData')}
                </p>
              ) : (
                forecast.inventory.map((item) => (
                  <div 
                    key={item.sku}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">{item.current} {t('widgets.pcs')}</p>
                        {item.daysUntilStockout !== null && (
                          <p className="text-xs text-muted-foreground">
                            ~{item.daysUntilStockout} {t('greeting.days')}
                          </p>
                        )}
                      </div>
                      <Badge variant={getRecommendationColor(item.recommendation) as any}>
                        {item.recommendation}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="returns">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast.returns}>
                  <defs>
                    <linearGradient id="colorReturnsActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorReturnsPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelFormatter={formatDate}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="hsl(var(--destructive))" 
                    fill="url(#colorReturnsActual)"
                    name="Ist"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="#f97316" 
                    fill="url(#colorReturnsPredicted)"
                    strokeDasharray="5 5"
                    name="Prognose"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
