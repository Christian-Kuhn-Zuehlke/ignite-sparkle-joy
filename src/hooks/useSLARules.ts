import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchSLARules, 
  createSLARule, 
  updateSLARule, 
  deleteSLARule,
  SLARule 
} from '@/services/slaService';

export const useSLARules = (companyId: string | undefined, activeOnly = false) => {
  return useQuery<SLARule[]>({
    queryKey: ['sla-rules', companyId, activeOnly],
    queryFn: () => {
      if (!companyId) return [];
      return fetchSLARules(companyId, activeOnly);
    },
    enabled: !!companyId,
    staleTime: 30 * 1000,
  });
};

export const useCreateSLARule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rule: Omit<SLARule, 'id' | 'created_at' | 'updated_at'>) => 
      createSLARule(rule),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sla-rules', variables.company_id] });
    },
  });
};

export const useUpdateSLARule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SLARule> }) => 
      updateSLARule(id, updates),
    onSuccess: (data: SLARule) => {
      queryClient.invalidateQueries({ queryKey: ['sla-rules', data.company_id] });
    },
  });
};

export const useDeleteSLARule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; companyId: string }) => 
      deleteSLARule(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sla-rules', variables.companyId] });
    },
  });
};
