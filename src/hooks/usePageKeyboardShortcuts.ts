import { useCallback, useRef } from 'react';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

interface UsePageKeyboardShortcutsOptions {
  onFocusSearch?: () => void;
  onClearFilters?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
}

/**
 * Standard keyboard shortcuts for list pages (Orders, Inventory, Returns)
 * - '/' focuses the search input
 * - 'Escape' clears all filters
 * - 'Ctrl+E' exports data
 * - 'Ctrl+R' refreshes data
 */
export function usePageKeyboardShortcuts({
  onFocusSearch,
  onClearFilters,
  onExport,
  onRefresh,
}: UsePageKeyboardShortcutsOptions) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const focusSearch = useCallback(() => {
    if (onFocusSearch) {
      onFocusSearch();
    } else if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [onFocusSearch]);

  type ShortcutDef = {
    key: string;
    ctrl?: boolean;
    callback: () => void;
    description: string;
    preventDefault?: boolean;
  };

  const shortcuts: ShortcutDef[] = [
    {
      key: '/',
      callback: focusSearch,
      description: 'Suche fokussieren',
    },
    {
      key: 'Escape',
      callback: () => onClearFilters?.(),
      description: 'Filter zurücksetzen',
      preventDefault: false,
    },
  ];

  if (onExport) {
    shortcuts.push({
      key: 'e',
      ctrl: true,
      callback: onExport,
      description: 'Exportieren',
    });
  }

  if (onRefresh) {
    shortcuts.push({
      key: 'r',
      ctrl: true,
      callback: onRefresh,
      description: 'Aktualisieren',
    });
  }

  useKeyboardShortcuts(shortcuts);

  return { searchInputRef };
}
