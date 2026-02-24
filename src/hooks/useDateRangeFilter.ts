import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startOfYear, subDays, subMonths, format, parseISO } from 'date-fns';

export type DateRangePreset = 
  | 'current_year'
  | 'last_30_days'
  | 'last_90_days'
  | 'last_6_months'
  | 'last_year'
  | 'all_time'
  | 'custom';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface DateRangeFilterState {
  preset: DateRangePreset;
  dateRange: DateRange;
  dateFrom: string | undefined;
  dateTo: string | undefined;
}

export interface UseDateRangeFilterOptions {
  defaultPreset?: DateRangePreset;
  syncToUrl?: boolean;
  urlParamPrefix?: string;
}

export const DATE_RANGE_PRESETS: { id: DateRangePreset; labelKey: string }[] = [
  { id: 'current_year', labelKey: 'filters.currentYear' },
  { id: 'last_30_days', labelKey: 'filters.last30Days' },
  { id: 'last_90_days', labelKey: 'filters.last90Days' },
  { id: 'last_6_months', labelKey: 'filters.last6Months' },
  { id: 'last_year', labelKey: 'filters.lastYear' },
  { id: 'all_time', labelKey: 'filters.allTime' },
];

function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const now = new Date();
  
  switch (preset) {
    case 'current_year':
      // YTD: From start of year until today (not end of year)
      // This ensures fair comparison with same period last year
      return {
        from: startOfYear(now),
        to: now,
      };
    case 'last_30_days':
      return {
        from: subDays(now, 30),
        to: now,
      };
    case 'last_90_days':
      return {
        from: subDays(now, 90),
        to: now,
      };
    case 'last_6_months':
      return {
        from: subMonths(now, 6),
        to: now,
      };
    case 'last_year': {
      const lastYear = now.getFullYear() - 1;
      return {
        from: new Date(lastYear, 0, 1),
        to: new Date(lastYear, 11, 31),
      };
    }
    case 'all_time':
      return {
        from: null,
        to: null,
      };
    case 'custom':
    default:
      return {
        from: null,
        to: null,
      };
  }
}

export function useDateRangeFilter(options: UseDateRangeFilterOptions = {}) {
  const { 
    defaultPreset = 'last_30_days', 
    syncToUrl = true,
    urlParamPrefix = ''
  } = options;
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read initial state from URL if syncing
  const getInitialPreset = (): DateRangePreset => {
    if (syncToUrl) {
      const urlPreset = searchParams.get(`${urlParamPrefix}datePreset`);
      if (urlPreset && DATE_RANGE_PRESETS.some(p => p.id === urlPreset)) {
        return urlPreset as DateRangePreset;
      }
      // Check for custom dates in URL
      const urlFrom = searchParams.get(`${urlParamPrefix}dateFrom`);
      const urlTo = searchParams.get(`${urlParamPrefix}dateTo`);
      if (urlFrom || urlTo) {
        return 'custom';
      }
    }
    return defaultPreset;
  };
  
  const getInitialCustomRange = (): DateRange => {
    if (syncToUrl) {
      const urlFrom = searchParams.get(`${urlParamPrefix}dateFrom`);
      const urlTo = searchParams.get(`${urlParamPrefix}dateTo`);
      return {
        from: urlFrom ? parseISO(urlFrom) : null,
        to: urlTo ? parseISO(urlTo) : null,
      };
    }
    return { from: null, to: null };
  };
  
  const [preset, setPresetState] = useState<DateRangePreset>(getInitialPreset);
  const [customRange, setCustomRangeState] = useState<DateRange>(getInitialCustomRange);
  
  // Calculate the effective date range
  const dateRange = useMemo((): DateRange => {
    if (preset === 'custom') {
      return customRange;
    }
    return getDateRangeFromPreset(preset);
  }, [preset, customRange]);
  
  // Format dates for API calls
  const dateFrom = useMemo(() => {
    if (!dateRange.from) return undefined;
    return format(dateRange.from, 'yyyy-MM-dd');
  }, [dateRange.from]);
  
  const dateTo = useMemo(() => {
    if (!dateRange.to) return undefined;
    return format(dateRange.to, 'yyyy-MM-dd');
  }, [dateRange.to]);
  
  // Update URL params
  const updateUrlParams = useCallback((newPreset: DateRangePreset, newCustomRange?: DateRange) => {
    if (!syncToUrl) return;
    
    const newParams = new URLSearchParams(searchParams);
    
    if (newPreset === 'all_time') {
      newParams.delete(`${urlParamPrefix}datePreset`);
      newParams.delete(`${urlParamPrefix}dateFrom`);
      newParams.delete(`${urlParamPrefix}dateTo`);
    } else if (newPreset === 'custom' && newCustomRange) {
      newParams.set(`${urlParamPrefix}datePreset`, 'custom');
      if (newCustomRange.from) {
        newParams.set(`${urlParamPrefix}dateFrom`, format(newCustomRange.from, 'yyyy-MM-dd'));
      } else {
        newParams.delete(`${urlParamPrefix}dateFrom`);
      }
      if (newCustomRange.to) {
        newParams.set(`${urlParamPrefix}dateTo`, format(newCustomRange.to, 'yyyy-MM-dd'));
      } else {
        newParams.delete(`${urlParamPrefix}dateTo`);
      }
    } else {
      newParams.set(`${urlParamPrefix}datePreset`, newPreset);
      newParams.delete(`${urlParamPrefix}dateFrom`);
      newParams.delete(`${urlParamPrefix}dateTo`);
    }
    
    setSearchParams(newParams);
  }, [searchParams, setSearchParams, syncToUrl, urlParamPrefix]);
  
  // Set preset
  const setPreset = useCallback((newPreset: DateRangePreset) => {
    setPresetState(newPreset);
    if (newPreset !== 'custom') {
      setCustomRangeState({ from: null, to: null });
    }
    updateUrlParams(newPreset);
  }, [updateUrlParams]);
  
  // Set custom range
  const setCustomRange = useCallback((range: DateRange) => {
    setPresetState('custom');
    setCustomRangeState(range);
    updateUrlParams('custom', range);
  }, [updateUrlParams]);
  
  // Reset to default
  const resetToDefault = useCallback(() => {
    setPreset(defaultPreset);
  }, [defaultPreset, setPreset]);
  
  // Check if filter is active (not default)
  const isFilterActive = preset !== 'all_time';
  
  // Get display label for current selection
  const getPresetLabel = useCallback((presetId: DateRangePreset): string => {
    const found = DATE_RANGE_PRESETS.find(p => p.id === presetId);
    return found?.labelKey || 'filters.custom';
  }, []);
  
  return {
    preset,
    dateRange,
    dateFrom,
    dateTo,
    setPreset,
    setCustomRange,
    resetToDefault,
    isFilterActive,
    getPresetLabel,
    presets: DATE_RANGE_PRESETS,
  };
}
