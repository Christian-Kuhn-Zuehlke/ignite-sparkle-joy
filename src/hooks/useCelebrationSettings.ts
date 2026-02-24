import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CelebrationSettings {
  id?: string;
  company_id: string;
  confetti_enabled: boolean;
  shipments_threshold: number;
  sla_streak_threshold: number;
  orders_today_threshold: number;
  perfect_day_enabled: boolean;
  show_achievement_toast: boolean;
}

const DEFAULT_SETTINGS: Omit<CelebrationSettings, 'company_id'> = {
  confetti_enabled: true,
  shipments_threshold: 100,
  sla_streak_threshold: 30,
  orders_today_threshold: 50,
  perfect_day_enabled: true,
  show_achievement_toast: true,
};

export function useCelebrationSettings(companyId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['celebration-settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('celebration_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching celebration settings:', error);
        throw error;
      }

      // Return data or defaults if none exist
      if (!data) {
        return {
          ...DEFAULT_SETTINGS,
          company_id: companyId,
        } as CelebrationSettings;
      }

      return data as CelebrationSettings;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateMutation = useMutation({
    mutationFn: async (settings: Partial<CelebrationSettings>) => {
      if (!companyId) throw new Error('No company ID');

      const { data, error } = await supabase
        .from('celebration_settings')
        .upsert(
          {
            company_id: companyId,
            ...settings,
          },
          { onConflict: 'company_id' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['celebration-settings', companyId] });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

// Simplified hook for just getting thresholds (used in useConfetti)
export function useCelebrationThresholds(companyId: string | undefined) {
  const { settings, isLoading } = useCelebrationSettings(companyId);

  return {
    isLoading,
    enabled: settings?.confetti_enabled ?? true,
    showToast: settings?.show_achievement_toast ?? true,
    thresholds: {
      shipments: settings?.shipments_threshold ?? 100,
      slaStreak: settings?.sla_streak_threshold ?? 30,
      ordersToday: settings?.orders_today_threshold ?? 50,
      perfectDay: settings?.perfect_day_enabled ?? true,
    },
  };
}
