import { useQuery } from '@tanstack/react-query';
import { fetchDashboardMetrics, DashboardMetrics } from '@/services/dataService';
import { format } from 'date-fns';

interface UseDashboardMetricsParams {
  dateFrom?: Date;
  dateTo?: Date;
  companyId?: string;
}

export const useDashboardMetrics = ({
  dateFrom,
  dateTo,
  companyId,
}: UseDashboardMetricsParams) => {
  return useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics', dateFrom?.toISOString(), dateTo?.toISOString(), companyId],
    queryFn: () => {
      const fromStr = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined;
      const toStr = dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined;
      return fetchDashboardMetrics(fromStr, toStr, companyId);
    },
    staleTime: 30 * 1000, // 30 Sekunden
    gcTime: 5 * 60 * 1000, // 5 Minuten
    refetchOnWindowFocus: true,
    retry: 2,
  });
};

