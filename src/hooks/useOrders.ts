import { useQuery } from '@tanstack/react-query';
import { fetchOrders, Order, OrderStatus } from '@/services/dataService';

interface UseOrdersParams {
  statusFilter?: OrderStatus;
  companyId?: string | null;
}

export const useOrders = (params: UseOrdersParams = {}) => {
  const { statusFilter, companyId } = params;
  
  return useQuery<Order[]>({
    queryKey: ['orders', statusFilter, companyId],
    queryFn: () => fetchOrders(statusFilter, companyId || undefined),
    staleTime: 30 * 1000, // 30 Sekunden
    gcTime: 5 * 60 * 1000, // 5 Minuten
    refetchOnWindowFocus: true,
    retry: 2,
  });
};
