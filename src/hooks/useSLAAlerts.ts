import { useQuery } from '@tanstack/react-query';
import { fetchSLAAlerts, SLAAlert } from '@/services/slaService';

export const useSLAAlerts = (companyId: string | undefined, unresolvedOnly = true) => {
  return useQuery<SLAAlert[]>({
    queryKey: ['sla-alerts', companyId, unresolvedOnly],
    queryFn: () => {
      if (!companyId) return [];
      return fetchSLAAlerts(companyId, unresolvedOnly);
    },
    enabled: !!companyId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
};

export const useResolveSLAAlert = () => {
  // Placeholder - SLA tables not implemented yet
  return {
    mutate: () => console.debug('SLA not implemented'),
    mutateAsync: async () => console.debug('SLA not implemented'),
    isPending: false,
    isSuccess: false,
    isError: false,
  };
};
