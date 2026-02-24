import { useQuery } from '@tanstack/react-query';
import { fetchOrderById, Order } from '@/services/dataService';

export const useOrder = (orderId: string | undefined) => {
  return useQuery<Order | null>({
    queryKey: ['order', orderId],
    queryFn: () => {
      if (!orderId) return null;
      return fetchOrderById(orderId);
    },
    enabled: !!orderId, // Nur ausführen wenn orderId vorhanden
    staleTime: 30 * 1000, // 30 Sekunden
    gcTime: 5 * 60 * 1000, // 5 Minuten
    refetchOnWindowFocus: true,
    retry: 2,
  });
};

