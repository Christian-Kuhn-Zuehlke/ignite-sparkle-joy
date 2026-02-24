import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ExternalLink, ChevronRight, MapPin, Calendar, Package, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Order, getStatusColor, getStatusLabel } from '@/services/dataService';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBranding } from '@/contexts/BrandingContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SLABadge } from './SLABadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Golf ball icon for Golfyr branding
function GolfBallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="8" cy="9" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="14" cy="8" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="11" cy="13" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export type SortField = 'source_no' | 'company_name' | 'ship_to_name' | 'order_date' | 'order_amount' | 'status' | 'tracking_code';
export type SortDirection = 'asc' | 'desc';

interface OrdersTableProps {
  orders: Order[];
  selectable?: boolean;
  isSelected?: (orderId: string) => boolean;
  onToggleSelect?: (orderId: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  selectedCount?: number;
  // Sorting props
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
}

const ROW_HEIGHT = 64;
const VIRTUALIZATION_THRESHOLD = 100; // Increased threshold - use normal table for up to 100 items

// Mobile Card View
function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-lg p-4 cursor-pointer",
        "transition-all hover:shadow-md hover:border-accent/50 active:scale-[0.98]"
      )}
    >
      {/* Header: Order # and Status */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-semibold text-foreground">#{order.source_no}</span>
          <p className="text-xs text-muted-foreground">{order.company_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <SLABadge orderId={order.id} compact />
          <Badge variant={getStatusColor(order.status) as any} className="text-xs">
            {getStatusLabel(order.status)}
          </Badge>
        </div>
      </div>
      
      {/* Recipient */}
      <div className="flex items-start gap-2 mb-2">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground truncate">{order.ship_to_name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {order.ship_to_city}, {order.ship_to_country}
          </p>
        </div>
      </div>
      
      {/* Footer: Date, Amount, Tracking */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(order.order_date).toLocaleDateString('de-CH')}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm tabular-nums">
            CHF {Number(order.order_amount).toFixed(0)}
          </span>
          {order.tracking_code && (
            <a 
              href={order.tracking_link || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

// Virtualized Mobile Card List
function VirtualizedOrderCards({ orders }: { orders: Order[] }) {
  const navigate = useNavigate();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // Estimated card height
    overscan: 5,
  });

  const handleClick = useCallback((orderId: string) => {
    navigate(`/orders/${orderId}`);
  }, [navigate]);

  return (
    <div 
      ref={parentRef} 
      className="max-h-[calc(100vh-280px)] min-h-[400px] overflow-auto"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const order = orders[virtualItem.index];
          return (
            <div
              key={order.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
                padding: '6px 0',
              }}
            >
              <OrderCard 
                order={order} 
                onClick={() => handleClick(order.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Desktop Table Row with optional checkbox
function OrderTableRow({ 
  order, 
  onClick, 
  selectable,
  isSelected,
  onToggleSelect,
}: { 
  order: Order; 
  onClick: () => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  return (
    <TableRow 
      onClick={onClick}
      className={cn(
        "group cursor-pointer transition-all hover:bg-accent/10 hover:shadow-sm",
        isSelected && "bg-primary/5"
      )}
    >
      {selectable && (
        <TableCell className="w-12">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect?.()}
            onClick={(e) => e.stopPropagation()}
            className="data-[state=checked]:bg-primary"
          />
        </TableCell>
      )}
      <TableCell>
        <span className="font-medium text-foreground group-hover:text-accent transition-colors">
          #{order.source_no}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground">{order.company_name}</span>
      </TableCell>
      <TableCell>
        <div className="max-w-[200px]">
          <p className="font-medium text-foreground truncate">{order.ship_to_name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {order.ship_to_city}, {order.ship_to_country}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-muted-foreground">
          {new Date(order.order_date).toLocaleDateString('de-CH')}
        </span>
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums">
        CHF {Number(order.order_amount).toFixed(2)}
      </TableCell>
      <TableCell>
        <Badge variant={getStatusColor(order.status) as any}>
          {getStatusLabel(order.status)}
        </Badge>
      </TableCell>
      <TableCell>
        <SLABadge orderId={order.id} compact />
      </TableCell>
      <TableCell>
        {order.tracking_code ? (
          <a 
            href={order.tracking_link || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent/80"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="max-w-[100px] truncate">{order.tracking_code}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
      </TableCell>
    </TableRow>
  );
}

// Sortable Header Component
function SortableHeader({ 
  field, 
  label, 
  sortField, 
  sortDirection, 
  onSort,
  className,
}: { 
  field: SortField; 
  label: string; 
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
  className?: string;
}) {
  const isActive = sortField === field;
  
  return (
    <TableHead 
      className={cn(
        "font-semibold cursor-pointer select-none transition-colors hover:bg-accent/10 group",
        isActive && "text-primary",
        className
      )}
      onClick={() => onSort?.(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className={cn(
          "transition-opacity",
          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-50"
        )}>
          {isActive ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5" />
          )}
        </span>
      </div>
    </TableHead>
  );
}

// Virtualized Desktop Table
function VirtualizedOrdersTable({ 
  orders, 
  sortField, 
  sortDirection, 
  onSort 
}: { 
  orders: Order[];
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
}) {
  const navigate = useNavigate();
  const parentRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  const virtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const handleRowClick = useCallback((orderId: string) => {
    navigate(`/orders/${orderId}`);
  }, [navigate]);

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/50">
            <SortableHeader field="source_no" label={t('orders.orderNo')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
            <SortableHeader field="company_name" label={t('orders.customer')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
            <SortableHeader field="ship_to_name" label={t('orders.recipient')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
            <SortableHeader field="order_date" label={t('common.date')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
            <SortableHeader field="order_amount" label={t('common.amount')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="text-right" />
            <SortableHeader field="status" label={t('common.status')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
            <TableHead className="font-semibold">SLA</TableHead>
            <SortableHeader field="tracking_code" label={t('orders.tracking')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
      </Table>
      <div 
        ref={parentRef} 
        className="max-h-[calc(100vh-320px)] min-h-[400px] overflow-auto"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <Table>
            <TableBody>
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const order = orders[virtualItem.index];
                return (
                  <tr
                    key={order.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                      display: 'table',
                      tableLayout: 'fixed',
                    }}
                    onClick={() => handleRowClick(order.id)}
                    className="group cursor-pointer transition-all hover:bg-accent/10"
                  >
                    <td className="p-4 align-middle" style={{ width: '10%' }}>
                      <span className="font-medium text-foreground group-hover:text-accent transition-colors">
                        #{order.source_no}
                      </span>
                    </td>
                    <td className="p-4 align-middle" style={{ width: '12%' }}>
                      <span className="text-muted-foreground">{order.company_name}</span>
                    </td>
                    <td className="p-4 align-middle" style={{ width: '18%' }}>
                      <div className="max-w-[200px]">
                        <p className="font-medium text-foreground truncate">{order.ship_to_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.ship_to_city}, {order.ship_to_country}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 align-middle" style={{ width: '10%' }}>
                      <span className="text-muted-foreground">
                        {new Date(order.order_date).toLocaleDateString('de-CH')}
                      </span>
                    </td>
                    <td className="p-4 align-middle text-right font-medium tabular-nums" style={{ width: '10%' }}>
                      CHF {Number(order.order_amount).toFixed(2)}
                    </td>
                    <td className="p-4 align-middle" style={{ width: '10%' }}>
                      <Badge variant={getStatusColor(order.status) as any}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle" style={{ width: '8%' }}>
                      <SLABadge orderId={order.id} compact />
                    </td>
                    <td className="p-4 align-middle" style={{ width: '12%' }}>
                      {order.tracking_code ? (
                        <a 
                          href={order.tracking_link || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="max-w-[100px] truncate">{order.tracking_code}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-4 align-middle" style={{ width: '5%' }}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                    </td>
                  </tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// Non-virtualized Desktop Table (for small datasets) with selection support
function OrdersTableDesktop({ 
  orders,
  selectable,
  isSelected,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  selectedCount,
  sortField,
  sortDirection,
  onSort,
}: { 
  orders: Order[];
  selectable?: boolean;
  isSelected?: (orderId: string) => boolean;
  onToggleSelect?: (orderId: string) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  selectedCount?: number;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSort?: (field: SortField) => void;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleRowClick = useCallback((orderId: string) => {
    navigate(`/orders/${orderId}`);
  }, [navigate]);

  const allSelected = selectable && selectedCount === orders.length && orders.length > 0;
  const someSelected = selectable && (selectedCount ?? 0) > 0 && !allSelected;

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/50">
            {selectable && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) (el as any).indeterminate = someSelected;
                  }}
                  onCheckedChange={() => {
                    if (allSelected || someSelected) {
                      onClearSelection?.();
                    } else {
                      onSelectAll?.();
                    }
                  }}
                  className="data-[state=checked]:bg-primary"
                />
              </TableHead>
            )}
            <SortableHeader field="source_no" label={t('orders.orderNo')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
            <SortableHeader field="company_name" label={t('orders.customer')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
            <SortableHeader field="ship_to_name" label={t('orders.recipient')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
            <SortableHeader field="order_date" label={t('common.date')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
            <SortableHeader field="order_amount" label={t('common.amount')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} className="text-right" />
            <SortableHeader field="status" label={t('common.status')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
            <TableHead className="font-semibold">SLA</TableHead>
            <SortableHeader field="tracking_code" label={t('orders.tracking')} sortField={sortField} sortDirection={sortDirection} onSort={onSort} />
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <OrderTableRow 
              key={order.id} 
              order={order} 
              onClick={() => handleRowClick(order.id)}
              selectable={selectable}
              isSelected={isSelected?.(order.id)}
              onToggleSelect={() => onToggleSelect?.(order.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function OrdersTable({ 
  orders,
  selectable,
  isSelected,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  selectedCount,
  sortField,
  sortDirection,
  onSort,
}: OrdersTableProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { brand } = useBranding();
  const { t } = useLanguage();
  const isGolfBranded = brand.iconTheme === 'golf';

  // Use virtualization for large datasets
  const useVirtualization = orders.length > VIRTUALIZATION_THRESHOLD;

  if (orders.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 md:p-12 shadow-card text-center">
        {isGolfBranded ? (
          <GolfBallIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        ) : (
          <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        )}
        <p className="text-muted-foreground">{t('common.noOrdersFound')}</p>
      </div>
    );
  }

  // Mobile views - no bulk selection support for now
  if (isMobile) {
    if (useVirtualization) {
      return <VirtualizedOrderCards orders={orders} />;
    }
    return (
      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard 
            key={order.id} 
            order={order} 
            onClick={() => navigate(`/orders/${order.id}`)}
          />
        ))}
      </div>
    );
  }

  // Desktop views
  if (useVirtualization) {
    return (
      <VirtualizedOrdersTable 
        orders={orders} 
        sortField={sortField}
        sortDirection={sortDirection}
        onSort={onSort}
      />
    );
  }
  return (
    <OrdersTableDesktop 
      orders={orders}
      selectable={selectable}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      onSelectAll={onSelectAll}
      onClearSelection={onClearSelection}
      selectedCount={selectedCount}
      sortField={sortField}
      sortDirection={sortDirection}
      onSort={onSort}
    />
  );
}
