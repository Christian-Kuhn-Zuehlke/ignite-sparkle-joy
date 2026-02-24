import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Package } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchOrders, getStatusColor, Order } from '@/services/dataService';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface RecentOrdersProps {
  companyId?: string;
}

export function RecentOrders({ companyId }: RecentOrdersProps) {
  const { t, language } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const getTranslatedStatus = (status: string) => {
    const statusKey = status === 'ready_to_ship' ? 'readyToShip' : status;
    return t(`status.${statusKey}`);
  };

  const getLocale = () => {
    switch (language) {
      case 'de': return 'de-CH';
      case 'fr': return 'fr-CH';
      case 'it': return 'it-CH';
      case 'es': return 'es-ES';
      default: return 'en-GB';
    }
  };

  useEffect(() => {
    loadOrders();
  }, [companyId]);

  const loadOrders = async () => {
    try {
      const data = await fetchOrders();
      const filtered = companyId ? data.filter(o => o.company_id === companyId) : data;
      setOrders(filtered.slice(0, 5));
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-3 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-secondary/30 to-transparent">
        <h3 className="font-heading text-sm sm:text-base font-semibold text-foreground">
          {t('widgets.recentOrders')}
        </h3>
        <Link to="/orders">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 -mr-2 text-xs sm:text-sm h-8 px-2 sm:px-3">
            {t('widgets.showAll')}
            <ArrowRight className="ml-1 sm:ml-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </Link>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-xs sm:text-sm">{t('widgets.noOrders')}</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {orders.map((order, index) => (
            <Link 
              key={order.id}
              to={`/orders/${order.id}`}
              className={cn(
                "flex items-start sm:items-center gap-2 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3.5 transition-all hover:bg-secondary/50 active:bg-secondary/70",
                "animate-fade-in group"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5">
                  <span className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm sm:text-base">
                    #{order.source_no}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                  <span className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:inline">{order.company_name}</span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {order.ship_to_name}
                  <span className="hidden sm:inline"> – {order.ship_to_city}</span>
                </p>
              </div>
              
              <div className="text-right flex flex-col items-end gap-0.5 sm:gap-1 flex-shrink-0">
                <Badge variant={getStatusColor(order.status) as any} className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                  {getTranslatedStatus(order.status)}
                </Badge>
                <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(order.created_at).toLocaleDateString(getLocale(), { 
                    day: '2-digit', 
                    month: '2-digit',
                  })}
                  <span className="hidden sm:inline">
                    {order.created_at && order.created_at.includes('T') && (
                      <span className="ml-1">
                        {new Date(order.created_at).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
