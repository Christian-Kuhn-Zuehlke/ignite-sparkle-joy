import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSLAProfile, upsertSLAProfile, SLAProfile } from '@/services/slaService';

export const useSLAProfile = (companyId: string | undefined) => {
  return useQuery<SLAProfile | null>({
    queryKey: ['sla-profile', companyId],
    queryFn: () => {
      if (!companyId) return null;
      return fetchSLAProfile(companyId);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 Minuten
  });
};

export const useUpdateSLAProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profile: Partial<SLAProfile> & { company_id: string }) => 
      upsertSLAProfile(profile),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sla-profile', variables.company_id] });
    },
  });
};

