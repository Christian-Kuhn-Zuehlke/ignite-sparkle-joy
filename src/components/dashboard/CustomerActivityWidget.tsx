import { useState, useEffect } from 'react';
import { Users, TrendingUp, Package, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface CustomerActivity {
  company_id: string;
  company_name: string;
  orders_count: number;
  orders_last_7_days: number;
}

/**
 * Dashboard widget showing customer count and activity metrics
 * Only visible to MSD staff (system_admin, msd_csm, msd_ma)
 */
export function CustomerActivityWidget() {
  const { role } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<CustomerActivity[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [activeCustomers, setActiveCustomers] = useState(0);
  const [totalOrdersLast7Days, setTotalOrdersLast7Days] = useState(0);

  // Only show for MSD staff
  const isMsdStaff = ['system_admin', 'msd_csm', 'msd_ma'].includes(role || '');

  useEffect(() => {
    if (!isMsdStaff) return;
    fetchCustomerActivity();
  }, [isMsdStaff]);

  const fetchCustomerActivity = async () => {
    try {
      setLoading(true);

      // Get all companies (excluding internal ones)
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name')
        .not('id', 'in', '(MSD,PENDING)');

      if (companiesError) throw companiesError;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      // Get orders per company for last 7 days
      const customerActivities: CustomerActivity[] = [];
      let totalLast7Days = 0;
      let activeCount = 0;

      for (const company of companies || []) {
        // Total orders
        const { count: totalCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id);

        // Orders last 7 days
        const { count: recentCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .gte('order_date', sevenDaysAgoStr);

        const last7Days = recentCount || 0;
        totalLast7Days += last7Days;

        if (last7Days > 0) {
          activeCount++;
        }

        customerActivities.push({
          company_id: company.id,
          company_name: company.name,
          orders_count: totalCount || 0,
          orders_last_7_days: last7Days,
        });
      }

      // Sort by recent activity
      customerActivities.sort((a, b) => b.orders_last_7_days - a.orders_last_7_days);

      setCustomerData(customerActivities);
      setTotalCustomers(companies?.length || 0);
      setActiveCustomers(activeCount);
      setTotalOrdersLast7Days(totalLast7Days);
    } catch (error) {
      console.error('Error fetching customer activity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isMsdStaff) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Users className="h-4 w-4 text-primary" />
          {t('widgets.customerActivity')}
          <Badge variant="secondary" className="ml-auto text-xs">
            MSD
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{totalCustomers}</div>
            <div className="text-xs text-muted-foreground">{t('widgets.customers')}</div>
          </div>
          <div className="bg-accent/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-accent">{activeCustomers}</div>
            <div className="text-xs text-muted-foreground">{t('widgets.active7d')}</div>
          </div>
          <div className="bg-primary/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-primary">{totalOrdersLast7Days}</div>
            <div className="text-xs text-muted-foreground">{t('widgets.orders7d')}</div>
          </div>
        </div>

        {/* Customer List */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {customerData.map((customer) => (
            <div
              key={customer.company_id}
              className="flex items-center justify-between p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Activity className={`h-3 w-3 ${customer.orders_last_7_days > 0 ? 'text-accent' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium truncate max-w-[120px]">
                  {customer.company_name}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {customer.orders_count.toLocaleString()}
                </span>
                {customer.orders_last_7_days > 0 && (
                  <Badge variant="outline" className="text-accent border-accent/30 text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +{customer.orders_last_7_days}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
