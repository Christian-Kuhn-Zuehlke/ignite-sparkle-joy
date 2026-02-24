import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from './useEffectiveCompanyId';

export interface PackagingType {
  id: string;
  company_id: string;
  name: string;
  code: string;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  volume_cm3: number | null;
  weight_g: number | null;
  cost_cents: number;
  is_eco_friendly: boolean;
  co2_grams: number | null;
  is_active: boolean;
}

export interface PackagingRecord {
  id: string;
  order_id: string;
  company_id: string;
  packaging_type_id: string | null;
  packaging_code: string | null;
  actual_weight_g: number | null;
  declared_weight_g: number | null;
  fill_rate_percent: number | null;
  is_overpackaged: boolean;
  is_underpackaged: boolean;
  carrier_code: string | null;
  carrier_service: string | null;
  shipping_cost_cents: number | null;
  shipping_zone: string | null;
  created_at: string;
}

export interface ShippingAnomaly {
  id: string;
  order_id: string;
  company_id: string;
  anomaly_type: 'expensive_carrier' | 'wrong_service' | 'weight_mismatch' | 'dimension_mismatch' | 'routing_issue' | 'overpackaged' | 'underpackaged';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string | null;
  expected_value: string | null;
  actual_value: string | null;
  potential_savings_cents: number | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface PackagingRecommendation {
  id: string;
  company_id: string;
  sku: string | null;
  current_packaging_code: string | null;
  recommended_packaging_code: string | null;
  recommendation_type: 'downsize' | 'upsize' | 'eco_switch' | 'carrier_change' | 'consolidation';
  reason: string | null;
  estimated_savings_cents: number | null;
  estimated_co2_savings_g: number | null;
  confidence_score: number | null;
  sample_size: number | null;
  is_implemented: boolean;
  created_at: string;
}

export interface PackagingMetrics {
  id: string;
  company_id: string;
  metric_date: string;
  total_shipments: number;
  avg_fill_rate_percent: number | null;
  overpackaged_count: number;
  underpackaged_count: number;
  total_packaging_cost_cents: number;
  total_shipping_cost_cents: number;
  total_co2_grams: number;
  anomaly_count: number;
  potential_savings_cents: number;
}

export function usePackagingMetrics(days: number = 30) {
  const companyId = useEffectiveCompanyId();
  
  return useQuery({
    queryKey: ['packaging-metrics', companyId, days],
    queryFn: async () => {
      if (!companyId) return [];
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('packaging_metrics')
        .select('*')
        .eq('company_id', companyId)
        .gte('metric_date', fromDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });
      
      if (error) throw error;
      return data as PackagingMetrics[];
    },
    enabled: !!companyId,
  });
}

export function useShippingAnomalies(unresolvedOnly: boolean = false) {
  const companyId = useEffectiveCompanyId();
  
  return useQuery({
    queryKey: ['shipping-anomalies', companyId, unresolvedOnly],
    queryFn: async () => {
      if (!companyId) return [];
      let query = supabase
        .from('shipping_anomalies')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (unresolvedOnly) {
        query = query.eq('is_resolved', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ShippingAnomaly[];
    },
    enabled: !!companyId,
  });
}

export function usePackagingRecommendations() {
  const companyId = useEffectiveCompanyId();
  
  return useQuery({
    queryKey: ['packaging-recommendations', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('packaging_recommendations')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_implemented', false)
        .order('estimated_savings_cents', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as PackagingRecommendation[];
    },
    enabled: !!companyId,
  });
}

export function usePackagingTypes() {
  const companyId = useEffectiveCompanyId();
  
  return useQuery({
    queryKey: ['packaging-types', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('packaging_types')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as PackagingType[];
    },
    enabled: !!companyId,
  });
}

export function useResolveAnomaly() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (anomalyId: string) => {
      const { error } = await supabase
        .from('shipping_anomalies')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', anomalyId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-anomalies'] });
    },
  });
}

export function useImplementRecommendation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (recommendationId: string) => {
      const { error } = await supabase
        .from('packaging_recommendations')
        .update({
          is_implemented: true,
          implemented_at: new Date().toISOString(),
        })
        .eq('id', recommendationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packaging-recommendations'] });
    },
  });
}

// Aggregated stats from metrics
export function usePackagingStats(days: number = 30) {
  const { data: metrics, isLoading } = usePackagingMetrics(days);
  
  const stats = {
    totalShipments: 0,
    avgFillRate: 0,
    overpackagedRate: 0,
    totalPackagingCost: 0,
    totalShippingCost: 0,
    totalCO2: 0,
    totalAnomalies: 0,
    potentialSavings: 0,
  };
  
  if (metrics && metrics.length > 0) {
    stats.totalShipments = metrics.reduce((sum, m) => sum + m.total_shipments, 0);
    stats.avgFillRate = metrics.reduce((sum, m) => sum + (m.avg_fill_rate_percent || 0), 0) / metrics.length;
    stats.overpackagedRate = stats.totalShipments > 0 
      ? (metrics.reduce((sum, m) => sum + m.overpackaged_count, 0) / stats.totalShipments) * 100 
      : 0;
    stats.totalPackagingCost = metrics.reduce((sum, m) => sum + m.total_packaging_cost_cents, 0) / 100;
    stats.totalShippingCost = metrics.reduce((sum, m) => sum + m.total_shipping_cost_cents, 0) / 100;
    stats.totalCO2 = metrics.reduce((sum, m) => sum + m.total_co2_grams, 0) / 1000; // Convert to kg
    stats.totalAnomalies = metrics.reduce((sum, m) => sum + m.anomaly_count, 0);
    stats.potentialSavings = metrics.reduce((sum, m) => sum + m.potential_savings_cents, 0) / 100;
  }
  
  return { stats, isLoading };
}
