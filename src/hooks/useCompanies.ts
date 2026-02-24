import { useQuery } from '@tanstack/react-query';
import { fetchCompanies } from '@/services/dataService';

export const useCompanies = () => {
  return useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    staleTime: 5 * 60 * 1000, // 5 Minuten (Companies ändern sich selten)
    gcTime: 10 * 60 * 1000, // 10 Minuten
    refetchOnWindowFocus: false, // Companies müssen nicht so oft refetched werden
    retry: 2,
  });
};

