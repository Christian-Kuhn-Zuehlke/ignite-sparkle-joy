import { useQuery } from '@tanstack/react-query';
import { fetchInventory, InventoryItem } from '@/services/dataService';

export const useInventory = (companyId?: string | null) => {
  return useQuery<InventoryItem[]>({
    queryKey: ['inventory', companyId],
    queryFn: () => fetchInventory(companyId || undefined),
    staleTime: 30 * 1000, // 30 Sekunden
    gcTime: 5 * 60 * 1000, // 5 Minuten
    refetchOnWindowFocus: true,
    retry: 2,
  });
};
