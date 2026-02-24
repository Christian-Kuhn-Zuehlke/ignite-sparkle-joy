import { useEffect, useCallback, useRef } from 'react';

type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  callback: () => void;
  description?: string;
  preventDefault?: boolean;
};

type ShortcutMap = Map<string, KeyboardShortcut>;

function getShortcutKey(e: KeyboardEvent | { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }): string {
  const parts: string[] = [];
  if ('ctrlKey' in e ? e.ctrlKey : e.ctrl) parts.push('ctrl');
  if ('metaKey' in e ? e.metaKey : e.meta) parts.push('meta');
  if ('altKey' in e ? e.altKey : e.alt) parts.push('alt');
  if ('shiftKey' in e ? e.shiftKey : e.shift) parts.push('shift');
  parts.push(e.key.toLowerCase());
  return parts.join('+');
}

/**
 * Hook for registering keyboard shortcuts
 * 
 * @example
 * useKeyboardShortcuts([
 *   { key: 'k', ctrl: true, callback: () => openSearch(), description: 'Open search' },
 *   { key: '/', callback: () => focusSearch(), description: 'Focus search' },
 *   { key: 'Escape', callback: () => closeModal(), description: 'Close modal' },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutMapRef = useRef<ShortcutMap>(new Map());

  // Update shortcut map when shortcuts change
  useEffect(() => {
    shortcutMapRef.current.clear();
    shortcuts.forEach(shortcut => {
      const key = getShortcutKey({
        key: shortcut.key,
        ctrl: shortcut.ctrl,
        shift: shortcut.shift,
        alt: shortcut.alt,
        meta: shortcut.meta,
      });
      shortcutMapRef.current.set(key, shortcut);
    });
  }, [shortcuts]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Escape in inputs
      if (e.key !== 'Escape') return;
    }

    const key = getShortcutKey(e);
    const shortcut = shortcutMapRef.current.get(key);

    if (shortcut) {
      if (shortcut.preventDefault !== false) {
        e.preventDefault();
      }
      shortcut.callback();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for a single keyboard shortcut (simpler API)
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: Omit<KeyboardShortcut, 'key' | 'callback'> = {}
) {
  useKeyboardShortcuts([{ key, callback, ...options }]);
}

/**
 * Get keyboard shortcut display string
 */
export function getShortcutDisplay(shortcut: Omit<KeyboardShortcut, 'callback'>): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const parts: string[] = [];
  
  if (shortcut.ctrl) parts.push(isMac ? '⌃' : 'Ctrl');
  if (shortcut.meta) parts.push(isMac ? '⌘' : 'Win');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shift) parts.push(isMac ? '⇧' : 'Shift');
  
  // Format key display
  let keyDisplay = shortcut.key.toUpperCase();
  if (shortcut.key === 'Escape') keyDisplay = 'Esc';
  if (shortcut.key === 'ArrowUp') keyDisplay = '↑';
  if (shortcut.key === 'ArrowDown') keyDisplay = '↓';
  if (shortcut.key === 'ArrowLeft') keyDisplay = '←';
  if (shortcut.key === 'ArrowRight') keyDisplay = '→';
  if (shortcut.key === 'Enter') keyDisplay = '↵';
  if (shortcut.key === ' ') keyDisplay = 'Space';
  
  parts.push(keyDisplay);
  
  return parts.join(isMac ? '' : '+');
}
