import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Download, ArrowUp, ArrowDown, X, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { OrdersTable, SortField, SortDirection } from '@/components/orders/OrdersTable';
import { OrdersPagination } from '@/components/orders/OrdersPagination';
import { BulkActionsBar } from '@/components/orders/BulkActionsBar';
import { CompanyFilterDropdown } from '@/components/filters/CompanyFilterDropdown';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Order, OrderStatus } from '@/services/dataService';
import { useOrdersPaginated } from '@/hooks/useOrdersPaginated';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useBulkOrderOperations } from '@/hooks/useBulkOrderOperations';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import { TableSkeleton, CardSkeleton } from '@/components/ui/table-skeleton';
import { NoResultsState } from '@/components/ui/empty-state';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePageKeyboardShortcuts } from '@/hooks/usePageKeyboardShortcuts';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { exportToCSV, ORDER_EXPORT_COLUMNS, formatDateForExport } from '@/lib/exportUtils';
import { UniversalDataImport } from '@/components/import/UniversalDataImport';
import { SyncAllOrdersButton } from '@/components/orders/SyncAllOrdersButton';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import { ShippingTimeWidget } from '@/components/analytics/ShippingTimeWidget';
import { CarrierPerformanceWidget } from '@/components/dashboard/CarrierPerformanceWidget';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Orders() {
  const { activeCompanyId, role } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Status filters with translation keys
  const statusFilters = [
    { id: 'all', labelKey: 'common.all' },
    { id: 'pending', labelKey: 'orders.inProgress' },
    { id: 'received', labelKey: 'status.received' },
    { id: 'picking', labelKey: 'status.picking' },
    { id: 'packing', labelKey: 'status.packing' },
    { id: 'ready_to_ship', labelKey: 'status.readyToShip' },
    { id: 'shipped', labelKey: 'status.shipped' },
  ];

  // Sort options with translation keys (used in dropdown menu)
  const sortOptions: { field: SortField; labelKey: string }[] = [
    { field: 'order_date', labelKey: 'common.date' },
    { field: 'order_amount', labelKey: 'common.amount' },
    { field: 'ship_to_name', labelKey: 'orders.recipient' },
    { field: 'source_no', labelKey: 'orders.orderNo' },
    { field: 'company_name', labelKey: 'orders.customer' },
    { field: 'status', labelKey: 'common.status' },
    { field: 'tracking_code', labelKey: 'orders.tracking' },
  ];
  
  // Export permission - only Admin and above
  const canExport = ['admin', 'msd_csm', 'msd_ma', 'system_admin'].includes(role || '');
  // Bulk operations permission - only Admin and above
  const canBulkEdit = ['admin', 'msd_csm', 'msd_ma', 'system_admin'].includes(role || '');
  
  // Bulk operations state
  const {
    selectedCount,
    toggleOrder,
    selectAll,
    clearSelection,
    isSelected,
    updateSelectedOrders,
    isUpdating,
  } = useBulkOrderOperations();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // Debounced search - shows input immediately, debounces server request
  const { 
    inputValue: search, 
    debouncedValue: debouncedSearch, 
    setInputValue: setSearch, 
    isDebouncing 
  } = useDebouncedSearch('', 400);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('order_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Read status and SLA filter from URL params
  const urlStatus = searchParams.get('status');
  const urlSlaFilter = searchParams.get('sla');
  const [activeFilter, setActiveFilter] = useState(() => {
    if (urlStatus === 'pending') return 'pending';
    if (urlStatus && statusFilters.some(f => f.id === urlStatus)) return urlStatus;
    return 'all';
  });
  const [slaFilter, setSlaFilter] = useState<'all' | 'met' | 'at-risk' | 'breached'>(() => {
    if (urlSlaFilter === 'met' || urlSlaFilter === 'at-risk' || urlSlaFilter === 'breached') {
      return urlSlaFilter;
    }
    return 'all';
  });

  // Date range filter - uses global default from hook (last_30_days)
  const { preset: datePreset, dateRange, dateFrom, dateTo, setPreset: setDatePreset, setCustomRange } = useDateRangeFilter();

  // Determine which company to filter by
  const effectiveCompanyId = activeCompanyId === 'ALL' ? undefined : (activeCompanyId || undefined);

  // Server-side paginated query
  const { 
    data: paginatedData, 
    isLoading, 
    isFetching,
    error, 
    refetch 
  } = useOrdersPaginated({
    statusFilter: activeFilter === 'all' ? undefined : activeFilter as OrderStatus | 'pending',
    companyId: effectiveCompanyId,
    search: debouncedSearch || undefined,
    sortField,
    sortDirection,
    page,
    pageSize,
    slaFilter: slaFilter === 'all' ? undefined : slaFilter,
    dateFrom,
    dateTo,
  });

  const orders = paginatedData?.data || [];
  const totalItems = paginatedData?.total || 0;
  const totalPages = paginatedData?.totalPages || 1;

  // Reset to page 1 when filters change
  const handleFilterChange = useCallback((newFilter: string) => {
    setActiveFilter(newFilter);
    setPage(1); // Reset to first page
    const newParams = new URLSearchParams(searchParams);
    if (newFilter === 'all') {
      newParams.delete('status');
    } else {
      newParams.set('status', newFilter);
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Handle SLA filter change
  const handleSlaFilterChange = useCallback((newSlaFilter: 'all' | 'met' | 'at-risk' | 'breached') => {
    setSlaFilter(newSlaFilter);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (newSlaFilter === 'all') {
      newParams.delete('sla');
    } else {
      newParams.set('sla', newSlaFilter);
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Reset to page 1 when search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (value !== search) {
      setPage(1);
    }
  }, [search, setSearch]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    handleFilterChange('all');
    handleSlaFilterChange('all');
    setSearch('');
    setPage(1);
  }, [handleFilterChange, handleSlaFilterChange, setSearch]);

  // Toggle sort direction or set new field
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(1); // Reset to first page when sorting changes
  }, [sortField]);

  // Realtime subscription - invalidate paginated queries on change
  useRealtimeSubscription<Order>({
    table: 'orders',
    onInsert: () => {
      toast.info(t('orders.newOrderReceived'));
      queryClient.invalidateQueries({ queryKey: ['orders-paginated'] });
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ['orders-paginated'] });
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ['orders-paginated'] });
    },
  });

  // Export functionality
  const handleExport = useCallback(() => {
    if (orders.length === 0) {
      toast.error(t('common.noDataToExport'));
      return;
    }
    
    const exportData = orders.map(order => ({
      ...order,
      order_date: formatDateForExport(order.order_date),
      order_amount: order.order_amount?.toFixed(2) || '',
    }));
    
    const filename = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(exportData, ORDER_EXPORT_COLUMNS, filename);
    toast.success(`${orders.length} ${t('orders.ordersExported')}`);
  }, [orders, t]);

  // Keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  usePageKeyboardShortcuts({
    onFocusSearch: () => searchInputRef.current?.focus(),
    onClearFilters: clearFilters,
    onExport: handleExport,
    onRefresh: () => refetch(),
  });

  // Swipe navigation for mobile pagination
  useSwipeNavigation({
    onSwipeLeft: () => {
      if (page < totalPages) setPage(page + 1);
    },
    onSwipeRight: () => {
      if (page > 1) setPage(page - 1);
    },
    enabled: isMobile && totalPages > 1,
  });

  // Check if any filters are active
  const hasActiveFilters = activeFilter !== 'all' || search !== '' || slaFilter !== 'all';

  // Pagination helpers
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalItems);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  return (
    <MainLayout title={t('nav.orders')} subtitle={t('orders.subtitle')}>
      {/* Shipping & Carrier Analytics Widgets */}
      <div className="mb-4 md:mb-6 grid gap-4 grid-cols-1 lg:grid-cols-2">
        <ShippingTimeWidget />
        <CarrierPerformanceWidget />
      </div>

      {/* Toolbar */}
      <div className="mb-4 md:mb-6 flex flex-col gap-3 md:gap-4">
        {/* Company Filter + Search Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Company Filter */}
          <CompanyFilterDropdown className="w-full sm:w-[180px]" />

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder={`${t('orders.searchPlaceholder')} (${t('misc.shortcuts')} /)`}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-9"
            />
            {search && (
              <button 
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 shrink-0">
                {sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                <span className="hidden sm:inline">
                  {t(sortOptions.find(s => s.field === sortField)?.labelKey || 'common.date')}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('orders.sortBy')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {sortOptions.map((option) => (
                <DropdownMenuItem
                  key={option.field}
                  onClick={() => handleSort(option.field)}
                  className="flex items-center justify-between gap-4"
                >
                  <span>{t(option.labelKey)}</span>
                  {sortField === option.field && (
                    sortDirection === 'asc' 
                      ? <ArrowUp className="h-3 w-3 text-primary" /> 
                      : <ArrowDown className="h-3 w-3 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <UniversalDataImport />

          {/* Sync All Orders Button */}
          <SyncAllOrdersButton onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['orders-paginated'] });
          }} />
          
          {canExport && (
            <Button variant="outline" className="gap-2 shrink-0" onClick={handleExport} disabled={orders.length === 0}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.export')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="mb-4">
        <DateRangeFilter
          preset={datePreset}
          dateRange={dateRange}
          onPresetChange={(newPreset) => {
            setDatePreset(newPreset);
            setPage(1);
          }}
          onCustomRangeChange={(from, to) => {
            setCustomRange({ from, to });
            setPage(1);
          }}
          onClear={() => {
            setDatePreset('all_time');
            setPage(1);
          }}
        />
      </div>

      {/* Status Filters - Horizontal scroll on mobile */}
      <div className="mb-4 md:mb-6 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 min-w-max">
          {statusFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => handleFilterChange(filter.id)}
              className={`rounded-full px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                activeFilter === filter.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {t(filter.labelKey)}
            </button>
          ))}
          
          {/* SLA Filter separator */}
          <span className="border-l border-border mx-1" />
          
          {/* SLA Filters */}
          {[
            { id: 'all' as const, labelKey: 'orders.slaAll', color: '' },
            { id: 'met' as const, labelKey: 'orders.slaMet', color: 'text-green-600' },
            { id: 'at-risk' as const, labelKey: 'orders.slaAtRisk', color: 'text-yellow-600' },
            { id: 'breached' as const, labelKey: 'orders.slaBreached', color: 'text-red-600' },
          ].map((filter) => (
            <button
              key={`sla-${filter.id}`}
              onClick={() => handleSlaFilterChange(filter.id)}
              className={`rounded-full px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                slaFilter === filter.id
                  ? filter.id === 'met' 
                    ? 'bg-green-500 text-white shadow-sm'
                    : filter.id === 'at-risk'
                    ? 'bg-yellow-500 text-white shadow-sm'
                    : filter.id === 'breached'
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-primary text-primary-foreground shadow-sm'
                  : `bg-secondary text-secondary-foreground hover:bg-secondary/80 ${filter.color}`
              }`}
            >
              {t(filter.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count, Active Filters and Pagination */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {totalItems.toLocaleString()} {t('nav.orders')} {t('orders.found')}
            {(isFetching || isDebouncing) && (
              <Loader2 className="inline-block ml-2 h-3 w-3 animate-spin" />
            )}
          </span>
          
          {/* Active filter badges */}
          {hasActiveFilters && (
            <>
              <span className="text-muted-foreground">·</span>
              {activeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs px-2 py-1 rounded-full">
                  {t(statusFilters.find(s => s.id === activeFilter)?.labelKey || '')}
                  <button 
                    onClick={() => handleFilterChange('all')}
                    className="hover:bg-accent/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {search && (
                <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
                  "{search}"
                  <button 
                    onClick={() => handleSearchChange('')}
                    className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {slaFilter !== 'all' && (
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  slaFilter === 'met' ? 'bg-green-100 text-green-700' :
                  slaFilter === 'at-risk' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  SLA: {slaFilter === 'met' ? t('orders.slaMet') : slaFilter === 'at-risk' ? t('orders.slaAtRisk') : t('orders.slaBreached')}
                  <button 
                    onClick={() => handleSlaFilterChange('all')}
                    className="hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button 
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                {t('orders.clearFilters')}
              </button>
            </>
          )}
        </div>
        
        {/* Pagination controls - moved to top */}
        {totalItems > 0 && (
          <OrdersPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            canGoNext={page < totalPages}
            canGoPrevious={page > 1}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-4">
            <p className="text-destructive font-medium">
              {t('orders.loadError')}
            </p>
            {error instanceof Error && (
              <p className="text-sm text-muted-foreground">
                {error.message}
              </p>
            )}
            <Button onClick={() => refetch()} variant="outline">
              {t('orders.tryAgain')}
            </Button>
          </div>
        </div>
      )}

      {/* Orders Table with Skeleton Loading */}
      {!error && isLoading ? (
        isMobile ? (
          <CardSkeleton count={5} />
        ) : (
          <TableSkeleton columns={9} rows={8} />
        )
      ) : orders.length === 0 && debouncedSearch ? (
        <NoResultsState 
          searchTerm={debouncedSearch} 
          onClear={() => handleSearchChange('')}
        />
      ) : (
        <div className="relative">
          {/* Orders table - server returns only current page */}
          <OrdersTable 
            orders={orders} 
            selectable={canBulkEdit}
            isSelected={isSelected}
            onToggleSelect={toggleOrder}
            onSelectAll={() => selectAll(orders.map(o => o.id))}
            onClearSelection={clearSelection}
            selectedCount={selectedCount}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
          
          {/* Bottom Pagination */}
          {totalItems > 0 && (
            <div className="mt-4">
              <OrdersPagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                startIndex={startIndex}
                endIndex={endIndex}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                canGoNext={page < totalPages}
                canGoPrevious={page > 1}
                onPageChange={setPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          )}
        </div>
      )}
      
      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onUpdateStatus={updateSelectedOrders}
        isUpdating={isUpdating}
      />
    </MainLayout>
  );
}
