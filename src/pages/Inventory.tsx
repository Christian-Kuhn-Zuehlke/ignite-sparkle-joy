import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, AlertTriangle, Package, X, Download, ChevronUp, ChevronDown, Edit2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InventoryItem } from '@/services/dataService';
import { useInventoryPaginated, InventorySortField } from '@/hooks/useInventoryPaginated';
import { cn } from '@/lib/utils';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import { TableSkeleton, CardSkeleton } from '@/components/ui/table-skeleton';
import { NoResultsState } from '@/components/ui/empty-state';
import { OrdersPagination } from '@/components/orders/OrdersPagination';
import { CompanyFilterDropdown } from '@/components/filters/CompanyFilterDropdown';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { usePageKeyboardShortcuts } from '@/hooks/usePageKeyboardShortcuts';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { exportToCSV, INVENTORY_EXPORT_COLUMNS } from '@/lib/exportUtils';
import { UniversalDataImport } from '@/components/import/UniversalDataImport';
import { SyncInventoryButton } from '@/components/inventory/SyncInventoryButton';
import { useDateRangeFilter } from '@/hooks/useDateRangeFilter';
import { EditThresholdDialog } from '@/components/inventory/EditThresholdDialog';
import { InventoryTurnoverWidget } from '@/components/analytics/InventoryTurnoverWidget';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Inventory Detail Dialog with Edit capability
function InventoryDetailDialog({ 
  item, 
  open, 
  onClose,
  onEditThreshold
}: { 
  item: InventoryItem | null; 
  open: boolean; 
  onClose: () => void;
  onEditThreshold: () => void;
}) {
  const { t } = useLanguage();
  
  if (!item) return null;
  
  const isLowStock = item.low_stock_threshold && item.available <= item.low_stock_threshold;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-accent" />
            {t('inventory.itemDetails')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* SKU and Name */}
          <div>
            <code className="rounded bg-secondary px-2 py-1 text-sm font-mono text-foreground">
              {item.sku}
            </code>
            <h3 className="mt-2 text-lg font-semibold text-foreground">{item.name}</h3>
          </div>
          
          {/* Status Badge */}
          <div>
            {isLowStock ? (
              <Badge variant="exception" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t('inventory.lowStock')}
              </Badge>
            ) : (
              <Badge variant="shipped">{t('inventory.available')}</Badge>
            )}
          </div>
          
          {/* Stock Details */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('inventory.onHand')}</p>
              <p className="text-xl font-bold text-foreground tabular-nums">{item.on_hand}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">{t('inventory.reserved')}</p>
              <p className="text-xl font-bold text-muted-foreground tabular-nums">{item.reserved}</p>
            </div>
            <div className={cn(
              "rounded-lg border p-3 text-center",
              isLowStock 
                ? "border-status-exception/50 bg-status-exception/10" 
                : "border-status-shipped/50 bg-status-shipped/10"
            )}>
              <p className="text-xs text-muted-foreground mb-1">{t('inventory.available')}</p>
              <p className={cn(
                "text-xl font-bold tabular-nums",
                isLowStock ? "text-status-exception" : "text-status-shipped"
              )}>{item.available}</p>
            </div>
          </div>
          
          {/* Low Stock Threshold - Editable */}
          <div 
            onClick={onEditThreshold}
            className="rounded-lg border border-border bg-muted/30 p-3 cursor-pointer hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('inventory.lowStockThreshold')}</p>
                <p className="font-medium text-foreground">
                  {item.low_stock_threshold ? `${item.low_stock_threshold} ${t('inventory.pieces')}` : '—'}
                </p>
              </div>
              <Edit2 className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Mobile Card View for Inventory
function InventoryCard({ item, index, onClick }: { item: InventoryItem; index: number; onClick: () => void }) {
  const { t } = useLanguage();
  const isLowStock = item.low_stock_threshold && item.available <= item.low_stock_threshold;
  
  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-card border border-border rounded-lg p-4 cursor-pointer",
        "transition-all hover:shadow-md hover:border-accent/50 active:scale-[0.98] animate-fade-in",
        isLowStock && "border-status-exception/50 bg-status-exception/5"
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <code className="rounded bg-secondary px-2 py-0.5 text-xs font-mono text-foreground">
            {item.sku}
          </code>
          {isLowStock && (
            <Badge variant="exception" className="ml-2 gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" />
              Low
            </Badge>
          )}
        </div>
      </div>
      
      <p className="font-medium text-foreground text-sm mb-3 line-clamp-2">{item.name}</p>
      
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-secondary/50 rounded-lg py-2">
          <p className="text-xs text-muted-foreground">{t('inventory.onHand')}</p>
          <p className="font-semibold text-foreground tabular-nums">{item.on_hand}</p>
        </div>
        <div className="bg-secondary/50 rounded-lg py-2">
          <p className="text-xs text-muted-foreground">{t('inventory.reservedShort')}</p>
          <p className="font-semibold text-muted-foreground tabular-nums">{item.reserved}</p>
        </div>
        <div className={cn(
          "rounded-lg py-2",
          isLowStock ? "bg-status-exception/10" : "bg-status-shipped/10"
        )}>
          <p className="text-xs text-muted-foreground">{t('inventory.availableShort')}</p>
          <p className={cn(
            "font-bold tabular-nums",
            isLowStock ? "text-status-exception" : "text-status-shipped"
          )}>{item.available}</p>
        </div>
      </div>
    </div>
  );
}

// Sortable Header Component
function SortableHeader({
  field,
  currentSortField,
  sortDirection,
  onSort,
  children,
  className,
}: {
  field: InventorySortField;
  currentSortField: InventorySortField;
  sortDirection: 'asc' | 'desc';
  onSort: (field: InventorySortField) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const isActive = currentSortField === field;
  
  return (
    <TableHead 
      className={cn("font-semibold cursor-pointer select-none hover:bg-secondary/70 transition-colors", className)}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className={cn("transition-opacity", isActive ? "opacity-100" : "opacity-30")}>
          {isActive ? (
            sortDirection === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </span>
      </div>
    </TableHead>
  );
}

export default function Inventory() {
  const { activeCompanyId, role } = useAuth();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Export permission - only Admin and above
  const canExport = ['admin', 'msd_csm', 'msd_ma', 'system_admin'].includes(role || '');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Sorting state - Default: most active (reserved) first, then available
  const [sortField, setSortField] = useState<InventorySortField>('reserved');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Selected item for detail dialog
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  // Edit threshold dialog
  const [editThresholdItem, setEditThresholdItem] = useState<InventoryItem | null>(null);
  
  // Filter from URL: 'low-stock' or 'critical' with specific SKUs
  const urlFilter = searchParams.get('filter');
  const criticalSkus = searchParams.get('skus')?.split(',').filter(Boolean) || [];
  const [lowStockFilter, setLowStockFilter] = useState(() => urlFilter === 'low-stock');
  const [criticalFilter, setCriticalFilter] = useState(() => urlFilter === 'critical' && criticalSkus.length > 0);
  
  // Debounced search
  const { inputValue: search, debouncedValue: debouncedSearch, setInputValue: setSearch } = useDebouncedSearch('', 300);

  // Date range filter - default to current year
  const { preset: datePreset, dateRange, setPreset: setDatePreset, setCustomRange } = useDateRangeFilter({
    defaultPreset: 'all_time', // Inventory doesn't filter by date by default
  });

  // Determine which company to filter by
  // "ALL" means show all companies (for MSD staff)
  const effectiveCompanyId = activeCompanyId === 'ALL' ? undefined : (activeCompanyId || undefined);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  // React Query: Fetch inventory with server-side pagination
  // Use skuFilter for critical items instead of search
  const { data, isLoading: loading, refetch } = useInventoryPaginated({
    companyId: effectiveCompanyId,
    search: criticalFilter ? undefined : debouncedSearch,
    skuFilter: criticalFilter && criticalSkus.length > 0 ? criticalSkus : undefined,
    page: currentPage,
    pageSize,
    lowStockOnly: lowStockFilter,
    sortField,
    sortDirection,
  });

  const inventory = data?.data || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  // Realtime subscription
  useRealtimeSubscription<InventoryItem>({
    table: 'inventory',
    onInsert: (newItem) => {
      toast.info(`${t('inventory.newItem')}: ${newItem.name}`);
      refetch();
    },
    onUpdate: (updatedItem) => {
      if (updatedItem.low_stock_threshold && updatedItem.available <= updatedItem.low_stock_threshold) {
        toast.warning(`${t('inventory.lowStock')}: ${updatedItem.name}`);
      }
      refetch();
    },
    onDelete: () => {
      refetch();
    },
  });

  const lowStockCount = inventory.filter(
    item => item.low_stock_threshold && item.available <= item.low_stock_threshold
  ).length;

  const totalAvailable = inventory.reduce((sum, item) => sum + item.available, 0);

  const hasActiveFilters = search !== '' || lowStockFilter || criticalFilter;

  // Toggle low stock filter
  const handleLowStockFilterChange = useCallback((enabled: boolean) => {
    setLowStockFilter(enabled);
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (enabled) {
      newParams.set('filter', 'low-stock');
    } else {
      newParams.delete('filter');
    }
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearch('');
    handleLowStockFilterChange(false);
    setCriticalFilter(false);
    setCurrentPage(1);
    // Clear URL params
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('filter');
    newParams.delete('skus');
    setSearchParams(newParams);
  }, [setSearch, handleLowStockFilterChange, searchParams, setSearchParams]);

  // Export functionality
  const handleExport = useCallback(() => {
    if (inventory.length === 0) {
      toast.error(t('common.noDataToExport'));
      return;
    }
    
    const filename = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(inventory, INVENTORY_EXPORT_COLUMNS, filename);
    toast.success(`${inventory.length} ${t('inventory.itemsExported')}`);
  }, [inventory, t]);

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

  // Handle sort
  const handleSort = useCallback((field: InventorySortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  }, [sortField]);

  // Calculate display range
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  return (
    <MainLayout title={t('nav.inventory')} subtitle={t('inventory.subtitle')}>
      {/* Inventory Turnover Analytics Widget */}
      <div className="mb-4 md:mb-6">
        <InventoryTurnoverWidget />
      </div>

      {/* Stats */}
      <div className="mb-4 md:mb-6 grid gap-3 md:gap-4 grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-3 md:p-5 shadow-card">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-accent/10">
              <Package className="h-4 w-4 md:h-5 md:w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">SKUs</p>
              <p className="font-heading text-lg md:text-2xl font-bold text-foreground">{totalItems}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 md:p-5 shadow-card">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-status-shipped/10">
              <Package className="h-4 w-4 md:h-5 md:w-5 text-status-shipped" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{t('inventory.availableShort')}</p>
              <p className="font-heading text-lg md:text-2xl font-bold text-foreground">
                {totalAvailable.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => handleLowStockFilterChange(!lowStockFilter)}
          className={cn(
            "rounded-xl border bg-card p-3 md:p-5 shadow-card text-left transition-all",
            lowStockFilter 
              ? "border-status-exception ring-2 ring-status-exception/20" 
              : "border-border hover:border-status-exception/50"
          )}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-status-exception/10">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-status-exception" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">{t('inventory.lowStock')}</p>
              <p className="font-heading text-lg md:text-2xl font-bold text-status-exception">{lowStockCount}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Company Filter, Search, Upload and Export */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row gap-3">
        {/* Company Filter */}
        <CompanyFilterDropdown className="w-full sm:w-[180px]" />

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            type="search"
            placeholder={`${t('inventory.searchPlaceholder')} (${t('misc.shortcuts')} /)`}
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
        
        {/* Universal Data Import */}
        <UniversalDataImport />
        
        {/* MS Direct Sync Button */}
        {activeCompanyId && activeCompanyId !== 'ALL' && (
          <SyncInventoryButton 
            companyId={activeCompanyId} 
            onSuccess={() => refetch()} 
          />
        )}
        
        {canExport && (
          <Button variant="outline" className="gap-2 shrink-0" onClick={handleExport} disabled={inventory.length === 0}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.export')}</span>
          </Button>
        )}
      </div>

      {/* Date Range Filter */}
      <div className="mb-4">
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

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span>{totalItems} {t('inventory.itemsFound')}</span>
          {hasActiveFilters && (
            <>
              <span>·</span>
              {criticalFilter && (
                <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
                  {t('widgets.criticalItems')} ({criticalSkus.length})
                  <button 
                    onClick={clearFilters}
                    className="hover:bg-orange-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {lowStockFilter && !criticalFilter && (
                <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                  {t('inventory.lowStock')}
                  <button 
                    onClick={() => handleLowStockFilterChange(false)}
                    className="hover:bg-red-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {search && !criticalFilter && (
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

      {/* Loading with Skeleton */}
      {loading ? (
        <>
          <div className="md:hidden">
            <CardSkeleton count={5} />
          </div>
          <div className="hidden md:block">
            <TableSkeleton columns={6} rows={8} />
          </div>
        </>
      ) : inventory.length === 0 && debouncedSearch ? (
        <NoResultsState 
          searchTerm={debouncedSearch} 
          onClear={() => handleSearchChange('')}
        />
      ) : inventory.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 md:p-12 shadow-card text-center">
          <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">{t('inventory.noItems')}</p>
        </div>
      ) : (
        <>
          {/* Mobile: Card Grid */}
          <div className="md:hidden grid gap-3">
            {inventory.map((item, index) => (
              <InventoryCard key={item.id} item={item} index={index} onClick={() => setSelectedItem(item)} />
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block rounded-xl border border-border bg-card shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                  <SortableHeader field="sku" currentSortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                    SKU
                  </SortableHeader>
                  <SortableHeader field="name" currentSortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                    {t('inventory.itemName')}
                  </SortableHeader>
                  <SortableHeader field="on_hand" currentSortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="text-right justify-end">
                    {t('inventory.onHand')}
                  </SortableHeader>
                  <SortableHeader field="reserved" currentSortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="text-right justify-end">
                    {t('inventory.reserved')}
                  </SortableHeader>
                  <SortableHeader field="available" currentSortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="text-right justify-end">
                    {t('inventory.available')}
                  </SortableHeader>
                  <SortableHeader field="low_stock" currentSortField={sortField} sortDirection={sortDirection} onSort={handleSort}>
                    {t('common.status')}
                  </SortableHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item, index) => {
                  const isLowStock = item.low_stock_threshold && item.available <= item.low_stock_threshold;
                  
                  return (
                    <TableRow 
                      key={item.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-secondary/30 animate-fade-in",
                        isLowStock && "bg-status-exception/5"
                      )}
                      onClick={() => setSelectedItem(item)}
                      style={{ animationDelay: `${index * 20}ms` }}
                    >
                      <TableCell>
                        <code className="rounded bg-secondary px-2 py-1 text-xs font-mono text-foreground">
                          {item.sku}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium text-foreground max-w-xs truncate">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground tabular-nums">
                        {item.on_hand}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {item.reserved}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-bold tabular-nums",
                        isLowStock ? "text-status-exception" : "text-status-shipped"
                      )}>
                        {item.available}
                      </TableCell>
                      <TableCell>
                        {isLowStock ? (
                          <Badge variant="exception" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {t('inventory.lowStock')}
                          </Badge>
                        ) : (
                          <Badge variant="shipped">{t('inventory.available')}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Bottom Pagination */}
          {totalItems > 0 && (
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
        </>
      )}

      {/* Detail Dialog */}
      <InventoryDetailDialog 
        item={selectedItem} 
        open={!!selectedItem} 
        onClose={() => setSelectedItem(null)}
        onEditThreshold={() => {
          setEditThresholdItem(selectedItem);
          setSelectedItem(null);
        }}
      />

      {/* Edit Threshold Dialog */}
      <EditThresholdDialog
        item={editThresholdItem}
        open={!!editThresholdItem}
        onClose={() => setEditThresholdItem(null)}
        onSaved={() => setEditThresholdItem(null)}
      />
    </MainLayout>
  );
}
