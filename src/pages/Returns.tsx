import { useState, useCallback, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ArrowRight, RotateCcw, X, Search, Download } from '@/components/icons';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { getReturnStatusLabel, getReturnStatusVariant, ReturnStatus } from '@/services/dataService';
import { useReturnsPaginated } from '@/hooks/useReturnsPaginated';
import { cn } from '@/lib/utils';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import { CardSkeleton } from '@/components/ui/table-skeleton';
import { NoResultsState } from '@/components/ui/empty-state';
import { OrdersPagination } from '@/components/orders/OrdersPagination';
import { CompanyFilterDropdown } from '@/components/filters/CompanyFilterDropdown';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { usePageKeyboardShortcuts } from '@/hooks/usePageKeyboardShortcuts';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { exportToCSV, RETURNS_EXPORT_COLUMNS, formatDateForExport } from '@/lib/exportUtils';
import { UniversalDataImport } from '@/components/import/UniversalDataImport';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import { ReturnRatesWidget } from '@/components/analytics/ReturnRatesWidget';

// Status filter options
type StatusFilterOption = 'all' | 'open' | 'processing' | 'completed';

export default function Returns() {
  const { activeCompanyId, role } = useAuth();
  const { t } = useLanguage();
  
  // Status filters with translation keys
  const STATUS_FILTERS: { value: StatusFilterOption; labelKey: string; statuses: ReturnStatus[] | null }[] = [
    { value: 'all', labelKey: 'common.all', statuses: null },
    { value: 'open', labelKey: 'returns.open', statuses: ['initiated', 'in_transit', 'received'] },
    { value: 'processing', labelKey: 'returns.processing', statuses: ['processing'] },
    { value: 'completed', labelKey: 'returns.completed', statuses: ['completed'] },
  ];
  
  // Export permission - only Admin and above
  const canExport = ['admin', 'msd_csm', 'msd_ma', 'system_admin'].includes(role || '');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Status filter state
  const [activeFilter, setActiveFilter] = useState<StatusFilterOption>('all');
  
  // Debounced search
  const { inputValue: search, debouncedValue: debouncedSearch, setInputValue: setSearch } = useDebouncedSearch('', 300);

  // Date range filter - uses global default from hook (last_30_days)
  const { preset: datePreset, dateRange, dateFrom, dateTo, setPreset: setDatePreset, setCustomRange } = useDateRangeFilter();

  // Determine which company to filter by
  // "ALL" means show all companies (for MSD staff)
  const effectiveCompanyId = activeCompanyId === 'ALL' ? undefined : (activeCompanyId || undefined);

  // Get the status filter for the API
  const getStatusFilterForApi = (): ReturnStatus | ReturnStatus[] | undefined => {
    const filter = STATUS_FILTERS.find(f => f.value === activeFilter);
    if (!filter?.statuses) return undefined;
    if (filter.statuses.length === 1) return filter.statuses[0];
    return filter.statuses;
  };

  // Reset to page 1 when search or filter changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: StatusFilterOption) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  // React Query: Fetch returns with server-side pagination
  const { data, isLoading: loading, refetch } = useReturnsPaginated({
    companyId: effectiveCompanyId,
    search: debouncedSearch,
    statusFilter: getStatusFilterForApi(),
    page: currentPage,
    pageSize,
    dateFrom,
    dateTo,
  });

  const returns = data?.data || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Realtime subscription - reload full data to get related order info
  useRealtimeSubscription({
    table: 'returns',
    onAnyChange: () => {
      refetch();
      toast.info(t('returns.updated'));
    },
  });

  // Calculate counts from current page data
  const openCount = returns.filter(r => ['initiated', 'in_transit', 'received'].includes(r.status)).length;
  const processingCount = returns.filter(r => r.status === 'processing').length;
  const completedCount = returns.filter(r => r.status === 'completed').length;

  const hasActiveFilters = search !== '' || activeFilter !== 'all';

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearch('');
    setActiveFilter('all');
    setCurrentPage(1);
  }, [setSearch]);

  // Export functionality
  const handleExport = useCallback(() => {
    if (returns.length === 0) {
      toast.error(t('common.noDataToExport'));
      return;
    }
    
    const exportData = returns.map(r => ({
      id: r.id,
      return_date: formatDateForExport(r.return_date),
      order_source_no: r.order?.source_no || '',
      company_id: r.company_id,
      status: r.status,
      amount: r.amount?.toFixed(2) || '',
      reason: r.reason || '',
    }));
    
    const filename = `returns_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(exportData, RETURNS_EXPORT_COLUMNS, filename);
    toast.success(`${returns.length} ${t('returns.returnsExported')}`);
  }, [returns, t]);

  // Keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);
  usePageKeyboardShortcuts({
    onFocusSearch: () => searchInputRef.current?.focus(),
    onClearFilters: clearFilters,
    onExport: handleExport,
    onRefresh: () => refetch(),
  });

  const isMobile = useIsMobile();

  // Swipe navigation for mobile pagination
  useSwipeNavigation({
    onSwipeLeft: () => {
      if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    },
    onSwipeRight: () => {
      if (currentPage > 1) setCurrentPage(currentPage - 1);
    },
    enabled: isMobile && totalPages > 1,
  });

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // Calculate display range
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);


  return (
    <MainLayout title={t('nav.returns')} subtitle={t('returns.subtitle')}>
      {/* Return Rates Analytics Widget */}
      <div className="mb-4 md:mb-6">
        <ReturnRatesWidget />
      </div>

      {/* Stats - clickable as filters */}
      <div className="mb-4 md:mb-6 grid gap-3 md:gap-4 grid-cols-3">
        <button
          onClick={() => handleFilterChange('open')}
          className={cn(
            "rounded-xl border bg-card p-3 md:p-5 shadow-card text-left transition-all",
            activeFilter === 'open' 
              ? "border-status-return ring-2 ring-status-return/20" 
              : "border-border hover:border-status-return/50"
          )}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-status-return/10">
              <RotateCcw className="h-4 w-4 md:h-5 md:w-5 text-status-return" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{t('returns.open')}</p>
              <p className="font-heading text-lg md:text-2xl font-bold text-foreground">
                {openCount}
              </p>
            </div>
          </div>
        </button>
        <button
          onClick={() => handleFilterChange('processing')}
          className={cn(
            "rounded-xl border bg-card p-3 md:p-5 shadow-card text-left transition-all",
            activeFilter === 'processing' 
              ? "border-status-processing ring-2 ring-status-processing/20" 
              : "border-border hover:border-status-processing/50"
          )}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-status-processing/10">
              <Package className="h-4 w-4 md:h-5 md:w-5 text-status-processing" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{t('returns.processing')}</p>
              <p className="font-heading text-lg md:text-2xl font-bold text-foreground">
                {processingCount}
              </p>
            </div>
          </div>
        </button>
        <button
          onClick={() => handleFilterChange('completed')}
          className={cn(
            "rounded-xl border bg-card p-3 md:p-5 shadow-card text-left transition-all",
            activeFilter === 'completed' 
              ? "border-status-shipped ring-2 ring-status-shipped/20" 
              : "border-border hover:border-status-shipped/50"
          )}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-status-shipped/10">
              <Package className="h-4 w-4 md:h-5 md:w-5 text-status-shipped" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{t('returns.completed')}</p>
              <p className="font-heading text-lg md:text-2xl font-bold text-foreground">
                {completedCount}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Company Filter, Search and Filter Pills */}
      <div className="mb-4 md:mb-6 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Company Filter */}
          <CompanyFilterDropdown className="w-full sm:w-[180px]" />

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder={`${t('returns.searchPlaceholder')} (${t('misc.shortcuts')} /)`}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9 w-full"
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
          <UniversalDataImport />
          
          {canExport && (
            <Button variant="outline" className="gap-2 shrink-0" onClick={handleExport} disabled={returns.length === 0}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('common.export')}</span>
            </Button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={activeFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange(filter.value)}
              className="h-8"
            >
              {t(filter.labelKey)}
            </Button>
          ))}
        </div>

        {/* Date Range Filter */}
        <DateRangeFilter
          preset={datePreset}
          dateRange={dateRange}
          onPresetChange={(newPreset) => {
            setDatePreset(newPreset);
            setCurrentPage(1);
          }}
          onCustomRangeChange={(from, to) => {
            setCustomRange({ from, to });
            setCurrentPage(1);
          }}
          onClear={() => {
            setDatePreset('all_time');
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Results count with active filters and Pagination */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span>{totalItems} {t('returns.found')}</span>
          {hasActiveFilters && (
            <>
              <span>·</span>
              {activeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full">
                  {t(STATUS_FILTERS.find(f => f.value === activeFilter)?.labelKey || '')}
                  <button 
                    onClick={() => handleFilterChange('all')}
                    className="hover:bg-muted-foreground/20 rounded-full p-0.5"
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
            </>
          )}
        </div>
        
        {/* Pagination controls - moved to top */}
        {totalItems > 0 && (
          <OrdersPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            pageSize={pageSize}
            pageSizeOptions={[25, 50, 100]}
            canGoPrevious={currentPage > 1}
            canGoNext={currentPage < totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>

      {/* Returns List */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="border-b border-border px-4 md:px-6 py-3 md:py-4">
          <h3 className="font-heading text-sm md:text-base font-semibold text-foreground">
            {activeFilter === 'all' ? t('returns.all') : t(STATUS_FILTERS.find(f => f.value === activeFilter)?.labelKey || '')}
          </h3>
        </div>
        
        {loading ? (
          <div className="p-4">
            <CardSkeleton count={4} />
          </div>
        ) : returns.length === 0 && (debouncedSearch || activeFilter !== 'all') ? (
          <div className="p-4">
            <NoResultsState 
              searchTerm={debouncedSearch || t(STATUS_FILTERS.find(f => f.value === activeFilter)?.labelKey || '')} 
              onClear={() => {
                handleSearchChange('');
                handleFilterChange('all');
              }}
            />
          </div>
        ) : returns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RotateCcw className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{t('returns.none')}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {returns.map((returnItem, index) => (
              <Link
                key={returnItem.id}
                to={returnItem.order_id ? `/orders/${returnItem.order_id}` : '#'}
                className={cn(
                  "flex items-start md:items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 transition-colors hover:bg-secondary/30 active:bg-secondary/50",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-status-return/10 shrink-0">
                  <RotateCcw className="h-4 w-4 md:h-5 md:w-5 text-status-return" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center gap-0.5 md:gap-2 mb-0.5">
                    <span className="font-medium text-foreground text-sm md:text-base">
                      #{returnItem.order?.source_no || 'N/A'}
                    </span>
                    <span className="text-xs md:text-sm text-muted-foreground">
                      {returnItem.order?.company_name || returnItem.company_id}
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground truncate">
                    {returnItem.order?.ship_to_name || t('common.unknown')} – <span className="tabular-nums">CHF {Number(returnItem.amount).toFixed(2)}</span>
                  </p>
                  {returnItem.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate md:hidden">
                      {returnItem.reason}
                    </p>
                  )}
                </div>
                <div className="flex flex-col md:flex-row items-end md:items-center gap-2 shrink-0">
                  <Badge variant={getReturnStatusVariant(returnItem.status) as any} className="text-xs">
                    {getReturnStatusLabel(returnItem.status)}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Pagination */}
      {returns.length > 0 && (
        <div className="mt-4">
          <OrdersPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            pageSize={pageSize}
            pageSizeOptions={[25, 50, 100]}
            canGoPrevious={currentPage > 1}
            canGoNext={currentPage < totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </MainLayout>
  );
}
