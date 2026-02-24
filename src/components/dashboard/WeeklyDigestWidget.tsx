import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CalendarDays, 
  TrendingUp, 
  TrendingDown,
  Package,
  Truck,
  RotateCcw,
  ChevronRight,
  Sparkles,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { cn } from '@/lib/utils';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { de, enUS, fr, it, es, type Locale } from 'date-fns/locale';

interface WeeklyStats {
  ordersThisWeek: number;
  ordersLastWeek: number;
  shippedThisWeek: number;
  shippedLastWeek: number;
  returnsThisWeek: number;
  returnsLastWeek: number;
  avgProcessingTime: number;
  slaCompliance: number;
  topHighlight: string;
}

export function WeeklyDigestWidget() {
  const { t, language } = useLanguage();
  const effectiveCompanyId = useEffectiveCompanyId();
  const [expanded, setExpanded] = useState(false);

  const getDateLocale = () => {
    const locales: Record<string, Locale> = { de, en: enUS, fr, it, es };
    return locales[language] || de;
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ['weekly-digest', effectiveCompanyId],
    queryFn: async (): Promise<WeeklyStats> => {
      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const lastWeekStart = subDays(thisWeekStart, 7);
      const lastWeekEnd = subDays(thisWeekEnd, 7);

      // Query this week's orders
      let thisWeekQuery = supabase
        .from('orders')
        .select('status, order_date', { count: 'exact' })
        .gte('order_date', thisWeekStart.toISOString())
        .lte('order_date', thisWeekEnd.toISOString());

      let lastWeekQuery = supabase
        .from('orders')
        .select('status, order_date', { count: 'exact' })
        .gte('order_date', lastWeekStart.toISOString())
        .lte('order_date', lastWeekEnd.toISOString());

      if (effectiveCompanyId) {
        thisWeekQuery = thisWeekQuery.eq('company_id', effectiveCompanyId);
        lastWeekQuery = lastWeekQuery.eq('company_id', effectiveCompanyId);
      }

      const [thisWeekResult, lastWeekResult] = await Promise.all([
        thisWeekQuery,
        lastWeekQuery
      ]);

      const thisWeekOrders = thisWeekResult.data || [];
      const lastWeekOrders = lastWeekResult.data || [];

      const shippedThisWeek = thisWeekOrders.filter(o => 
        o.status === 'shipped' || o.status === 'delivered'
      ).length;
      const shippedLastWeek = lastWeekOrders.filter(o => 
        o.status === 'shipped' || o.status === 'delivered'
      ).length;

      // Get returns
      let returnsThisWeekQuery = supabase
        .from('returns')
        .select('*', { count: 'exact' })
        .gte('return_date', thisWeekStart.toISOString())
        .lte('return_date', thisWeekEnd.toISOString());

      let returnsLastWeekQuery = supabase
        .from('returns')
        .select('*', { count: 'exact' })
        .gte('return_date', lastWeekStart.toISOString())
        .lte('return_date', lastWeekEnd.toISOString());

      if (effectiveCompanyId) {
        returnsThisWeekQuery = returnsThisWeekQuery.eq('company_id', effectiveCompanyId);
        returnsLastWeekQuery = returnsLastWeekQuery.eq('company_id', effectiveCompanyId);
      }

      const [returnsThisWeek, returnsLastWeek] = await Promise.all([
        returnsThisWeekQuery,
        returnsLastWeekQuery
      ]);

      // Calculate highlight
      const orderGrowth = thisWeekOrders.length - lastWeekOrders.length;
      const shippedGrowth = shippedThisWeek - shippedLastWeek;
      
      let topHighlight = '';
      if (shippedGrowth > 10) {
        topHighlight = `+${shippedGrowth} ${t('weeklyDigest.moreShipments')}`;
      } else if (orderGrowth > 5) {
        topHighlight = `+${orderGrowth} ${t('weeklyDigest.moreOrders')}`;
      } else if ((returnsThisWeek.count || 0) < (returnsLastWeek.count || 0)) {
        topHighlight = t('weeklyDigest.fewerReturns');
      } else {
        topHighlight = t('weeklyDigest.stableWeek');
      }

      return {
        ordersThisWeek: thisWeekOrders.length,
        ordersLastWeek: lastWeekOrders.length,
        shippedThisWeek,
        shippedLastWeek,
        returnsThisWeek: returnsThisWeek.count || 0,
        returnsLastWeek: returnsLastWeek.count || 0,
        avgProcessingTime: 1.8, // Placeholder - would come from order_events
        slaCompliance: 94.5, // Placeholder
        topHighlight
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const getTrendIcon = (current: number, previous: number, lowerIsBetter = false) => {
    const improved = lowerIsBetter ? current < previous : current > previous;
    if (current === previous) return null;
    return improved ? (
      <TrendingUp className="h-3.5 w-3.5 text-status-shipped" />
    ) : (
      <TrendingDown className="h-3.5 w-3.5 text-status-warning" />
    );
  };

  const getPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${change.toFixed(0)}%`;
  };

  if (isLoading) {
    return (
      <Card className="shadow-card border-border">
        <CardHeader className="pb-3">
          <div className="h-5 w-32 bg-muted animate-shimmer rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted animate-shimmer rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card border-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
              <CalendarDays className="h-4 w-4 text-blue-500" />
            </div>
            {t('weeklyDigest.title')}
          </CardTitle>
          <Badge variant="secondary" className="text-xs font-normal">
            KW {format(new Date(), 'w', { locale: getDateLocale() })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Highlight Banner */}
        {stats?.topHighlight && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20">
            <Sparkles className="h-4 w-4 text-accent shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {stats.topHighlight}
            </span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('nav.orders')}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums">
                {stats?.ordersThisWeek || 0}
              </span>
              <span className="flex items-center gap-1 text-xs">
                {getTrendIcon(stats?.ordersThisWeek || 0, stats?.ordersLastWeek || 0)}
                <span className="text-muted-foreground">
                  {getPercentChange(stats?.ordersThisWeek || 0, stats?.ordersLastWeek || 0)}
                </span>
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('status.shipped')}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums">
                {stats?.shippedThisWeek || 0}
              </span>
              <span className="flex items-center gap-1 text-xs">
                {getTrendIcon(stats?.shippedThisWeek || 0, stats?.shippedLastWeek || 0)}
                <span className="text-muted-foreground">
                  {getPercentChange(stats?.shippedThisWeek || 0, stats?.shippedLastWeek || 0)}
                </span>
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t('nav.returns')}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums">
                {stats?.returnsThisWeek || 0}
              </span>
              <span className="flex items-center gap-1 text-xs">
                {getTrendIcon(stats?.returnsThisWeek || 0, stats?.returnsLastWeek || 0, true)}
                <span className="text-muted-foreground">
                  {getPercentChange(stats?.returnsThisWeek || 0, stats?.returnsLastWeek || 0)}
                </span>
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">SLA</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold tabular-nums">
                {stats?.slaCompliance.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Expand for more */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? t('common.showLess') : t('common.showMore')}
          <ChevronRight className={cn(
            "h-4 w-4 ml-1 transition-transform",
            expanded && "rotate-90"
          )} />
        </Button>
      </CardContent>
    </Card>
  );
}
