import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Returns the effective company ID for filtering data.
 * - Returns undefined when "ALL" is selected (for MSD staff viewing all companies)
 * - Returns the actual company ID otherwise
 */
export function useEffectiveCompanyId(): string | undefined {
  const { activeCompanyId } = useAuth();
  
  return useMemo(() => {
    return activeCompanyId === 'ALL' ? undefined : (activeCompanyId || undefined);
  }, [activeCompanyId]);
}
