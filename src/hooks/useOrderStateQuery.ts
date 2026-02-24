import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface OrderStateQueryParams {
  orderNo: string;
  companyId: string;
}

interface OrderStateResponse {
  success: boolean;
  orderState?: {
    orderState?: number;
    trackAndTraceId?: string;
    trackAndTraceUrl?: string;
    trackAndTraceIdReturn?: string;
    trackAndTraceUrlReturn?: string;
    shippingAgent?: string;
    invoiceNo?: string;
    invoiceAmount?: number;
    paymentState?: boolean;
  };
  updated?: boolean;
  error?: string;
  errorCode?: string;
  errorMessage?: string;
}

export function useOrderStateQuery() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation<OrderStateResponse, Error, OrderStateQueryParams>({
    mutationFn: async ({ orderNo, companyId }: OrderStateQueryParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ms-order-state-query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderNo, companyId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to query order state');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        if (data.updated) {
          toast.success(t('orders.stateUpdated') || 'Order state updated successfully');
          // Invalidate orders query to refresh data
          queryClient.invalidateQueries({ queryKey: ['order', variables.orderNo] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
        } else {
          toast.info(t('orders.stateNoChanges') || 'Order state retrieved, no changes');
        }
      } else if (data.error) {
        toast.error(data.errorMessage || data.error || 'Failed to query order state');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to query order state');
    },
  });
}

