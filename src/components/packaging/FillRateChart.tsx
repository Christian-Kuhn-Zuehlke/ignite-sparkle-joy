import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePackagingMetrics } from '@/hooks/usePackagingIntelligence';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { TrendingUp } from '@/components/icons';

interface FillRateChartProps {
  days?: number;
}

export function FillRateChart({ days = 30 }: FillRateChartProps) {
  const { data: metrics, isLoading } = usePackagingMetrics(days);
  const { language, t } = useLanguage();

  const locale = language === 'de' ? de : enUS;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('packaging.fillRateTrend')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = metrics?.map((m) => ({
    date: format(parseISO(m.metric_date), 'dd.MM', { locale }),
    fillRate: m.avg_fill_rate_percent || 0,
    overpackaged: m.overpackaged_count,
    underpackaged: m.underpackaged_count,
    shipments: m.total_shipments,
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          {t('packaging.fillRateTrend')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            {t('common.noData')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis yAxisId="left" domain={[0, 100]} className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="fillRate"
                name={t('packaging.avgFillRate')}
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.2)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="overpackaged"
                name={t('packaging.overpackaged')}
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="underpackaged"
                name={t('packaging.underpackaged')}
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
