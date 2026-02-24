import { useQuery } from '@tanstack/react-query';
import { calculateSLACompliance } from '@/services/slaService';

export const useSLACompliance = (companyId: string | undefined, days = 7) => {
  return useQuery({
    queryKey: ['sla-compliance', companyId, days],
    queryFn: () => {
      if (!companyId) return null;
      return calculateSLACompliance(companyId, days);
    },
    enabled: !!companyId,
    staleTime: 60 * 1000, // 1 Minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

