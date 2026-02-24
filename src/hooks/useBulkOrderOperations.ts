import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { OrderStatus } from '@/services/dataService';
import { toast } from 'sonner';

interface BulkUpdateResult {
  success: number;
  failed: number;
  errors: string[];
}

export function useBulkOrderOperations() {
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const toggleOrder = useCallback((orderId: string) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((orderIds: string[]) => {
    setSelectedOrderIds(new Set(orderIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedOrderIds(new Set());
  }, []);

  const isSelected = useCallback((orderId: string) => {
    return selectedOrderIds.has(orderId);
  }, [selectedOrderIds]);

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ orderIds, newStatus }: { orderIds: string[]; newStatus: OrderStatus }): Promise<BulkUpdateResult> => {
      const results: BulkUpdateResult = {
        success: 0,
        failed: 0,
        errors: [],
      };

      // Update orders in batches of 10 for performance
      const batchSize = 10;
      for (let i = 0; i < orderIds.length; i += batchSize) {
        const batch = orderIds.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('orders')
          .update({ 
            status: newStatus,
            status_date: new Date().toISOString(),
          })
          .in('id', batch);

        if (error) {
          results.failed += batch.length;
          results.errors.push(error.message);
        } else {
          results.success += batch.length;
        }
      }

      return results;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['orders-paginated'] });
      queryClient.invalidateQueries({ queryKey: ['order-pipeline'] });
      
      if (result.failed === 0) {
        toast.success(`${result.success} Orders erfolgreich aktualisiert`);
      } else if (result.success > 0) {
        toast.warning(`${result.success} erfolgreich, ${result.failed} fehlgeschlagen`);
      } else {
        toast.error(`Alle ${result.failed} Updates fehlgeschlagen`);
      }
      
      clearSelection();
    },
    onError: (error) => {
      toast.error(`Bulk-Update fehlgeschlagen: ${error.message}`);
    },
  });

  const updateSelectedOrders = useCallback((newStatus: OrderStatus) => {
    const orderIds = Array.from(selectedOrderIds);
    if (orderIds.length === 0) {
      toast.error('Keine Orders ausgewählt');
      return;
    }
    bulkUpdateMutation.mutate({ orderIds, newStatus });
  }, [selectedOrderIds, bulkUpdateMutation]);

  return {
    selectedOrderIds,
    selectedCount: selectedOrderIds.size,
    toggleOrder,
    selectAll,
    clearSelection,
    isSelected,
    updateSelectedOrders,
    isUpdating: bulkUpdateMutation.isPending,
  };
}
