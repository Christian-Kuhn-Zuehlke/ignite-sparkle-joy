import { Bell, Package, AlertTriangle, CheckCircle, Clock, UserPlus } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS, fr, it, es } from 'date-fns/locale';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingRegistrations } from '@/hooks/usePendingRegistrations';
import { useLanguage } from '@/contexts/LanguageContext';

const dateFnsLocales = {
  de,
  en: enUS,
  fr,
  it,
  es,
};

interface Notification {
  id: string;
  type: 'order' | 'alert' | 'success' | 'warning' | 'pending_user';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  // Fetch pending registrations for system admins
  const { pendingRegistrations, canViewPending } = usePendingRegistrations();

  // Fetch recent orders and alerts to generate notifications
  const { data: recentOrders } = useQuery({
    queryKey: ['recent-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, source_no, status, ship_to_name, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ['low-stock-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, sku, on_hand, low_stock_threshold')
        .not('low_stock_threshold', 'is', null)
        .limit(10);
      
      if (error) throw error;
      return data?.filter(item => (item.on_hand ?? 0) <= (item.low_stock_threshold || 0)) || [];
    },
  });

  // Generate notifications from data
  const notifications: Notification[] = [
    // Pending registrations (only for admins)
    ...(canViewPending && pendingRegistrations.length > 0 ? [{
      id: 'pending-registrations',
      type: 'pending_user' as const,
      title: t('notifications.pendingRegistrations').replace('{count}', String(pendingRegistrations.length)),
      message: pendingRegistrations.slice(0, 2).map(p => p.email).join(', ') + (pendingRegistrations.length > 2 ? ` +${pendingRegistrations.length - 2}` : ''),
      timestamp: new Date(pendingRegistrations[0]?.created_at || new Date()),
      read: readNotifications.has('pending-registrations'),
      link: '/settings?tab=pending',
    }] : []),
    // Low stock alerts
    ...(lowStockItems?.slice(0, 3).map((item) => ({
      id: `stock-${item.id}`,
      type: 'warning' as const,
      title: t('notifications.lowStock'),
      message: t('notifications.lowStockMessage').replace('{name}', item.name || '').replace('{sku}', item.sku).replace('{count}', String(item.on_hand ?? 0)),
      timestamp: new Date(),
      read: readNotifications.has(`stock-${item.id}`),
      link: '/inventory',
    })) || []),
    // Recent order updates
    ...(recentOrders?.map((order) => ({
      id: `order-${order.id}`,
      type: order.status === 'delivered' ? 'success' as const : 'order' as const,
      title: order.status === 'delivered' ? t('notifications.orderDelivered') : t('notifications.orderUpdated'),
      message: `${order.source_no} - ${order.ship_to_name}`,
      timestamp: new Date(order.updated_at),
      read: readNotifications.has(`order-${order.id}`),
      link: `/orders/${order.id}`,
    })) || []),
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'order':
        return <Package className="h-4 w-4 text-primary" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-status-success" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-status-warning" />;
      case 'pending_user':
        return <UserPlus className="h-4 w-4 text-status-exception" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setReadNotifications(prev => new Set([...prev, notification.id]));
    if (notification.link) {
      navigate(notification.link);
      setOpen(false);
    }
  };

  const markAllAsRead = () => {
    setReadNotifications(new Set(notifications.map(n => n.id)));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4 md:h-[18px] md:w-[18px] text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-exception opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-status-exception" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="font-semibold text-foreground">{t('notifications.title')}</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllAsRead}
            >
              {t('notifications.markAllRead')}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">{t('notifications.noNotifications')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                    !notification.read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: dateFnsLocales[language] || de })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
