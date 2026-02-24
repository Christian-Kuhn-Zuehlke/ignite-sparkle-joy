import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchOrdersPaginated, FetchOrdersParams, Order, PaginatedResponse } from '@/services/dataService';

interface UseOrdersPaginatedParams extends Omit<FetchOrdersParams, 'page' | 'pageSize'> {
  page: number;
  pageSize: number;
  enabled?: boolean;
  slaFilter?: 'met' | 'at-risk' | 'breached';
  dateFrom?: string;
  dateTo?: string;
}

export const useOrdersPaginated = (params: UseOrdersPaginatedParams) => {
  const { 
    statusFilter, 
    companyId, 
    search,
    sortField,
    sortDirection,
    page, 
    pageSize,
    enabled = true,
    slaFilter,
    dateFrom,
    dateTo,
  } = params;

  return useQuery<PaginatedResponse<Order>>({
    queryKey: ['orders-paginated', statusFilter, companyId, search, sortField, sortDirection, page, pageSize, slaFilter, dateFrom, dateTo],
    queryFn: () => fetchOrdersPaginated({
      statusFilter,
      companyId: companyId || undefined,
      search,
      sortField,
      sortDirection,
      page,
      pageSize,
      slaFilter,
      dateFrom,
      dateTo,
    }),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
    enabled,
    // Keep previous data while fetching new page for smooth UX
    placeholderData: keepPreviousData,
  });
};
