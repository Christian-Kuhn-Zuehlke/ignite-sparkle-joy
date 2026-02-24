import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Package,
  Truck,
  RefreshCw,
  Sparkles,
  BarChart3,
  Timer,
  Target,
  Zap
} from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ProcessingStage {
  stage: string;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  orderCount: number;
  bottleneckScore: number;
}

interface CarrierPerformance {
  carrier: string;
  orderCount: number;
  avgDeliveryTime: number;
  onTimeRate: number;
}

interface PerformanceMetrics {
  summary: {
    totalOrders: number;
    avgProcessingTime: number;
    onTimeRate: number;
    slaBreaches: number;
    atRiskOrders: number;
  };
  stages: ProcessingStage[];
  carriers: CarrierPerformance[];
  trends: {
    date: string;
    avgProcessingTime: number;
    orderCount: number;
    onTimeRate: number;
  }[];
  bottlenecks: {
    stage: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: string;
    recommendation: string;
  }[];
}

const severityColors = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

export const OrderPerformanceAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { profile, activeCompanyId } = useAuth();
  const { t } = useLanguage();

  const effectiveCompanyId = activeCompanyId === 'ALL' ? profile?.company_id : activeCompanyId;

  const fetchMetrics = async (showRefresh = false) => {
    if (!effectiveCompanyId) return;
    
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('order-performance', {
        body: { 
          companyId: effectiveCompanyId,
          days: 30
        }
      });

      if (error) throw error;

      setMetrics(data.metrics || null);
      setAiSummary(data.aiSummary || null);
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [effectiveCompanyId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t('performance.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Timer className="h-5 w-5" />
            {t('performance.title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('performance.last30Days')}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => fetchMetrics(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* AI Insight */}
      {aiSummary && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm">{aiSummary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('performance.totalOrders')}</p>
                <p className="text-2xl font-bold">{metrics.summary.totalOrders}</p>
              </div>
              <Package className="h-5 w-5 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('performance.avgTime')}</p>
                <p className="text-2xl font-bold">{metrics.summary.avgProcessingTime}h</p>
              </div>
              <Clock className="h-5 w-5 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('performance.onTimeRate')}</p>
                <p className="text-2xl font-bold text-green-600">{metrics.summary.onTimeRate}%</p>
              </div>
              <Target className="h-5 w-5 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('performance.slaBreaches')}</p>
                <p className="text-2xl font-bold text-red-600">{metrics.summary.slaBreaches}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('performance.atRisk')}</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.summary.atRiskOrders}</p>
              </div>
              <Zap className="h-5 w-5 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Processing Time Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t('performance.processingTrend')}
            </CardTitle>
            <CardDescription>{t('performance.avgProcessingByDay')}</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={metrics.trends}>
                  <defs>
                    <linearGradient id="colorProcessing" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(val) => new Date(val).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis tick={{ fontSize: 10 }} unit="h" />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover border rounded-lg p-2 shadow-lg">
                            <p className="text-xs font-medium">{new Date(payload[0].payload.date).toLocaleDateString('de-DE')}</p>
                            <p className="text-xs text-muted-foreground">{payload[0].value}h Durchschnitt</p>
                            <p className="text-xs text-muted-foreground">{payload[0].payload.orderCount} Orders</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgProcessingTime" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorProcessing)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                {t('performance.noTrendData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stage Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              {t('performance.stagePerformance')}
            </CardTitle>
            <CardDescription>{t('performance.avgTimePerStage')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {metrics.stages.map((stage) => (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{stage.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stage.avgDuration}h</span>
                        {stage.bottleneckScore > 0.5 && (
                          <Badge variant="destructive" className="text-[10px] px-1">
                            Bottleneck
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={Math.min(100, (stage.avgDuration / 24) * 100)} 
                        className={cn("h-2 flex-1", stage.bottleneckScore > 0.5 && "[&>div]:bg-orange-500")}
                      />
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {stage.orderCount} Orders
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Carrier Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              {t('performance.carrierPerformance')}
            </CardTitle>
            <CardDescription>{t('performance.deliveryTimeByCarrier')}</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.carriers.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {metrics.carriers.map((carrier, index) => (
                    <div key={carrier.carrier} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{carrier.carrier}</p>
                        <p className="text-xs text-muted-foreground">
                          Ø {carrier.avgDeliveryTime} Tage • {carrier.orderCount} Orders
                        </p>
                      </div>
                      <Badge 
                        variant={carrier.onTimeRate >= 90 ? "default" : carrier.onTimeRate >= 70 ? "secondary" : "destructive"}
                      >
                        {carrier.onTimeRate}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                {t('performance.noCarrierData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottlenecks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t('performance.bottlenecks')}
            </CardTitle>
            <CardDescription>{t('performance.identifiedIssues')}</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.bottlenecks.length > 0 ? (
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {metrics.bottlenecks.map((bottleneck, index) => (
                    <div key={index} className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn("h-2 w-2 rounded-full", severityColors[bottleneck.severity])} />
                        <span className="font-medium text-sm">{bottleneck.stage}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">
                          {bottleneck.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{bottleneck.impact}</p>
                      <p className="text-xs text-primary flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {bottleneck.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm font-medium text-green-600">{t('performance.noBottlenecks')}</p>
                  <p className="text-xs">{t('performance.allStagesOptimal')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
