import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to manage AbortController for cancelling requests
 * Automatically aborts on unmount to prevent race conditions
 */
export function useAbortController() {
  const controllerRef = useRef<AbortController | null>(null);

  /**
   * Get a new AbortController, aborting any existing one
   * Use this before starting a new request
   */
  const getController = useCallback(() => {
    // Abort previous request if any
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    
    // Create new controller
    controllerRef.current = new AbortController();
    return controllerRef.current;
  }, []);

  /**
   * Get the current signal without creating a new controller
   */
  const getSignal = useCallback(() => {
    if (!controllerRef.current) {
      controllerRef.current = new AbortController();
    }
    return controllerRef.current.signal;
  }, []);

  /**
   * Manually abort the current request
   */
  const abort = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
  }, []);

  /**
   * Check if the current signal has been aborted
   */
  const isAborted = useCallback(() => {
    return controllerRef.current?.signal.aborted ?? false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  return {
    getController,
    getSignal,
    abort,
    isAborted,
  };
}

/**
 * Hook to cancel requests when dependencies change
 * Useful for search/filter operations
 */
export function useCancelOnChange(dependencies: unknown[]) {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort previous request when dependencies change
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    
    controllerRef.current = new AbortController();
    
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, dependencies);

  const getSignal = useCallback(() => {
    return controllerRef.current?.signal;
  }, []);

  return { getSignal };
}
