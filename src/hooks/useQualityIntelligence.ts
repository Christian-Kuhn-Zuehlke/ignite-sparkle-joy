import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from './useEffectiveCompanyId';
import type { Json } from '@/integrations/supabase/types';

export type QualityErrorType = 
  | 'wrong_item'
  | 'missing_item'
  | 'damaged'
  | 'wrong_quantity'
  | 'packaging_error'
  | 'labeling_error'
  | 'shipping_error'
  | 'other';

export interface QualityError {
  id: string;
  company_id: string;
  order_id?: string;
  return_id?: string;
  error_type: QualityErrorType;
  sku?: string;
  product_name?: string;
  zone?: string;
  shift?: string;
  worker_id?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  root_cause?: string;
  root_cause_category?: string;
  corrective_action?: string;
  cost_impact?: number;
  detected_at: string;
  detected_by?: string;
  resolved_at?: string;
  resolved_by?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface QualityScore {
  id: string;
  company_id: string;
  score_date: string;
  overall_score: number;
  accuracy_score: number;
  damage_score: number;
  timeliness_score: number;
  packaging_score: number;
  total_orders: number;
  total_errors: number;
  error_rate: number;
  by_error_type: Record<string, number>;
  by_zone: Record<string, number>;
  by_shift: Record<string, number>;
  top_error_skus: Array<{ sku: string; count: number; name?: string }>;
}

export interface QualityMetrics {
  totalErrors: number;
  errorRate: number;
  qualityScore: number;
  resolvedErrors: number;
  unresolvedErrors: number;
  costImpact: number;
  byErrorType: Record<QualityErrorType, number>;
  byZone: Record<string, number>;
  byShift: Record<string, number>;
  bySeverity: Record<string, number>;
  topErrorSkus: Array<{ sku: string; count: number; name?: string }>;
  trends: Array<{ date: string; errors: number; score: number }>;
}

const ERROR_TYPE_LABELS: Record<QualityErrorType, string> = {
  wrong_item: 'Falscher Artikel',
  missing_item: 'Fehlmenge',
  damaged: 'Beschädigt',
  wrong_quantity: 'Falsche Menge',
  packaging_error: 'Verpackungsfehler',
  labeling_error: 'Etikettenfehler',
  shipping_error: 'Versandfehler',
  other: 'Sonstige'
};

export const getErrorTypeLabel = (type: QualityErrorType): string => {
  return ERROR_TYPE_LABELS[type] || type;
};

export function useQualityErrors(days: number = 30) {
  const effectiveCompanyId = useEffectiveCompanyId();
  
  return useQuery({
    queryKey: ['quality-errors', effectiveCompanyId, days],
    queryFn: async () => {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      
      let query = supabase
        .from('quality_errors')
        .select('*')
        .gte('detected_at', fromDate.toISOString())
        .order('detected_at', { ascending: false });
      
      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as QualityError[];
    },
    enabled: true,
    staleTime: 1000 * 60 * 5,
  });
}

export function useQualityScores(days: number = 30) {
  const effectiveCompanyId = useEffectiveCompanyId();
  
  return useQuery({
    queryKey: ['quality-scores', effectiveCompanyId, days],
    queryFn: async () => {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      
      let query = supabase
        .from('quality_scores')
        .select('*')
        .gte('score_date', fromDate.toISOString().split('T')[0])
        .order('score_date', { ascending: false });
      
      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        overall_score: item.overall_score ?? 0,
        accuracy_score: item.accuracy_score ?? 0,
        damage_score: item.damage_score ?? 0,
        timeliness_score: item.timeliness_score ?? 0,
        packaging_score: item.packaging_score ?? 0,
        total_orders: item.total_orders ?? 0,
        total_errors: item.total_errors ?? 0,
        error_rate: item.error_rate ?? 0,
        by_error_type: (item.by_error_type ?? {}) as Record<string, number>,
        by_zone: (item.by_zone ?? {}) as Record<string, number>,
        by_shift: (item.by_shift ?? {}) as Record<string, number>,
        top_error_skus: (item.top_error_skus ?? []) as Array<{ sku: string; count: number; name?: string }>
      })) as QualityScore[];
    },
    enabled: true,
    staleTime: 1000 * 60 * 5,
  });
}

export function useQualityMetrics(days: number = 30) {
  const { data: errors, isLoading: errorsLoading } = useQualityErrors(days);
  const { data: scores, isLoading: scoresLoading } = useQualityScores(days);
  const effectiveCompanyId = useEffectiveCompanyId();
  
  return useQuery({
    queryKey: ['quality-metrics', effectiveCompanyId, days, errors?.length, scores?.length],
    queryFn: async (): Promise<QualityMetrics> => {
      const errorsData = errors || [];
      const scoresData = scores || [];
      
      // Calculate metrics from errors
      const totalErrors = errorsData.length;
      const resolvedErrors = errorsData.filter(e => e.resolved_at).length;
      const unresolvedErrors = totalErrors - resolvedErrors;
      const costImpact = errorsData.reduce((sum, e) => sum + (e.cost_impact || 0), 0);
      
      // Group by error type
      const byErrorType: Record<QualityErrorType, number> = {
        wrong_item: 0,
        missing_item: 0,
        damaged: 0,
        wrong_quantity: 0,
        packaging_error: 0,
        labeling_error: 0,
        shipping_error: 0,
        other: 0
      };
      
      errorsData.forEach(error => {
        if (error.error_type in byErrorType) {
          byErrorType[error.error_type]++;
        }
      });
      
      // Group by zone
      const byZone: Record<string, number> = {};
      errorsData.forEach(error => {
        const zone = error.zone || 'Unbekannt';
        byZone[zone] = (byZone[zone] || 0) + 1;
      });
      
      // Group by shift
      const byShift: Record<string, number> = {};
      errorsData.forEach(error => {
        const shift = error.shift || 'Unbekannt';
        byShift[shift] = (byShift[shift] || 0) + 1;
      });
      
      // Group by severity
      const bySeverity: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };
      errorsData.forEach(error => {
        bySeverity[error.severity]++;
      });
      
      // Top error SKUs
      const skuCounts: Record<string, { count: number; name?: string }> = {};
      errorsData.forEach(error => {
        if (error.sku) {
          if (!skuCounts[error.sku]) {
            skuCounts[error.sku] = { count: 0, name: error.product_name };
          }
          skuCounts[error.sku].count++;
        }
      });
      
      const topErrorSkus = Object.entries(skuCounts)
        .map(([sku, data]) => ({ sku, count: data.count, name: data.name }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Calculate error rate and quality score
      const latestScore = scoresData[0];
      const errorRate = latestScore?.error_rate || (totalErrors > 0 ? totalErrors / 100 : 0);
      const qualityScore = latestScore?.overall_score || (100 - errorRate * 100);
      
      // Build trends
      const trends: Array<{ date: string; errors: number; score: number }> = [];
      const dateMap: Record<string, { errors: number; score: number }> = {};
      
      errorsData.forEach(error => {
        const date = error.detected_at.split('T')[0];
        if (!dateMap[date]) {
          dateMap[date] = { errors: 0, score: 100 };
        }
        dateMap[date].errors++;
      });
      
      scoresData.forEach(score => {
        const date = score.score_date;
        if (!dateMap[date]) {
          dateMap[date] = { errors: 0, score: score.overall_score };
        } else {
          dateMap[date].score = score.overall_score;
        }
      });
      
      Object.entries(dateMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, data]) => {
          trends.push({ date, ...data });
        });
      
      return {
        totalErrors,
        errorRate,
        qualityScore,
        resolvedErrors,
        unresolvedErrors,
        costImpact,
        byErrorType,
        byZone,
        byShift,
        bySeverity,
        topErrorSkus,
        trends: trends.slice(-30)
      };
    },
    enabled: !errorsLoading && !scoresLoading,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateQualityError() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (error: Omit<QualityError, 'id' | 'created_at'>) => {
      const insertData = {
        company_id: error.company_id,
        error_type: error.error_type,
        order_id: error.order_id,
        return_id: error.return_id,
        sku: error.sku,
        product_name: error.product_name,
        zone: error.zone,
        shift: error.shift,
        worker_id: error.worker_id,
        severity: error.severity,
        description: error.description,
        root_cause: error.root_cause,
        root_cause_category: error.root_cause_category,
        corrective_action: error.corrective_action,
        cost_impact: error.cost_impact,
        detected_at: error.detected_at,
        detected_by: error.detected_by,
        resolved_at: error.resolved_at,
        metadata: (error.metadata ?? {}) as Json
      };
      
      const { data, error: dbError } = await supabase
        .from('quality_errors')
        .insert([insertData])
        .select()
        .single();
      
      if (dbError) throw dbError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-errors'] });
      queryClient.invalidateQueries({ queryKey: ['quality-metrics'] });
    },
  });
}

export function useResolveQualityError() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      corrective_action,
      resolved_by 
    }: { 
      id: string; 
      corrective_action?: string;
      resolved_by?: string;
    }) => {
      const { data, error } = await supabase
        .from('quality_errors')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by,
          corrective_action
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-errors'] });
      queryClient.invalidateQueries({ queryKey: ['quality-metrics'] });
    },
  });
}

export function useRootCauseCategories() {
  const effectiveCompanyId = useEffectiveCompanyId();
  
  return useQuery({
    queryKey: ['root-cause-categories', effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('root_cause_categories')
        .select('*')
        .or(`company_id.eq.SYSTEM,company_id.eq.${effectiveCompanyId}`)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: true,
    staleTime: 1000 * 60 * 30,
  });
}
