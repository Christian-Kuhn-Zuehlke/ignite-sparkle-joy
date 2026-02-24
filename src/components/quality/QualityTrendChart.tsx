import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3 } from '@/components/icons';
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface QualityTrendChartProps {
  data: Array<{ date: string; errors: number; score: number }>;
}

export function QualityTrendChart({ data }: QualityTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Qualitätstrend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Keine Trenddaten verfügbar</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate trend
  const recentData = data.slice(-7);
  const olderData = data.slice(-14, -7);
  
  const recentAvgScore = recentData.length > 0 
    ? recentData.reduce((sum, d) => sum + d.score, 0) / recentData.length 
    : 0;
  const olderAvgScore = olderData.length > 0 
    ? olderData.reduce((sum, d) => sum + d.score, 0) / olderData.length 
    : recentAvgScore;
  
  const scoreTrend = recentAvgScore - olderAvgScore;
  const isImproving = scoreTrend > 0;
  
  const formattedData = data.map(item => ({
    ...item,
    dateFormatted: format(parseISO(item.date), 'dd. MMM', { locale: de })
  }));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Qualitätstrend (30 Tage)
          </span>
          <Badge variant={isImproving ? "default" : "destructive"} className="text-xs">
            {isImproving ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {isImproving ? '+' : ''}{scoreTrend.toFixed(1)}% Score
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={formattedData}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="score"
                name="Qualitäts-Score"
                stroke="hsl(var(--primary))"
                fill="url(#scoreGradient)"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="errors"
                name="Fehleranzahl"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">
              {recentAvgScore.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Ø Score (7 Tage)</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">
              {data.reduce((sum, d) => sum + d.errors, 0)}
            </div>
            <div className="text-xs text-muted-foreground">Gesamt Fehler</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">
              {(data.reduce((sum, d) => sum + d.errors, 0) / Math.max(data.length, 1)).toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Ø Fehler/Tag</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
