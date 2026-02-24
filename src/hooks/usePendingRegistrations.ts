import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PendingRegistration {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  requested_company_name: string | null;
  created_at: string;
}

export function usePendingRegistrations() {
  const { isSystemAdmin, isMsdStaff } = useAuth();
  const canViewPending = isSystemAdmin() || isMsdStaff();

  const { data: pendingRegistrations = [], isLoading, refetch } = useQuery({
    queryKey: ['pending-registrations'],
    queryFn: async () => {
      // Fetch profiles that don't have an approved membership
      // These are users who registered but haven't been approved yet
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name, requested_company_name, created_at')
        .is('company_id', null)
        .not('requested_company_name', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending registrations:', error);
        throw error;
      }

      return (profiles || []) as PendingRegistration[];
    },
    enabled: canViewPending,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  return {
    pendingRegistrations,
    pendingCount: pendingRegistrations.length,
    isLoading,
    refetch,
    canViewPending,
  };
}
