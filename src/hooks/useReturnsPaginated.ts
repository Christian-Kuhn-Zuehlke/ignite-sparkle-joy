import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchReturnsPaginated, ReturnStatus } from '@/services/dataService';

export interface UseReturnsPaginatedParams {
  companyId?: string;
  search?: string;
  statusFilter?: ReturnStatus | ReturnStatus[];
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const useReturnsPaginated = (params: UseReturnsPaginatedParams = {}) => {
  const { companyId, search, statusFilter, page = 1, pageSize = 50, dateFrom, dateTo } = params;

  return useQuery({
    queryKey: ['returns-paginated', companyId, search, statusFilter, page, pageSize, dateFrom, dateTo],
    queryFn: () => fetchReturnsPaginated({
      companyId,
      search,
      statusFilter,
      page,
      pageSize,
      dateFrom,
      dateTo,
    }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });
};
