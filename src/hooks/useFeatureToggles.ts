import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from './useEffectiveCompanyId';

interface FeatureToggle {
  id: string;
  company_id: string | null;
  feature_key: string;
  is_enabled: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Hook to check if specific features are enabled for the current company
 */
export function useFeatureToggles() {
  const companyId = useEffectiveCompanyId();

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['feature-toggles', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('feature_toggles')
        .select('*')
        .eq('company_id', companyId);

      if (error) {
        console.error('Error fetching feature toggles:', error);
        return [];
      }

      return data as FeatureToggle[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  /**
   * Check if a specific feature is enabled
   * IMPORTANT: If no feature toggle exists for this company, default to TRUE (enabled)
   * This ensures existing customers without feature toggles still see all navigation
   */
  const isFeatureEnabled = (featureKey: string): boolean => {
    const feature = features.find((f) => f.feature_key === featureKey);
    // If feature not found in DB, default to enabled (true)
    // Only return false if explicitly disabled
    return feature?.is_enabled ?? true;
  };

  /**
   * Check if any of the given features are enabled
   */
  const hasAnyFeature = (featureKeys: string[]): boolean => {
    return featureKeys.some((key) => isFeatureEnabled(key));
  };

  /**
   * Check if all of the given features are enabled
   */
  const hasAllFeatures = (featureKeys: string[]): boolean => {
    return featureKeys.every((key) => isFeatureEnabled(key));
  };

  return {
    features,
    isLoading,
    isFeatureEnabled,
    hasAnyFeature,
    hasAllFeatures,
  };
}

// Feature key constants for type safety
export const FEATURE_KEYS = {
  // Navigation Menu Items
  NAV_ORDERS: 'nav_orders',
  NAV_INBOUND: 'nav_inbound',
  NAV_INVENTORY: 'nav_inventory',
  NAV_RETURNS: 'nav_returns',
  NAV_CLARIFICATION: 'nav_clarification',
  NAV_QUALITY: 'nav_quality',
  NAV_PACKAGING: 'nav_packaging',
  NAV_CUSTOMERS: 'nav_customers',
  NAV_AI_HUB: 'nav_ai_hub',
  NAV_INTELLIGENCE: 'nav_intelligence',
  
  // Legacy dashboard keys (for backwards compatibility)
  QUALITY_DASHBOARD: 'quality_dashboard',
  PACKAGING_DASHBOARD: 'packaging_dashboard',
  AI_HUB: 'ai_hub',
  
  // API Features
  ORDERS_API: 'orders_api',
  INVENTORY_API: 'inventory_api',
  RETURNS_API: 'returns_api',
  WEBHOOKS: 'webhooks',
  
  // Integrations
  BC_INTEGRATION: 'bc_integration',
  ECOMMERCE_INTEGRATION: 'ecommerce_integration',
  SHIPPING_INTEGRATION: 'shipping_integration',
  REALTIME_UPDATES: 'realtime_updates',
} as const;

// Navigation feature keys for easy iteration
export const NAV_FEATURE_KEYS = [
  FEATURE_KEYS.NAV_ORDERS,
  FEATURE_KEYS.NAV_INBOUND,
  FEATURE_KEYS.NAV_INVENTORY,
  FEATURE_KEYS.NAV_RETURNS,
  FEATURE_KEYS.NAV_CLARIFICATION,
  FEATURE_KEYS.NAV_QUALITY,
  FEATURE_KEYS.NAV_PACKAGING,
  FEATURE_KEYS.NAV_CUSTOMERS,
  FEATURE_KEYS.NAV_AI_HUB,
  FEATURE_KEYS.NAV_INTELLIGENCE,
] as const;
