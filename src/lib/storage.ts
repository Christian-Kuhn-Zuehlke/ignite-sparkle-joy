/**
 * Safe localStorage utilities with error handling
 * Handles Private Browsing Mode, QuotaExceededError, and disabled localStorage
 */

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely get an item from localStorage
 * Returns null if localStorage is not available or item doesn't exist
 */
export function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('[Storage] localStorage not available:', error);
    return null;
  }
}

/**
 * Safely set an item in localStorage
 * Returns true if successful, false if failed
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.warn('[Storage] localStorage quota exceeded');
        // Try to clear old data and retry
        try {
          clearOldStorageData();
          localStorage.setItem(key, value);
          return true;
        } catch {
          console.error('[Storage] Failed to set even after clearing old data');
        }
      } else if (error.name === 'SecurityError') {
        console.warn('[Storage] localStorage access denied (private browsing?)');
      }
    }
    return false;
  }
}

/**
 * Safely remove an item from localStorage
 */
export function safeLocalStorageRemove(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn('[Storage] Failed to remove item:', error);
    return false;
  }
}

/**
 * Safely get and parse JSON from localStorage
 */
export function safeLocalStorageGetJSON<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn('[Storage] Failed to get/parse JSON:', error);
    return defaultValue;
  }
}

/**
 * Safely set JSON in localStorage
 */
export function safeLocalStorageSetJSON(key: string, value: unknown): boolean {
  try {
    const jsonString = JSON.stringify(value);
    return safeLocalStorageSet(key, jsonString);
  } catch (error) {
    console.warn('[Storage] Failed to stringify/set JSON:', error);
    return false;
  }
}

/**
 * Clear old storage data to free up space
 * Removes expired items and oldest items if needed
 */
function clearOldStorageData(): void {
  try {
    // Get all keys with timestamps (our pattern: key_timestamp)
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // Remove any cache items that might be stale
        if (key.includes('cache_') || key.includes('temp_')) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`[Storage] Cleared ${keysToRemove.length} old items`);
  } catch (error) {
    console.error('[Storage] Failed to clear old data:', error);
  }
}

/**
 * Session storage utilities (more reliable in private browsing)
 */
export function safeSessionStorageGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.warn('[Storage] sessionStorage not available:', error);
    return null;
  }
}

export function safeSessionStorageSet(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn('[Storage] Failed to set sessionStorage:', error);
    return false;
  }
}

export function safeSessionStorageRemove(key: string): boolean {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn('[Storage] Failed to remove from sessionStorage:', error);
    return false;
  }
}
