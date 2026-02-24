import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Crown, 
  UserMinus, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Star,
  ShoppingBag,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { CompanyFilterDropdown } from '@/components/filters/CompanyFilterDropdown';
import { cn } from '@/lib/utils';
import { exportToCSV, CUSTOMER_EXPORT_COLUMNS, formatDateForExport } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface CustomerSegment {
  segment: string;
  count: number;
  totalRevenue: number;
  avgOrderValue: number;
  color: string;
  icon: React.ReactNode;
}

interface VIPCustomer {
  customerNo: string;
  orderCount: number;
  totalRevenue: number;
  avgOrderValue: number;
  lastOrderDate: string;
  shipToName: string;
}

interface ChurnRiskCustomer {
  customerNo: string;
  shipToName: string;
  lastOrderDate: string;
  daysSinceLastOrder: number;
  previousOrderCount: number;
  riskLevel: 'high' | 'medium' | 'low';
}

export default function CustomerCockpit() {
  const companyId = useEffectiveCompanyId();
  const [activeTab, setActiveTab] = useState('overview');
  const { t } = useLanguage();

  // Export VIP customers
  const handleExportCustomers = useCallback((customers: VIPCustomer[]) => {
    if (!customers || customers.length === 0) {
      toast.error(t('common.noDataToExport'));
      return;
    }
    
    const exportData = customers.map(c => ({
      customerNo: c.customerNo,
      shipToName: c.shipToName,
      segment: 'VIP',
      orderCount: c.orderCount,
      totalRevenue: c.totalRevenue.toFixed(2),
      avgOrderValue: c.avgOrderValue.toFixed(2),
      lastOrderDate: formatDateForExport(c.lastOrderDate),
    }));
    
    const filename = `customers_vip_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(exportData, CUSTOMER_EXPORT_COLUMNS, filename);
    toast.success(t('export.customersExported'));
  }, [t]);

  // For MSD users with "All Customers", companyId is null - we should still load data
  const shouldFilterByCompany = !!companyId;

  // Fetch customer segmentation data
  const { data: segmentationData, isLoading: segmentationLoading } = useQuery({
    queryKey: ['customer-segmentation', companyId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('customer_no, order_amount, ship_to_name, order_date')
        .not('customer_no', 'is', null)
        .order('order_date', { ascending: false });

      // Only filter by company if a specific company is selected
      if (shouldFilterByCompany) {
        query = query.eq('company_id', companyId);
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      // Group by customer
      const customerMap: Record<string, { orders: number; revenue: number; name: string; lastOrder: string }> = {};
      
      for (const order of orders || []) {
        if (!order.customer_no) continue;
        if (!customerMap[order.customer_no]) {
          customerMap[order.customer_no] = { orders: 0, revenue: 0, name: order.ship_to_name, lastOrder: order.order_date };
        }
        customerMap[order.customer_no].orders++;
        customerMap[order.customer_no].revenue += order.order_amount || 0;
        if (order.order_date > customerMap[order.customer_no].lastOrder) {
          customerMap[order.customer_no].lastOrder = order.order_date;
        }
      }

      const customers = Object.entries(customerMap);
      
      // Segment customers
      const segments: CustomerSegment[] = [
        {
          segment: 'VIP',
          count: customers.filter(([, c]) => c.orders >= 5 || c.revenue >= 500).length,
          totalRevenue: customers.filter(([, c]) => c.orders >= 5 || c.revenue >= 500).reduce((sum, [, c]) => sum + c.revenue, 0),
          avgOrderValue: 0,
          color: 'bg-amber-500',
          icon: <Crown className="h-5 w-5 text-amber-500" />
        },
        {
          segment: 'Stammkunden',
          count: customers.filter(([, c]) => c.orders >= 2 && c.orders < 5 && c.revenue < 500).length,
          totalRevenue: customers.filter(([, c]) => c.orders >= 2 && c.orders < 5 && c.revenue < 500).reduce((sum, [, c]) => sum + c.revenue, 0),
          avgOrderValue: 0,
          color: 'bg-blue-500',
          icon: <Star className="h-5 w-5 text-blue-500" />
        },
        {
          segment: 'Gelegenheitskäufer',
          count: customers.filter(([, c]) => c.orders === 1).length,
          totalRevenue: customers.filter(([, c]) => c.orders === 1).reduce((sum, [, c]) => sum + c.revenue, 0),
          avgOrderValue: 0,
          color: 'bg-slate-500',
          icon: <ShoppingBag className="h-5 w-5 text-slate-500" />
        }
      ];

      // Calculate avg order value
      segments.forEach(seg => {
        if (seg.count > 0) {
          seg.avgOrderValue = Math.round(seg.totalRevenue / seg.count);
        }
      });

      return { segments, totalCustomers: customers.length };
    },
    // Always enabled - even without companyId (for "All Customers" view)
    enabled: true
  });

  // Fetch VIP customers
  const { data: vipCustomers, isLoading: vipLoading } = useQuery({
    queryKey: ['vip-customers', companyId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('customer_no, order_amount, ship_to_name, order_date')
        .not('customer_no', 'is', null);

      if (shouldFilterByCompany) {
        query = query.eq('company_id', companyId);
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      // Group by customer
      const customerMap: Record<string, VIPCustomer> = {};
      
      for (const order of orders || []) {
        if (!order.customer_no) continue;
        if (!customerMap[order.customer_no]) {
          customerMap[order.customer_no] = {
            customerNo: order.customer_no,
            orderCount: 0,
            totalRevenue: 0,
            avgOrderValue: 0,
            lastOrderDate: order.order_date,
            shipToName: order.ship_to_name
          };
        }
        customerMap[order.customer_no].orderCount++;
        customerMap[order.customer_no].totalRevenue += order.order_amount || 0;
        if (order.order_date > customerMap[order.customer_no].lastOrderDate) {
          customerMap[order.customer_no].lastOrderDate = order.order_date;
        }
      }

      // Calculate avg and filter VIPs
      const vips = Object.values(customerMap)
        .map(c => ({
          ...c,
          avgOrderValue: c.totalRevenue / c.orderCount
        }))
        .filter(c => c.orderCount >= 5 || c.totalRevenue >= 500)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 20);

      return vips;
    },
    enabled: true
  });

  // Fetch churn risk customers
  const { data: churnRiskCustomers, isLoading: churnLoading } = useQuery({
    queryKey: ['churn-risk', companyId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('customer_no, ship_to_name, order_date')
        .not('customer_no', 'is', null);

      if (shouldFilterByCompany) {
        query = query.eq('company_id', companyId);
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      // Group by customer
      const customerMap: Record<string, { name: string; orders: string[] }> = {};
      
      for (const order of orders || []) {
        if (!order.customer_no) continue;
        if (!customerMap[order.customer_no]) {
          customerMap[order.customer_no] = { name: order.ship_to_name, orders: [] };
        }
        customerMap[order.customer_no].orders.push(order.order_date);
      }

      const now = new Date();
      const churnRisks: ChurnRiskCustomer[] = [];

      for (const [customerNo, data] of Object.entries(customerMap)) {
        if (data.orders.length < 2) continue; // Only consider repeat customers

        const sortedDates = data.orders.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const lastOrderDate = sortedDates[0];
        const daysSince = Math.floor((now.getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));

        // Only include if hasn't ordered in 90+ days
        if (daysSince >= 90) {
          let riskLevel: 'high' | 'medium' | 'low' = 'low';
          if (daysSince >= 180) riskLevel = 'high';
          else if (daysSince >= 120) riskLevel = 'medium';

          churnRisks.push({
            customerNo,
            shipToName: data.name,
            lastOrderDate,
            daysSinceLastOrder: daysSince,
            previousOrderCount: data.orders.length,
            riskLevel
          });
        }
      }

      return churnRisks.sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder).slice(0, 20);
    },
    enabled: true
  });

  const isLoading = segmentationLoading || vipLoading || churnLoading;

  return (
    <MainLayout title="Customer Cockpit" subtitle="Kundensegmentierung & Analyse">
      {/* Filters */}
      <div className="mb-6 flex items-center gap-3">
        <CompanyFilterDropdown />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <Users className="h-4 w-4" />
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="vip" className="gap-2">
            <Crown className="h-4 w-4" />
            VIP-Kunden
          </TabsTrigger>
          <TabsTrigger value="churn" className="gap-2">
            <UserMinus className="h-4 w-4" />
            Churn-Risiko
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Segment Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              segmentationData?.segments.map((segment) => (
                <Card key={segment.segment} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium flex items-center gap-2">
                        {segment.icon}
                        {segment.segment}
                      </CardTitle>
                      <Badge variant="secondary" className="text-lg font-bold">
                        {segment.count}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Umsatz</span>
                      <span className="font-medium">{segment.totalRevenue.toLocaleString('de-CH')} CHF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ø Bestellwert</span>
                      <span className="font-medium">{segment.avgOrderValue.toLocaleString('de-CH')} CHF</span>
                    </div>
                    <Progress 
                      value={(segment.count / (segmentationData?.totalCustomers || 1)) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {Math.round((segment.count / (segmentationData?.totalCustomers || 1)) * 100)}% aller Kunden
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gesamt Kunden</p>
                    <p className="text-2xl font-bold">{segmentationData?.totalCustomers?.toLocaleString('de-CH') || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-amber-500/10 p-3">
                    <Crown className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">VIP-Kunden</p>
                    <p className="text-2xl font-bold">{segmentationData?.segments.find(s => s.segment === 'VIP')?.count || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-orange-500/10 p-3">
                    <AlertTriangle className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Churn-Risiko</p>
                    <p className="text-2xl font-bold">{churnRiskCustomers?.filter(c => c.riskLevel === 'high').length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Wiederkaufrate</p>
                    <p className="text-2xl font-bold">
                      {segmentationData ? 
                        Math.round(((segmentationData.segments.find(s => s.segment === 'VIP')?.count || 0) + 
                        (segmentationData.segments.find(s => s.segment === 'Stammkunden')?.count || 0)) / 
                        segmentationData.totalCustomers * 100) : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

{/* VIP Customers Tab */}
        <TabsContent value="vip">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Top VIP-Kunden
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExportCustomers(vipCustomers || [])} className="h-8">
                  <Download className="h-4 w-4 mr-1" />
                  {t('common.export')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vipLoading ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {vipCustomers?.map((customer, index) => (
                      <div 
                        key={customer.customerNo}
                        className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                            index < 3 ? "bg-amber-500 text-white" : "bg-secondary text-foreground"
                          )}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{customer.shipToName}</p>
                            <p className="text-sm text-muted-foreground">{customer.customerNo}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="text-muted-foreground">Bestellungen</p>
                            <p className="font-medium">{customer.orderCount}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">Ø Wert</p>
                            <p className="font-medium">{Math.round(customer.avgOrderValue)} CHF</p>
                          </div>
                          <div className="text-right min-w-[100px]">
                            <p className="text-muted-foreground">Umsatz</p>
                            <p className="font-bold text-primary">{customer.totalRevenue.toLocaleString('de-CH')} CHF</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Churn Risk Tab */}
        <TabsContent value="churn">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Kunden mit Churn-Risiko
              </CardTitle>
            </CardHeader>
            <CardContent>
              {churnLoading ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : churnRiskCustomers?.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <UserMinus className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>Keine Kunden mit Churn-Risiko gefunden</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {churnRiskCustomers?.map((customer) => (
                      <div 
                        key={customer.customerNo}
                        className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full",
                            customer.riskLevel === 'high' ? "bg-destructive/20 text-destructive" :
                            customer.riskLevel === 'medium' ? "bg-orange-500/20 text-orange-500" :
                            "bg-yellow-500/20 text-yellow-600"
                          )}>
                            {customer.riskLevel === 'high' ? (
                              <TrendingDown className="h-5 w-5" />
                            ) : (
                              <AlertTriangle className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{customer.shipToName}</p>
                            <p className="text-sm text-muted-foreground">{customer.customerNo}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="text-muted-foreground">Vorherige Bestellungen</p>
                            <p className="font-medium">{customer.previousOrderCount}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">Letzte Bestellung</p>
                            <p className="font-medium">{new Date(customer.lastOrderDate).toLocaleDateString('de-CH')}</p>
                          </div>
                          <div className="text-right min-w-[100px]">
                            <p className="text-muted-foreground">Inaktiv seit</p>
                            <p className={cn(
                              "font-bold",
                              customer.riskLevel === 'high' ? "text-destructive" :
                              customer.riskLevel === 'medium' ? "text-orange-500" :
                              "text-yellow-600"
                            )}>
                              {customer.daysSinceLastOrder} Tage
                            </p>
                          </div>
                          <Badge variant={
                            customer.riskLevel === 'high' ? "destructive" :
                            customer.riskLevel === 'medium' ? "outline" : "secondary"
                          }>
                            {customer.riskLevel === 'high' ? 'Hoch' : customer.riskLevel === 'medium' ? 'Mittel' : 'Niedrig'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
