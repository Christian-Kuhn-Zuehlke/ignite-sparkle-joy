import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Database } from '@/integrations/supabase/types';
import { 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ArrowUpDown,
  BarChart3,
  TrendingUp,
  Package
} from '@/components/icons';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { differenceInDays, differenceInHours, format } from 'date-fns';
import { de, enUS, fr, it, es } from 'date-fns/locale';

type OrderStatus = Database['public']['Enums']['order_status'];

// Age buckets for categorizing orders
const AGE_BUCKETS = [
  { key: 'critical', min: 7, max: Infinity, label: '> 7 Tage', color: 'hsl(var(--destructive))' },
  { key: 'high', min: 3, max: 7, label: '3-7 Tage', color: 'hsl(25, 95%, 53%)' },
  { key: 'medium', min: 1, max: 3, label: '1-3 Tage', color: 'hsl(48, 96%, 53%)' },
  { key: 'low', min: 0, max: 1, label: '< 1 Tag', color: 'hsl(142, 76%, 36%)' },
];

// Non-shipped statuses (open orders)
const OPEN_STATUSES: OrderStatus[] = ['received', 'putaway', 'picking', 'packing', 'ready_to_ship'];

interface AgingOrder {
  id: string;
  source_no: string;
  order_date: string;
  status: string;
  ship_to_name: string;
  company_id: string;
  company_name: string;
  order_amount: number | null;
  ageInDays: number;
  ageInHours: number;
  bucket: typeof AGE_BUCKETS[number];
}

interface AgingStats {
  total: number;
  byBucket: Record<string, number>;
  byStatus: Record<string, number>;
  avgAgeDays: number;
  oldestOrder: AgingOrder | null;
  totalValue: number;
}

export default function OrderAging() {
  const { t, language } = useLanguage();
  const { activeCompanyId } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sortField, setSortField] = useState<'age' | 'amount' | 'date'>('age');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const localeMap = { de, en: enUS, fr, it, es };
  const dateLocale = localeMap[language] || de;

  // Fetch open orders for aging analysis
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['order-aging', activeCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('id, source_no, order_date, status, ship_to_name, company_id, company_name, order_amount')
        .in('status', OPEN_STATUSES)
        .order('order_date', { ascending: true });

      if (activeCompanyId && activeCompanyId !== 'all' && activeCompanyId !== 'ALL') {
        query = query.eq('company_id', activeCompanyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Process orders into aging data
  const agingData = useMemo(() => {
    if (!orders) return { orders: [], stats: null };

    const now = new Date();
    
    const processedOrders: AgingOrder[] = orders.map(order => {
      const orderDate = new Date(order.order_date);
      const ageInDays = differenceInDays(now, orderDate);
      const ageInHours = differenceInHours(now, orderDate);
      
      const bucket = AGE_BUCKETS.find(b => ageInDays >= b.min && ageInDays < b.max) || AGE_BUCKETS[0];

      return {
        ...order,
        ageInDays,
        ageInHours,
        bucket,
      };
    });

    // Sort orders
    processedOrders.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'age':
          comparison = a.ageInDays - b.ageInDays;
          break;
        case 'amount':
          comparison = (a.order_amount || 0) - (b.order_amount || 0);
          break;
        case 'date':
          comparison = new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });

    // Calculate statistics
    const stats: AgingStats = {
      total: processedOrders.length,
      byBucket: {},
      byStatus: {},
      avgAgeDays: 0,
      oldestOrder: processedOrders.length > 0 ? processedOrders[0] : null,
      totalValue: 0,
    };

    // Initialize buckets
    AGE_BUCKETS.forEach(b => { stats.byBucket[b.key] = 0; });
    OPEN_STATUSES.forEach(s => { stats.byStatus[s] = 0; });

    let totalDays = 0;
    processedOrders.forEach(order => {
      stats.byBucket[order.bucket.key]++;
      stats.byStatus[order.status] = (stats.byStatus[order.status] || 0) + 1;
      totalDays += order.ageInDays;
      stats.totalValue += order.order_amount || 0;
    });

    stats.avgAgeDays = processedOrders.length > 0 ? Math.round(totalDays / processedOrders.length * 10) / 10 : 0;

    return { orders: processedOrders, stats };
  }, [orders, sortField, sortDirection]);

  const handleSort = (field: 'age' | 'amount' | 'date') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Chart data
  const pieChartData = useMemo(() => {
    if (!agingData.stats) return [];
    return AGE_BUCKETS.map(bucket => ({
      name: bucket.label,
      value: agingData.stats?.byBucket[bucket.key] || 0,
      color: bucket.color,
    })).filter(d => d.value > 0);
  }, [agingData.stats]);

  const statusChartData = useMemo(() => {
    if (!agingData.stats) return [];
    const statusLabels: Record<string, string> = {
      received: t('status.received'),
      putaway: t('status.putaway'),
      picking: t('status.picking'),
      packing: t('status.packing'),
      ready_to_ship: t('status.readyToShip'),
    };
    return OPEN_STATUSES.map(status => ({
      status: statusLabels[status] || status,
      count: agingData.stats?.byStatus[status] || 0,
    })).filter(d => d.count > 0);
  }, [agingData.stats, t]);

  const getAgeBadgeVariant = (bucket: typeof AGE_BUCKETS[number]) => {
    switch (bucket.key) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received': return <Package className="h-4 w-4" />;
      case 'ready_to_ship': return <CheckCircle2 className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (error) {
    return (
      <MainLayout title={t('aging.title')} subtitle={t('aging.subtitle')}>
        <div className="flex items-center justify-center p-8">
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="text-muted-foreground">{t('common.error')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title={t('aging.title')} 
      subtitle={t('aging.subtitle')}
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('aging.totalOpen')}</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{agingData.stats?.total || 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('aging.critical')}</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-destructive">
                      {agingData.stats?.byBucket?.critical || 0}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('aging.avgAge')}</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">
                      {agingData.stats?.avgAgeDays || 0} {t('common.days')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('aging.totalValue')}</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">
                      CHF {(agingData.stats?.totalValue || 0).toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              {t('aging.overview')}
            </TabsTrigger>
            <TabsTrigger value="details" className="relative">
              <Clock className="h-4 w-4 mr-2" />
              {t('aging.details')}
              {(agingData.stats?.byBucket?.critical || 0) > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                  {agingData.stats?.byBucket?.critical}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Age Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('aging.ageDistribution')}</CardTitle>
                  <CardDescription>{t('aging.ageDistributionDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-[280px] flex items-center justify-center">
                      <Skeleton className="h-48 w-48 rounded-full" />
                    </div>
                  ) : pieChartData.length > 0 ? (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {pieChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      {t('aging.noData')}
                    </div>
                  )}
                  {/* Legend */}
                  <div className="flex flex-wrap gap-3 mt-4 justify-center">
                    {AGE_BUCKETS.map(bucket => (
                      <div key={bucket.key} className="flex items-center gap-2 text-sm">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: bucket.color }}
                        />
                        <span>{bucket.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Status Distribution Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('aging.statusDistribution')}</CardTitle>
                  <CardDescription>{t('aging.statusDistributionDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-[280px] flex items-center justify-center">
                      <Skeleton className="h-full w-full" />
                    </div>
                  ) : statusChartData.length > 0 ? (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="status" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      {t('aging.noData')}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Oldest Order Highlight */}
            {agingData.stats?.oldestOrder && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <CardTitle className="text-base">{t('aging.oldestOrder')}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">{agingData.stats.oldestOrder.source_no}</p>
                      <p className="text-muted-foreground">{agingData.stats.oldestOrder.ship_to_name}</p>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant={getAgeBadgeVariant(agingData.stats.oldestOrder.bucket)}>
                          {agingData.stats.oldestOrder.ageInDays} {t('common.days')}
                        </Badge>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{t(`status.${agingData.stats.oldestOrder.status}`)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          {format(new Date(agingData.stats.oldestOrder.order_date), 'dd.MM.yyyy', { locale: dateLocale })}
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/orders/${agingData.stats!.oldestOrder!.id}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t('common.view')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t('aging.allOpenOrders')}</CardTitle>
                    <CardDescription>
                      {agingData.orders.length} {t('aging.ordersFound')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : agingData.orders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[120px]">{t('orders.orderNo')}</TableHead>
                          <TableHead className="min-w-[150px]">{t('orders.customer')}</TableHead>
                          <TableHead>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-auto p-0 hover:bg-transparent"
                              onClick={() => handleSort('date')}
                            >
                              {t('orders.orderDate')}
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-auto p-0 hover:bg-transparent"
                              onClick={() => handleSort('age')}
                            >
                              {t('aging.age')}
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>{t('orders.status')}</TableHead>
                          <TableHead className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-auto p-0 hover:bg-transparent"
                              onClick={() => handleSort('amount')}
                            >
                              {t('orders.amount')}
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agingData.orders.map(order => (
                          <TableRow 
                            key={order.id}
                            className={order.bucket.key === 'critical' ? 'bg-destructive/5' : ''}
                          >
                            <TableCell className="font-medium">{order.source_no}</TableCell>
                            <TableCell className="text-muted-foreground">{order.ship_to_name}</TableCell>
                            <TableCell>
                              {format(new Date(order.order_date), 'dd.MM.yyyy', { locale: dateLocale })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getAgeBadgeVariant(order.bucket)}>
                                {order.ageInDays} {t('common.days')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(order.status)}
                                <span className="text-sm">{t(`status.${order.status}`)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {order.order_amount 
                                ? `CHF ${order.order_amount.toLocaleString('de-CH', { minimumFractionDigits: 2 })}`
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/orders/${order.id}`)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="font-medium">{t('aging.noOpenOrders')}</p>
                    <p className="text-muted-foreground text-sm">{t('aging.allProcessed')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
