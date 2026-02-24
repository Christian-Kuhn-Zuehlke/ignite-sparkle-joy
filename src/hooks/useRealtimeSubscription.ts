import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type TableName = 'orders' | 'inventory' | 'returns';

interface UseRealtimeSubscriptionOptions<T> {
  table: TableName;
  companyId?: string | null; // NEW: Company filter for performance
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: T) => void;
  onAnyChange?: () => void;
}

export function useRealtimeSubscription<T = unknown>({
  table,
  companyId,
  onInsert,
  onUpdate,
  onDelete,
  onAnyChange,
}: UseRealtimeSubscriptionOptions<T>) {
  useEffect(() => {
    // Build channel name with company filter for better performance
    const channelName = companyId 
      ? `${table}-${companyId}-changes` 
      : `${table}-changes`;
    
    console.log(`[Realtime] Subscribing to ${channelName}`);

    // Build filter config - filter by company_id when available (99% less traffic!)
    const filterConfig: {
      event: '*';
      schema: 'public';
      table: string;
      filter?: string;
    } = {
      event: '*',
      schema: 'public',
      table: table,
    };
    
    // Add company filter when companyId is provided
    if (companyId) {
      filterConfig.filter = `company_id=eq.${companyId}`;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        filterConfig,
        (payload) => {
          console.log(`[Realtime] ${table} change:`, payload.eventType);

          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new as T);
          } else if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new as T);
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old as T);
          }

          if (onAnyChange) {
            onAnyChange();
          }
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${channelName} subscription status:`, status);
      });

    return () => {
      console.log(`[Realtime] Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [table, companyId, onInsert, onUpdate, onDelete, onAnyChange]);
}
