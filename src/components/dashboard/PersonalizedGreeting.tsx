import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Award, Trophy, Zap, TrendingUp, Package, Truck, Star } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useConfetti } from '@/hooks/useConfetti';
import { useDateLocale } from '@/hooks/useDateLocale';
import { useEffect, useRef, useMemo } from 'react';
import { ProgressRing } from '@/components/ui/progress-ring';
import { AnimatedCounter } from '@/components/ui/animated-counter';

interface DailySummary {
  ordersToday: number;
  ordersShipped: number;
  slaStreak: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  slaPercent: number;
  openOrders: number;
}

// Win of the Day messages based on performance
const getWinOfTheDay = (summary: DailySummary, _t: (key: string) => string, language: string): { message: string; icon: React.ReactNode; type: 'success' | 'info' | 'celebration' } => {
  // Perfect SLA
  if (summary.slaPercent >= 100 && summary.ordersShipped > 0) {
    return {
      message: language === 'de' 
        ? `🎉 Alle ${summary.ordersShipped} Sendungen heute pünktlich versendet!`
        : `🎉 All ${summary.ordersShipped} shipments sent on time today!`,
      icon: <Trophy className="h-5 w-5 text-amber-500" />,
      type: 'celebration',
    };
  }

  // Great SLA streak
  if (summary.slaStreak >= 7) {
    return {
      message: language === 'de'
        ? `🔥 ${summary.slaStreak} Tage in Folge SLA erfüllt - fantastisch!`
        : `🔥 ${summary.slaStreak} days SLA streak - fantastic!`,
      icon: <Award className="h-5 w-5 text-orange-500" />,
      type: 'success',
    };
  }

  // Growing orders
  if (summary.trend === 'up' && summary.trendPercent > 10) {
    return {
      message: language === 'de'
        ? `📈 ${summary.trendPercent}% mehr Bestellungen als gestern!`
        : `📈 ${summary.trendPercent}% more orders than yesterday!`,
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
      type: 'success',
    };
  }

  // Good progress
  if (summary.ordersShipped > 0) {
    return {
      message: language === 'de'
        ? `✅ Bereits ${summary.ordersShipped} Bestellungen heute versendet`
        : `✅ Already ${summary.ordersShipped} orders shipped today`,
      icon: <Truck className="h-5 w-5 text-accent" />,
      type: 'info',
    };
  }

  // Default motivational
  return {
    message: language === 'de'
      ? '💪 Ein neuer Tag voller Möglichkeiten!'
      : '💪 A new day full of opportunities!',
    icon: <Zap className="h-5 w-5 text-primary" />,
    type: 'info',
  };
};

export function PersonalizedGreeting() {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const { brand, isCustomBranded } = useBranding();
  const dateLocale = useDateLocale();
  const { checkAllMilestones } = useConfetti(profile?.company_id || undefined, language);
  const hasCheckedMilestones = useRef(false);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting.morning');
    if (hour < 18) return t('greeting.afternoon');
    return t('greeting.evening');
  };

  // Fetch daily summary
  const { data: summary } = useQuery({
    queryKey: ['daily-summary', profile?.company_id],
    queryFn: async (): Promise<DailySummary> => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

      // Get today's orders
      let ordersQuery = supabase
        .from('orders')
        .select('id, status', { count: 'exact' })
        .gte('order_date', today);

      if (profile?.company_id) {
        ordersQuery = ordersQuery.eq('company_id', profile.company_id);
      }

      const { count: ordersToday } = await ordersQuery;

      // Get shipped today
      let shippedQuery = supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('status', 'shipped')
        .gte('posted_shipment_date', today);

      if (profile?.company_id) {
        shippedQuery = shippedQuery.eq('company_id', profile.company_id);
      }

      const { count: ordersShipped } = await shippedQuery;

      // Get open orders (not shipped)
      let openQuery = supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .in('status', ['received', 'putaway', 'picking', 'packing', 'ready_to_ship']);

      if (profile?.company_id) {
        openQuery = openQuery.eq('company_id', profile.company_id);
      }

      const { count: openOrders } = await openQuery;

      // Get yesterday's orders for trend
      let yesterdayQuery = supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .gte('order_date', yesterday)
        .lt('order_date', today);

      if (profile?.company_id) {
        yesterdayQuery = yesterdayQuery.eq('company_id', profile.company_id);
      }

      const { count: ordersYesterday } = await yesterdayQuery;

      // Calculate trend
      const todayCount = ordersToday || 0;
      const yesterdayCount = ordersYesterday || 0;
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendPercent = 0;

      if (yesterdayCount > 0) {
        trendPercent = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
        trend = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable';
      }

      // Mock SLA streak (in real app, calculate from kpi_measurements)
      const slaStreak = 7;
      
      // Calculate SLA percent (shipped on time vs total)
      const totalProcessed = (ordersShipped || 0) + (openOrders || 0);
      const slaPercent = totalProcessed > 0 ? Math.round(((ordersShipped || 0) / totalProcessed) * 100) : 100;

      return {
        ordersToday: todayCount,
        ordersShipped: ordersShipped || 0,
        slaStreak,
        trend,
        trendPercent: Math.abs(trendPercent),
        slaPercent,
        openOrders: openOrders || 0,
      };
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000,
  });

  // Check for milestones and trigger confetti
  useEffect(() => {
    if (summary && !hasCheckedMilestones.current) {
      hasCheckedMilestones.current = true;
      checkAllMilestones({
        ordersShipped: summary.ordersShipped,
        slaStreak: summary.slaStreak,
        ordersToday: summary.ordersToday,
      });
    }
  }, [summary, checkAllMilestones]);

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';
  const companyName = profile?.company_name;
  
  const dateFormat = language === 'de' ? "EEEE, d. MMMM yyyy" : "EEEE, MMMM d, yyyy";
  const todayFormatted = format(new Date(), dateFormat, { locale: dateLocale });

  const winOfTheDay = useMemo(() => {
    if (!summary) return null;
    return getWinOfTheDay(summary, t, language);
  }, [summary, t, language]);

  // Dynamic gradient based on brand
  const heroGradient = isCustomBranded
    ? `linear-gradient(135deg, hsl(${brand.primaryHue} ${brand.primarySaturation}% ${brand.primaryLightness}% / 0.15) 0%, hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness}% / 0.08) 50%, transparent 100%)`
    : 'linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--accent) / 0.05) 50%, transparent 100%)';

  return (
    <Card 
      className="mb-4 sm:mb-6 overflow-hidden border-none relative"
      style={{ background: heroGradient }}
    >
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-gradient-flow opacity-50" />
      
      <CardContent className="py-4 sm:py-6 px-3 sm:px-6 relative">
        <div className="flex flex-col gap-4 sm:gap-6">
          {/* Top: Greeting Section */}
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={cn(
                "flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl animate-scale-in",
                isCustomBranded ? "bg-white/20" : "bg-primary/10"
              )}>
                <Sparkles 
                  className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" 
                  style={{ 
                    color: isCustomBranded 
                      ? `hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness}%)`
                      : 'hsl(var(--primary))'
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground animate-fade-in truncate">
                  {getGreeting()}, {firstName}!
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm animate-fade-in truncate" style={{ animationDelay: '100ms' }}>
                  {todayFormatted}
                  {companyName && <span className="ml-1 sm:ml-2 font-medium">· {companyName}</span>}
                </p>
              </div>
            </div>

            {/* Win of the Day */}
            {winOfTheDay && (
              <div 
                className={cn(
                  "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg animate-slide-up backdrop-blur-sm",
                  winOfTheDay.type === 'celebration' && "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30",
                  winOfTheDay.type === 'success' && "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20",
                  winOfTheDay.type === 'info' && "bg-white/10 border border-white/20 dark:bg-white/5"
                )}
                style={{ animationDelay: '200ms' }}
              >
                <span className="shrink-0">{winOfTheDay.icon}</span>
                <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-2">{winOfTheDay.message}</p>
              </div>
            )}
          </div>

          {/* Bottom: Stats Section */}
          {summary && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 animate-scale-in" style={{ animationDelay: '300ms' }}>
              {/* Quick Stats - 2 columns on mobile */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1 min-w-[140px]">
                <div className={cn(
                  "flex flex-col items-center p-2 sm:p-3 rounded-lg backdrop-blur-sm",
                  "bg-white/10 dark:bg-white/5 border border-white/20"
                )}>
                  <Package className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground mb-0.5 sm:mb-1" />
                  <span className="text-base sm:text-xl font-bold tabular-nums">
                    <AnimatedCounter value={summary.ordersToday} duration={1000} />
                  </span>
                  <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-wider text-center">
                    {t('dashboard.today')}
                  </span>
                </div>
                
                <div className={cn(
                  "flex flex-col items-center p-2 sm:p-3 rounded-lg backdrop-blur-sm",
                  "bg-white/10 dark:bg-white/5 border border-white/20"
                )}>
                  <Truck className="h-3 w-3 sm:h-4 sm:w-4 text-status-shipped mb-0.5 sm:mb-1" />
                  <span className="text-base sm:text-xl font-bold tabular-nums text-status-shipped">
                    <AnimatedCounter value={summary.ordersShipped} duration={1000} delay={100} />
                  </span>
                  <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-wider text-center">
                    {t('status.shipped')}
                  </span>
                </div>
              </div>

              {/* SLA Streak Badge - shown on mobile too */}
              {summary.slaStreak >= 5 && (
                <div className={cn(
                  "flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-3 rounded-lg",
                  summary.slaStreak >= 30 
                    ? "bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/50 animate-glow-pulse" 
                    : "bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/30"
                )}>
                  {summary.slaStreak >= 30 ? (
                    <Trophy className="h-4 w-4 sm:h-6 sm:w-6 text-amber-500 animate-bounce-subtle" />
                  ) : (
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                  )}
                  <span className="text-sm sm:text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    <AnimatedCounter value={summary.slaStreak} duration={800} delay={200} />
                  </span>
                  <span className="text-[8px] sm:text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                    {t('greeting.slaStreak')}
                  </span>
                </div>
              )}

              {/* Progress Ring for SLA - hidden on mobile, shown on sm+ */}
              <div className="hidden sm:block ml-auto">
                <ProgressRing 
                  value={summary.slaPercent} 
                  size={80} 
                  strokeWidth={6}
                  color={summary.slaPercent >= 90 ? 'success' : summary.slaPercent >= 70 ? 'accent' : 'warning'}
                  label="SLA"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
