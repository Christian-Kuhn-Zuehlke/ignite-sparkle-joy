import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Clock,
  Package,
  RotateCcw,
  Flame,
  Zap,
  ChevronDown
} from '@/components/icons';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, getDay, getHours, parseISO } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderAnalyticsWidgetProps {
  companyId?: string | null;
}

interface DayStats {
  day: string;
  dayIndex: number;
  orders: number;
  returns: number;
  intensity: number;
}

interface HourStats {
  hour: number;
  label: string;
  orders: number;
  returns: number;
}

interface TrendData {
  date: string;
  label: string;
  orders: number;
  returns: number;
}

// Animated counter component
const AnimatedCounter = ({ 
  value, 
  duration = 2000,
  prefix = '',
  suffix = ''
}: { 
  value: number; 
  duration?: number;
  prefix?: string;
  suffix?: string;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let startTime: number;
    let animationFrame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * value));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);
  
  return (
    <span className="tabular-nums">
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
};

// Heatmap cell component
const HeatmapCell = ({ 
  intensity, 
  label, 
  value,
  isHighlight 
}: { 
  intensity: number; 
  label: string; 
  value: number;
  isHighlight: boolean;
}) => {
  const getIntensityClass = (i: number) => {
    if (i === 0) return 'bg-muted/30';
    if (i < 0.25) return 'bg-primary/20';
    if (i < 0.5) return 'bg-primary/40';
    if (i < 0.75) return 'bg-primary/60';
    return 'bg-primary/90';
  };
  
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative rounded-lg p-3 transition-all cursor-pointer group",
        getIntensityClass(intensity),
        isHighlight && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="text-xs font-medium text-center opacity-80">{label}</div>
      <div className={cn(
        "text-lg font-bold text-center",
        intensity > 0.5 ? "text-primary-foreground" : "text-foreground"
      )}>
        {value}
      </div>
      {isHighlight && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1"
        >
          <Flame className="h-4 w-4 text-orange-500" />
        </motion.div>
      )}
    </motion.div>
  );
};

export const OrderAnalyticsWidget = ({ companyId }: OrderAnalyticsWidgetProps) => {
  const { language } = useLanguage();
  const dateLocale = language === 'de' ? de : enUS;
  
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [ordersByDay, setOrdersByDay] = useState<DayStats[]>([]);
  const [ordersByHour, setOrdersByHour] = useState<HourStats[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [totals, setTotals] = useState({ orders: 0, returns: 0, avgPerDay: 0, peakDay: '' });
  
  const dayNames = language === 'de' 
    ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const fullDayNames = language === 'de'
    ? ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Fetch data
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      
      const fromDate = format(startOfDay(dateRange.from), 'yyyy-MM-dd');
      const toDate = format(endOfDay(dateRange.to), 'yyyy-MM-dd');
      
      try {
        // Fetch orders
        let ordersQuery = supabase
          .from('orders')
          .select('order_date, created_at')
          .gte('order_date', fromDate)
          .lte('order_date', toDate);
        
        if (companyId) {
          ordersQuery = ordersQuery.eq('company_id', companyId);
        }
        
        const { data: ordersData } = await ordersQuery;
        
        // Fetch returns
        let returnsQuery = supabase
          .from('returns')
          .select('return_date, created_at')
          .gte('return_date', fromDate)
          .lte('return_date', toDate);
        
        if (companyId) {
          returnsQuery = returnsQuery.eq('company_id', companyId);
        }
        
        const { data: returnsData } = await returnsQuery;
        
        // Process day-of-week stats
        const dayStats: Record<number, { orders: number; returns: number }> = {};
        for (let i = 0; i < 7; i++) {
          dayStats[i] = { orders: 0, returns: 0 };
        }
        
        ordersData?.forEach(order => {
          const date = parseISO(order.order_date || '');
          const dayIndex = getDay(date);
          dayStats[dayIndex].orders++;
        });
        
        returnsData?.forEach(ret => {
          if (ret.return_date) {
            const date = parseISO(ret.return_date);
            const dayIndex = getDay(date);
            dayStats[dayIndex].returns++;
          }
        });
        
        const maxOrders = Math.max(...Object.values(dayStats).map(d => d.orders), 1);
        const processedDayStats: DayStats[] = Object.entries(dayStats).map(([idx, stats]) => ({
          day: dayNames[parseInt(idx)],
          dayIndex: parseInt(idx),
          orders: stats.orders,
          returns: stats.returns,
          intensity: stats.orders / maxOrders
        }));
        
        setOrdersByDay(processedDayStats);
        
        // Process hour stats
        const hourStats: Record<number, { orders: number; returns: number }> = {};
        for (let i = 0; i < 24; i++) {
          hourStats[i] = { orders: 0, returns: 0 };
        }
        
        ordersData?.forEach(order => {
          const date = new Date(order.created_at);
          const hour = getHours(date);
          hourStats[hour].orders++;
        });
        
        returnsData?.forEach(ret => {
          const date = new Date(ret.created_at);
          const hour = getHours(date);
          hourStats[hour].returns++;
        });
        
        const processedHourStats: HourStats[] = Object.entries(hourStats).map(([hour, stats]) => ({
          hour: parseInt(hour),
          label: `${hour.padStart(2, '0')}:00`,
          orders: stats.orders,
          returns: stats.returns
        }));
        
        setOrdersByHour(processedHourStats);
        
        // Process trend data
        const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
        const dailyStats: Record<string, { orders: number; returns: number }> = {};
        
        days.forEach(day => {
          const key = format(day, 'yyyy-MM-dd');
          dailyStats[key] = { orders: 0, returns: 0 };
        });
        
        ordersData?.forEach(order => {
          const key = order.order_date || '';
          if (key && dailyStats[key]) {
            dailyStats[key].orders++;
          }
        });
        
        returnsData?.forEach(ret => {
          if (ret.return_date && dailyStats[ret.return_date]) {
            dailyStats[ret.return_date].returns++;
          }
        });
        
        const processedTrend: TrendData[] = Object.entries(dailyStats).map(([date, stats]) => ({
          date,
          label: format(parseISO(date), 'dd.MM', { locale: dateLocale }),
          orders: stats.orders,
          returns: stats.returns
        }));
        
        setTrendData(processedTrend);
        
        // Calculate totals
        const totalOrders = ordersData?.length || 0;
        const totalReturns = returnsData?.length || 0;
        const numDays = Math.max(days.length, 1);
        const avgPerDay = Math.round(totalOrders / numDays);
        
        const peakDayIndex = processedDayStats.reduce((max, day) => 
          day.orders > (processedDayStats[max]?.orders || 0) ? day.dayIndex : max, 0
        );
        
        setTotals({
          orders: totalOrders,
          returns: totalReturns,
          avgPerDay,
          peakDay: fullDayNames[peakDayIndex]
        });
        
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [dateRange, companyId, language]);
  
  const peakHour = useMemo(() => {
    if (ordersByHour.length === 0) return null;
    return ordersByHour.reduce((max, hour) => 
      hour.orders > max.orders ? hour : max, ordersByHour[0]
    );
  }, [ordersByHour]);
  
  const peakDayData = useMemo(() => {
    if (ordersByDay.length === 0) return null;
    return ordersByDay.reduce((max, day) => 
      day.orders > max.orders ? day : max, ordersByDay[0]
    );
  }, [ordersByDay]);

  // Quick date range presets
  const datePresets = [
    { label: language === 'de' ? '7 Tage' : '7 Days', days: 7 },
    { label: language === 'de' ? '30 Tage' : '30 Days', days: 30 },
    { label: language === 'de' ? '90 Tage' : '90 Days', days: 90 },
    { label: language === 'de' ? '12 Monate' : '12 Months', days: 365 },
  ];

  return (
    <Card className="col-span-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {language === 'de' ? 'Bestellanalyse' : 'Order Analytics'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {language === 'de' ? 'Muster & Trends erkennen' : 'Discover patterns & trends'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {datePresets.map((preset) => (
              <Button
                key={preset.days}
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  Math.abs(
                    Math.round((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
                  ) === preset.days && "bg-primary text-primary-foreground"
                )}
                onClick={() => setDateRange({
                  from: subDays(new Date(), preset.days),
                  to: new Date()
                })}
              >
                {preset.label}
              </Button>
            ))}
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {format(dateRange.from, 'dd.MM.yy')} - {format(dateRange.to, 'dd.MM.yy')}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  locale={dateLocale}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <Zap className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{language === 'de' ? 'Übersicht' : 'Overview'}</span>
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="text-xs sm:text-sm">
              <Flame className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Heatmap</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Trends</span>
            </TabsTrigger>
            <TabsTrigger value="hours" className="text-xs sm:text-sm">
              <Clock className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{language === 'de' ? 'Uhrzeiten' : 'Hours'}</span>
            </TabsTrigger>
          </TabsList>
          
          <AnimatePresence mode="wait">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {/* Total Orders */}
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">
                      {language === 'de' ? 'Bestellungen' : 'Orders'}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {isLoading ? '...' : <AnimatedCounter value={totals.orders} />}
                  </div>
                </div>
                
                {/* Total Returns */}
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <RotateCcw className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-muted-foreground">
                      {language === 'de' ? 'Retouren' : 'Returns'}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {isLoading ? '...' : <AnimatedCounter value={totals.returns} />}
                  </div>
                </div>
                
                {/* Average per Day */}
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">Ø / Tag</span>
                  </div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {isLoading ? '...' : <AnimatedCounter value={totals.avgPerDay} />}
                  </div>
                </div>
                
                {/* Peak Day */}
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">
                      {language === 'de' ? 'Stärkster Tag' : 'Peak Day'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {isLoading ? '...' : totals.peakDay}
                  </div>
                  {peakHour && !isLoading && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Peak: {peakHour.label}
                    </Badge>
                  )}
                </div>
              </motion.div>
            </TabsContent>
            
            {/* Heatmap Tab */}
            <TabsContent value="heatmap" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-1">
                    {language === 'de' ? 'Bestellungen nach Wochentag' : 'Orders by Day of Week'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {language === 'de' 
                      ? 'Je dunkler, desto mehr Bestellungen' 
                      : 'Darker = more orders'}
                  </p>
                </div>
                
                <div className="grid grid-cols-7 gap-2 mb-6">
                  {ordersByDay.map((day) => (
                    <HeatmapCell
                      key={day.day}
                      intensity={day.intensity}
                      label={day.day}
                      value={day.orders}
                      isHighlight={peakDayData?.dayIndex === day.dayIndex}
                    />
                  ))}
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <div className="text-sm font-medium">
                      {language === 'de' ? 'Stärkster Tag' : 'Busiest Day'}
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {peakDayData ? fullDayNames[peakDayData.dayIndex] : '-'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {language === 'de' ? 'Bestellungen' : 'Orders'}
                    </div>
                    <div className="text-2xl font-bold">
                      {peakDayData?.orders || 0}
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>
            
            {/* Trends Tab */}
            <TabsContent value="trends" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="returnsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      name={language === 'de' ? 'Bestellungen' : 'Orders'}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#ordersGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="returns"
                      name={language === 'de' ? 'Retouren' : 'Returns'}
                      stroke="hsl(24, 95%, 53%)"
                      strokeWidth={2}
                      fill="url(#returnsGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            </TabsContent>
            
            {/* Hours Tab */}
            <TabsContent value="hours" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-1">
                    {language === 'de' ? 'Bestellungen nach Uhrzeit' : 'Orders by Hour'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {language === 'de' 
                      ? 'Wann kommen die meisten Bestellungen?' 
                      : 'When do most orders come in?'}
                  </p>
                </div>
                
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ordersByHour} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 9 }}
                        interval={2}
                        className="text-muted-foreground"
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        className="text-muted-foreground"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="orders" 
                        name={language === 'de' ? 'Bestellungen' : 'Orders'}
                        radius={[4, 4, 0, 0]}
                      >
                        {ordersByHour.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={peakHour?.hour === entry.hour 
                              ? 'hsl(var(--primary))' 
                              : 'hsl(var(--primary) / 0.5)'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {peakHour && (
                  <div className="flex items-center justify-center gap-4 mt-4 p-3 rounded-lg bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <span className="text-sm text-muted-foreground">
                        {language === 'de' ? 'Peak-Hour: ' : 'Peak Hour: '}
                      </span>
                      <span className="font-bold text-primary">{peakHour.label}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({peakHour.orders} {language === 'de' ? 'Bestellungen' : 'orders'})
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default OrderAnalyticsWidget;
