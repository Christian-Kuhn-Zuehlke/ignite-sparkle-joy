import { useQuery } from '@tanstack/react-query';
import { fetchSLAResultsForOrder, fetchSLAResults, SLAResult, SLAResultStatus } from '@/services/slaService';

export const useSLAResultsForOrder = (orderId: string | undefined) => {
  return useQuery<SLAResult[]>({
    queryKey: ['sla-results', 'order', orderId],
    queryFn: () => {
      if (!orderId) return [];
      return fetchSLAResultsForOrder(orderId);
    },
    enabled: !!orderId,
    staleTime: 30 * 1000,
    retry: 1,
    retryOnMount: false,
  });
};

export const useSLAResults = (
  companyId: string | undefined,
  filters?: {
    status?: SLAResultStatus;
    dateFrom?: string;
    dateTo?: string;
  }
) => {
  return useQuery<SLAResult[]>({
    queryKey: ['sla-results', companyId, filters],
    queryFn: () => {
      if (!companyId) return [];
      return fetchSLAResults(companyId, filters);
    },
    enabled: !!companyId,
    staleTime: 30 * 1000,
  });
};
