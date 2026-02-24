import { useQuery } from '@tanstack/react-query';
import { fetchReturns, Return } from '@/services/dataService';

export const useReturns = (companyId?: string | null) => {
  return useQuery<Return[]>({
    queryKey: ['returns', companyId],
    queryFn: () => fetchReturns(companyId || undefined),
    staleTime: 30 * 1000, // 30 Sekunden
    gcTime: 5 * 60 * 1000, // 5 Minuten
    refetchOnWindowFocus: true,
    retry: 2,
  });
};
