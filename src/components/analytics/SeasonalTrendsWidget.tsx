import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp, Calendar, ArrowUp, ArrowDown, Minus } from '@/components/icons';

interface MonthlyData {
  month: string;
  monthNum: number;
  currentYear: number;
  previousYear: number;
  currentRevenue: number;
  previousRevenue: number;
  yoyGrowth: number;
}

export function SeasonalTrendsWidget() {
  const { t } = useLanguage();
  const effectiveCompanyId = useEffectiveCompanyId();
  const [viewType, setViewType] = useState<'orders' | 'revenue'>('orders');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['seasonal-trends', effectiveCompanyId],
    queryFn: async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const previousYear = currentYear - 1;

      // Fetch orders for current and previous year
      let currentYearQuery = supabase
        .from('orders')
        .select('id, order_date, order_amount')
        .gte('order_date', `${currentYear}-01-01`)
        .lte('order_date', `${currentYear}-12-31`);

      let previousYearQuery = supabase
        .from('orders')
        .select('id, order_date, order_amount')
        .gte('order_date', `${previousYear}-01-01`)
        .lte('order_date', `${previousYear}-12-31`);

      if (effectiveCompanyId) {
        currentYearQuery = currentYearQuery.eq('company_id', effectiveCompanyId);
        previousYearQuery = previousYearQuery.eq('company_id', effectiveCompanyId);
      }

      const [currentResult, previousResult] = await Promise.all([
        currentYearQuery,
        previousYearQuery,
      ]);

      const currentOrders = currentResult.data || [];
      const previousOrders = previousResult.data || [];

      // Aggregate by month
      const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      const monthlyData: MonthlyData[] = months.map((month, index) => {
        const monthNum = index + 1;
        
        const currentMonthOrders = currentOrders.filter(o => {
          const orderMonth = new Date(o.order_date).getMonth() + 1;
          return orderMonth === monthNum;
        });
        
        const previousMonthOrders = previousOrders.filter(o => {
          const orderMonth = new Date(o.order_date).getMonth() + 1;
          return orderMonth === monthNum;
        });

        const currentCount = currentMonthOrders.length;
        const previousCount = previousMonthOrders.length;
        const currentRevenue = currentMonthOrders.reduce((sum, o) => sum + (o.order_amount || 0), 0);
        const previousRevenue = previousMonthOrders.reduce((sum, o) => sum + (o.order_amount || 0), 0);

        const yoyGrowth = previousCount > 0 
          ? ((currentCount - previousCount) / previousCount) * 100 
          : currentCount > 0 ? 100 : 0;

        return {
          month,
          monthNum,
          currentYear: currentCount,
          previousYear: previousCount,
          currentRevenue,
          previousRevenue,
          yoyGrowth,
        };
      });

      // Calculate summary stats (only for completed months)
      const currentMonth = now.getMonth();
      const completedMonths = monthlyData.slice(0, currentMonth);
      
      const totalCurrentOrders = completedMonths.reduce((sum, m) => sum + m.currentYear, 0);
      const totalPreviousOrders = completedMonths.reduce((sum, m) => sum + m.previousYear, 0);
      const totalCurrentRevenue = completedMonths.reduce((sum, m) => sum + m.currentRevenue, 0);
      const totalPreviousRevenue = completedMonths.reduce((sum, m) => sum + m.previousRevenue, 0);

      const ytdOrderGrowth = totalPreviousOrders > 0 
        ? ((totalCurrentOrders - totalPreviousOrders) / totalPreviousOrders) * 100 
        : 0;
      const ytdRevenueGrowth = totalPreviousRevenue > 0 
        ? ((totalCurrentRevenue - totalPreviousRevenue) / totalPreviousRevenue) * 100 
        : 0;

      // Find peak months
      const peakCurrentMonth = [...completedMonths].sort((a, b) => b.currentYear - a.currentYear)[0];
      const peakPreviousMonth = monthlyData.reduce((max, m) => m.previousYear > max.previousYear ? m : max, monthlyData[0]);

      return {
        monthlyData,
        summary: {
          ytdOrderGrowth,
          ytdRevenueGrowth,
          totalCurrentOrders,
          totalPreviousOrders,
          totalCurrentRevenue,
          totalPreviousRevenue,
          peakCurrentMonth: peakCurrentMonth?.month || '-',
          peakPreviousMonth: peakPreviousMonth?.month || '-',
          currentYear,
          previousYear,
        },
      };
    },
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('seasonal.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('seasonal.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">{t('common.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const GrowthIndicator = ({ value }: { value: number }) => {
    if (value > 5) return <ArrowUp className="h-4 w-4 text-emerald-500" />;
    if (value < -5) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const chartData = data.monthlyData.map(m => ({
    ...m,
    currentValue: viewType === 'orders' ? m.currentYear : m.currentRevenue,
    previousValue: viewType === 'orders' ? m.previousYear : m.previousRevenue,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {t('seasonal.title')}
          </div>
          <Select value={viewType} onValueChange={(v) => setViewType(v as 'orders' | 'revenue')}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="orders">{t('seasonal.orders')}</SelectItem>
              <SelectItem value="revenue">{t('seasonal.revenue')}</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* YTD Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{t('seasonal.ytdOrders')}</span>
              <GrowthIndicator value={data.summary.ytdOrderGrowth} />
            </div>
            <p className="text-lg font-bold">{data.summary.totalCurrentOrders.toLocaleString()}</p>
            <p className={`text-xs ${data.summary.ytdOrderGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {data.summary.ytdOrderGrowth >= 0 ? '+' : ''}{data.summary.ytdOrderGrowth.toFixed(1)}% {t('seasonal.vsLastYear')}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{t('seasonal.ytdRevenue')}</span>
              <GrowthIndicator value={data.summary.ytdRevenueGrowth} />
            </div>
            <p className="text-lg font-bold">CHF {(data.summary.totalCurrentRevenue / 1000).toFixed(0)}k</p>
            <p className={`text-xs ${data.summary.ytdRevenueGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {data.summary.ytdRevenueGrowth >= 0 ? '+' : ''}{data.summary.ytdRevenueGrowth.toFixed(1)}% {t('seasonal.vsLastYear')}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t('seasonal.peakMonth')} {data.summary.currentYear}</span>
            </div>
            <p className="text-lg font-bold">{data.summary.peakCurrentMonth}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('seasonal.peakMonth')} {data.summary.previousYear}</span>
            </div>
            <p className="text-lg font-bold">{data.summary.peakPreviousMonth}</p>
          </div>
        </div>

        {/* Year-over-Year Comparison Chart */}
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px' 
                }}
                formatter={(value: number) => [
                  viewType === 'revenue' ? `CHF ${value.toLocaleString()}` : value,
                ]}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="currentValue" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary) / 0.2)"
                strokeWidth={2}
                name={`${data.summary.currentYear}`}
              />
              <Area 
                type="monotone" 
                dataKey="previousValue" 
                stroke="hsl(var(--muted-foreground))" 
                fill="hsl(var(--muted) / 0.3)"
                strokeWidth={2}
                strokeDasharray="5 5"
                name={`${data.summary.previousYear}`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Growth by Month */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">{t('seasonal.monthlyGrowth')}</h4>
          <div className="flex flex-wrap gap-2">
            {data.monthlyData.slice(0, new Date().getMonth()).map((m) => (
              <Badge 
                key={m.month} 
                variant={m.yoyGrowth > 0 ? 'default' : m.yoyGrowth < 0 ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {m.month}: {m.yoyGrowth >= 0 ? '+' : ''}{m.yoyGrowth.toFixed(0)}%
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
