import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ExternalLink, 
  MapPin, 
  Calendar, 
  Package,
  Truck,
  Copy,
  ArrowLeft,
  RefreshCw,
} from '@/components/icons';
import { MainLayout } from '@/components/layout/MainLayout';
import { OrderTimeline } from '@/components/orders/OrderTimeline';
import { OrderNotes } from '@/components/orders/OrderNotes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SkeletonCard, SkeletonTable } from '@/components/ui/skeleton-card';
import { fetchOrderById, getStatusColor, getStatusLabel, Order } from '@/services/dataService';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrderStateQuery } from '@/hooks/useOrderStateQuery';
import { useAuth } from '@/contexts/AuthContext';

export default function OrderDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const { activeCompanyId } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const orderStateQuery = useOrderStateQuery();

  useEffect(() => {
    if (id) {
      loadOrder(id);
    }
  }, [id]);

  const loadOrder = async (orderId: string) => {
    try {
      setLoading(true);
      const data = await fetchOrderById(orderId);
      setOrder(data);
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshState = async () => {
    if (!order || !activeCompanyId) {
      toast.error(t('orders.companyRequired') || 'Company ID required');
      return;
    }

    try {
      await orderStateQuery.mutateAsync({
        orderNo: order.source_no,
        companyId: activeCompanyId,
      });
      // Reload order to get updated data
      await loadOrder(order.id);
    } catch (error) {
      // Error is already handled by the hook
    }
  };

  if (loading) {
    return (
      <MainLayout title={t('common.loading')} subtitle="" breadcrumbs={[{ label: t('nav.orders'), href: '/orders' }, { label: t('common.loading') }]}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonCard />
            <SkeletonTable rows={3} />
          </div>
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout title={t('orders.notFound')} subtitle="" breadcrumbs={[{ label: t('nav.orders'), href: '/orders' }, { label: t('orders.notFound') }]}>
        <div className="flex flex-col items-center justify-center py-16">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('orders.orderNotFound')}</p>
          <Link to="/orders">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('orders.backToOverview')}
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const copyTrackingCode = () => {
    if (order.tracking_code) {
      navigator.clipboard.writeText(order.tracking_code);
      toast.success(t('orders.trackingCodeCopied'));
    }
  };

  const lines = order.order_lines || [];

  return (
    <MainLayout 
      title={`${t('orders.order')} #${order.source_no}`} 
      subtitle={`${order.company_name} • ${new Date(order.order_date).toLocaleDateString('de-CH')}`}
      breadcrumbs={[{ label: t('nav.orders'), href: '/orders' }, { label: `#${order.source_no}` }]}
    >

      {/* Main Grid - Stack on mobile */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* Timeline Card */}
          <div className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <h3 className="font-heading text-base md:text-lg font-semibold text-foreground">
                  {t('orders.orderStatus')}
                </h3>
                <Badge variant={getStatusColor(order.status) as any} className="text-xs md:text-sm px-2 md:px-3 py-1">
                  {getStatusLabel(order.status)}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshState}
                disabled={orderStateQuery.isPending || !activeCompanyId}
                className="h-8 w-full sm:w-auto"
              >
                <RefreshCw className={`h-3 w-3 mr-1.5 ${orderStateQuery.isPending ? 'animate-spin' : ''}`} />
                {t('orders.refreshState') || 'Status aktualisieren'}
              </Button>
            </div>
            <OrderTimeline currentStatus={order.status} />
          </div>

          {/* Order Lines */}
          <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <div className="border-b border-border px-4 md:px-6 py-3 md:py-4">
              <h3 className="font-heading text-sm md:text-base font-semibold text-foreground">
                {t('orders.positions')} ({lines.length})
              </h3>
            </div>
            {lines.length === 0 ? (
              <div className="px-4 md:px-6 py-6 md:py-8 text-center">
                <p className="text-muted-foreground text-sm">{t('orders.noPositions')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {lines.map((line) => {
                  const lineRevenue = Number(line.price) * line.quantity;
                  const lineCost = line.cost_price ? Number(line.cost_price) * line.quantity : null;
                  const lineMargin = lineCost !== null ? lineRevenue - lineCost : null;
                  const marginPercent = lineMargin !== null && lineRevenue > 0 
                    ? (lineMargin / lineRevenue) * 100 
                    : null;
                  
                  return (
                    <div key={line.id} className="flex items-start gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4">
                      <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg bg-secondary shrink-0">
                        <Package className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm md:text-base leading-tight">{line.name}</p>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">SKU: {line.sku}</p>
                        {lineMargin !== null && (
                          <p className={`text-xs mt-1 ${marginPercent !== null && marginPercent >= 20 ? 'text-status-shipped' : marginPercent !== null && marginPercent >= 10 ? 'text-status-warning' : 'text-destructive'}`}>
                            {t('orders.margin')}: CHF {lineMargin.toFixed(2)} ({marginPercent?.toFixed(1)}%)
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-medium text-foreground text-sm md:text-base">× {line.quantity}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">CHF {Number(line.price).toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="border-t border-border bg-secondary/30 px-4 md:px-6 py-3 md:py-4">
              {/* Order Total with Margin Summary */}
              {(() => {
                const totalRevenue = lines.reduce((sum, line) => sum + (Number(line.price) * line.quantity), 0);
                const linesWithCost = lines.filter(line => line.cost_price != null);
                const totalCost = linesWithCost.reduce((sum, line) => sum + (Number(line.cost_price) * line.quantity), 0);
                const hasMarginData = linesWithCost.length > 0;
                const totalMargin = hasMarginData ? totalRevenue - totalCost : null;
                const totalMarginPercent = totalMargin !== null && totalRevenue > 0 
                  ? (totalMargin / totalRevenue) * 100 
                  : null;
                
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground text-sm md:text-base">{t('orders.totalAmount')}</span>
                      <span className="font-heading text-lg md:text-xl font-bold text-foreground">
                        CHF {Number(order.order_amount).toFixed(2)}
                      </span>
                    </div>
                    {totalMargin !== null && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <span className="text-sm text-muted-foreground">{t('orders.grossMargin')}</span>
                        <span className={`font-semibold ${totalMarginPercent !== null && totalMarginPercent >= 20 ? 'text-status-shipped' : totalMarginPercent !== null && totalMarginPercent >= 10 ? 'text-status-warning' : 'text-destructive'}`}>
                          CHF {totalMargin.toFixed(2)} ({totalMarginPercent?.toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Collaborative Notes */}
          <OrderNotes orderId={order.id} />
        </div>

        {/* Right Column - Details (shows first on mobile for quick info) */}
        <div className="space-y-4 md:space-y-6 order-first lg:order-last">
          {/* Tracking Card */}
          {order.tracking_code && (
            <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-card">
              <div className="flex items-center gap-2 mb-3 md:mb-4">
                <Truck className="h-4 w-4 text-accent" />
                <h3 className="font-heading text-sm md:text-base font-semibold text-foreground">
                  {t('orders.tracking')}
                </h3>
              </div>
              <div className="space-y-2 md:space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('orders.carrier')}</p>
                  <p className="text-sm font-medium text-foreground">{order.shipping_agent_code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t('orders.trackingCode')}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-secondary px-2 py-1.5 text-xs font-mono text-foreground truncate">
                      {order.tracking_code}
                    </code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyTrackingCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {order.tracking_link && (
                  <a 
                    href={order.tracking_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 active:scale-[0.98]"
                  >
                    {t('orders.trackShipment')}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Delivery Address */}
          <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <MapPin className="h-4 w-4 text-accent" />
              <h3 className="font-heading text-sm md:text-base font-semibold text-foreground">
                {t('orders.deliveryAddress')}
              </h3>
            </div>
            <div className="space-y-0.5 text-sm">
              <p className="font-medium text-foreground">{order.ship_to_name}</p>
              <p className="text-muted-foreground">{order.ship_to_address}</p>
              <p className="text-muted-foreground">
                {order.ship_to_postcode} {order.ship_to_city}
              </p>
              <p className="text-muted-foreground">{order.ship_to_country}</p>
            </div>
          </div>

          {/* Order Details */}
          <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <Calendar className="h-4 w-4 text-accent" />
              <h3 className="font-heading text-sm md:text-base font-semibold text-foreground">
                {t('orders.details')}
              </h3>
            </div>
            <div className="space-y-2 md:space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('orders.orderDate')}</span>
                <span className="font-medium text-foreground">
                  {new Date(order.order_date).toLocaleDateString('de-CH')}
                </span>
              </div>
              {order.posted_shipment_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('orders.shipmentDate')}</span>
                  <span className="font-medium text-foreground">
                    {new Date(order.posted_shipment_date).toLocaleDateString('de-CH')}
                  </span>
                </div>
              )}
              {(order as any).invoice_no && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('orders.invoiceNo') || 'Rechnungsnummer'}</span>
                  <span className="font-medium text-foreground">{(order as any).invoice_no}</span>
                </div>
              )}
              {(order as any).invoice_amount !== undefined && (order as any).invoice_amount !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('orders.invoiceAmount') || 'Rechnungsbetrag'}</span>
                  <span className="font-medium text-foreground">
                    CHF {Number((order as any).invoice_amount).toFixed(2)}
                  </span>
                </div>
              )}
              {(order as any).payment_state !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('orders.paymentState') || 'Zahlungsstatus'}</span>
                  <Badge variant={(order as any).payment_state ? 'default' : 'secondary'} className="text-xs">
                    {(order as any).payment_state ? (t('orders.paid') || 'Bezahlt') : (t('orders.unpaid') || 'Offen')}
                  </Badge>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('orders.client')}</span>
                <span className="font-medium text-foreground">{order.company_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('orders.customerNo')}</span>
                <span className="font-medium text-foreground">{order.customer_no || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('orders.externalRef')}</span>
                <span className="font-medium text-foreground">{order.external_document_no || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
