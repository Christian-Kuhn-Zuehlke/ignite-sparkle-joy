import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchInventoryPaginated, InventorySortField } from '@/services/dataService';

export type { InventorySortField } from '@/services/dataService';

export interface UseInventoryPaginatedParams {
  companyId?: string;
  search?: string;
  skuFilter?: string[]; // Filter by exact SKU match (for critical items)
  page?: number;
  pageSize?: number;
  lowStockOnly?: boolean;
  sortField?: InventorySortField;
  sortDirection?: 'asc' | 'desc';
}

export const useInventoryPaginated = (params: UseInventoryPaginatedParams = {}) => {
  const { 
    companyId, 
    search, 
    skuFilter,
    page = 1, 
    pageSize = 50, 
    lowStockOnly = false,
    sortField = 'reserved', // Default: most active items first
    sortDirection = 'desc',
  } = params;

  return useQuery({
    queryKey: ['inventory-paginated', companyId, search, skuFilter, page, pageSize, lowStockOnly, sortField, sortDirection],
    queryFn: () => fetchInventoryPaginated({
      companyId,
      search,
      skuFilter,
      page,
      pageSize,
      lowStockOnly,
      sortField,
      sortDirection,
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
};
