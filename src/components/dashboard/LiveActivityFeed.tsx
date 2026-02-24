import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Package, 
  Truck, 
  RotateCcw, 
  CheckCircle2, 
  Clock,
  ArrowRight,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de, enGB, fr, it, es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface RawActivityItem {
  id: string;
  type: 'order_created' | 'order_shipped' | 'order_delivered' | 'return_created' | 'status_changed';
  messageKey: string;
  messageParams?: Record<string, string>;
  timestamp: Date;
  meta?: {
    orderId?: string;
    status?: string;
    customerName?: string;
  };
}

const activityIcons: Record<string, React.ReactNode> = {
  order_created: <Package className="h-4 w-4 text-blue-500" />,
  order_shipped: <Truck className="h-4 w-4 text-emerald-500" />,
  order_delivered: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  return_created: <RotateCcw className="h-4 w-4 text-orange-500" />,
  status_changed: <Clock className="h-4 w-4 text-primary" />,
};

export function LiveActivityFeed() {
  const { profile, role } = useAuth();
  const { t, language } = useLanguage();
  const [rawActivities, setRawActivities] = useState<RawActivityItem[]>([]);
  const [newActivityCount, setNewActivityCount] = useState(0);

  const getDateLocale = () => {
    switch (language) {
      case 'de': return de;
      case 'fr': return fr;
      case 'it': return it;
      case 'es': return es;
      default: return enGB;
    }
  };

  // Helper to get translated status
  const getStatusLabel = (status: string) => {
    const statusKey = status === 'ready_to_ship' ? 'readyToShip' : status;
    return t(`status.${statusKey}`);
  };

  // Build translated messages from raw activities
  const activities = useMemo(() => {
    return rawActivities.map(item => {
      let message = '';
      switch (item.messageKey) {
        case 'activity.orderShipped':
          message = `${t('orders.order')} ${item.messageParams?.orderNo} ${t('activity.wasShipped')}`;
          break;
        case 'activity.orderDelivered':
          message = `${t('orders.order')} ${item.messageParams?.orderNo} ${t('activity.deliveredTo')} ${item.messageParams?.customerName}`;
          break;
        case 'activity.newOrder':
          message = `${t('activity.newOrderReceived')} ${item.messageParams?.orderNo}`;
          break;
        case 'activity.statusChanged':
          message = `${t('orders.order')} ${item.messageParams?.orderNo}: ${getStatusLabel(item.messageParams?.status || '')}`;
          break;
        case 'activity.newReturn':
          message = t('activity.newReturnReceived');
          break;
        default:
          message = item.messageKey;
      }
      return { ...item, message };
    });
  }, [rawActivities, t, language]);

  const canSeeAllCompanies = role === 'system_admin' || role === 'msd_csm' || role === 'msd_ma';

  // Fetch recent activities
  const { data: initialActivities } = useQuery({
    queryKey: ['live-activities', profile?.company_id],
    queryFn: async (): Promise<RawActivityItem[]> => {
      const activities: RawActivityItem[] = [];

      // Get recent orders (last 2 hours)
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      
      let ordersQuery = supabase
        .from('orders')
        .select('id, source_no, ship_to_name, status, status_date, created_at')
        .gte('updated_at', twoHoursAgo)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (!canSeeAllCompanies && profile?.company_id) {
        ordersQuery = ordersQuery.eq('company_id', profile.company_id);
      }

      const { data: orders } = await ordersQuery;

      orders?.forEach((order) => {
        const statusDate = order.status_date ? new Date(order.status_date) : new Date(order.created_at);
        const createdAt = new Date(order.created_at);

        // Check if status was just updated (within last 2 hours)
        if (order.status === 'shipped') {
          activities.push({
            id: `${order.id}-shipped`,
            type: 'order_shipped',
            messageKey: 'activity.orderShipped',
            messageParams: { orderNo: order.source_no },
            timestamp: statusDate,
            meta: { orderId: order.id, customerName: order.ship_to_name },
          });
        } else if (order.status === 'delivered') {
          activities.push({
            id: `${order.id}-delivered`,
            type: 'order_delivered',
            messageKey: 'activity.orderDelivered',
            messageParams: { orderNo: order.source_no, customerName: order.ship_to_name },
            timestamp: statusDate,
            meta: { orderId: order.id, customerName: order.ship_to_name },
          });
        } else if (createdAt >= new Date(twoHoursAgo)) {
          activities.push({
            id: `${order.id}-created`,
            type: 'order_created',
            messageKey: 'activity.newOrder',
            messageParams: { orderNo: order.source_no },
            timestamp: createdAt,
            meta: { orderId: order.id, customerName: order.ship_to_name },
          });
        } else {
          activities.push({
            id: `${order.id}-status`,
            type: 'status_changed',
            messageKey: 'activity.statusChanged',
            messageParams: { orderNo: order.source_no, status: order.status },
            timestamp: statusDate,
            meta: { orderId: order.id, status: order.status },
          });
        }
      });

      // Get recent returns
      let returnsQuery = supabase
        .from('returns')
        .select('id, order_id, status, created_at')
        .gte('created_at', twoHoursAgo)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!canSeeAllCompanies && profile?.company_id) {
        returnsQuery = returnsQuery.eq('company_id', profile.company_id);
      }

      const { data: returns } = await returnsQuery;

      returns?.forEach((ret) => {
        activities.push({
          id: `return-${ret.id}`,
          type: 'return_created',
          messageKey: 'activity.newReturn',
          timestamp: new Date(ret.created_at),
        });
      });

      // Sort by timestamp descending
      return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 15);
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  // Set initial activities
  useEffect(() => {
    if (initialActivities) {
      setRawActivities(initialActivities);
    }
  }, [initialActivities]);

  // Real-time subscription for new events
  useEffect(() => {
    const channel = supabase
      .channel('live-activity-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const order = payload.new as any;
            
            // Check company filter
            if (!canSeeAllCompanies && profile?.company_id && order.company_id !== profile.company_id) {
              return;
            }

            const newActivity: RawActivityItem = {
              id: `${order.id}-created-${Date.now()}`,
              type: 'order_created',
              messageKey: 'activity.newOrder',
              messageParams: { orderNo: order.source_no },
              timestamp: new Date(),
              meta: { orderId: order.id, customerName: order.ship_to_name },
            };

            setRawActivities(prev => [newActivity, ...prev].slice(0, 15));
            setNewActivityCount(prev => prev + 1);

            // Clear new activity indicator after 3 seconds
            setTimeout(() => setNewActivityCount(0), 3000);
          } else if (payload.eventType === 'UPDATE') {
            const order = payload.new as any;
            const oldOrder = payload.old as any;

            // Check company filter
            if (!canSeeAllCompanies && profile?.company_id && order.company_id !== profile.company_id) {
              return;
            }

            // Only add if status changed
            if (order.status !== oldOrder.status) {
              let type: RawActivityItem['type'] = 'status_changed';
              let messageKey = 'activity.statusChanged';
              let messageParams: Record<string, string> = { orderNo: order.source_no, status: order.status };

              if (order.status === 'shipped') {
                type = 'order_shipped';
                messageKey = 'activity.orderShipped';
                messageParams = { orderNo: order.source_no };
              } else if (order.status === 'delivered') {
                type = 'order_delivered';
                messageKey = 'activity.orderDelivered';
                messageParams = { orderNo: order.source_no, customerName: order.ship_to_name || '' };
              }

              const newActivity: RawActivityItem = {
                id: `${order.id}-${order.status}-${Date.now()}`,
                type,
                messageKey,
                messageParams,
                timestamp: new Date(),
                meta: { orderId: order.id, status: order.status },
              };

              setRawActivities(prev => [newActivity, ...prev].slice(0, 15));
              setNewActivityCount(prev => prev + 1);

              setTimeout(() => setNewActivityCount(0), 3000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id, canSeeAllCompanies]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {t('widgets.liveActivities')}
          </CardTitle>
          {newActivityCount > 0 && (
            <Badge 
              variant="default" 
              className="bg-primary/10 text-primary border-primary/20 animate-pulse"
            >
              <Zap className="h-3 w-3 mr-1" />
              {newActivityCount} {t('widgets.new')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[280px] pr-4">
          <div className="space-y-1 pb-1">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">{t('widgets.noActivities')}</p>
              </div>
            ) : (
              activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className={cn(
                    "flex items-start gap-3 p-2 rounded-lg transition-all duration-300",
                    index === 0 && newActivityCount > 0 && "bg-primary/5 animate-fade-in"
                  )}
                >
                  <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                    {activityIcons[activity.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {activity.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, { 
                        addSuffix: true, 
                        locale: getDateLocale() 
                      })}
                    </p>
                  </div>
                  {activity.meta?.orderId && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 mt-1 flex-shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
