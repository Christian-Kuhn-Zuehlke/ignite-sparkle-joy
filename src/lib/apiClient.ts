/**
 * API Client with Timeout Handling
 * Provides fetch wrapper with configurable timeouts and abort handling
 */

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export class TimeoutError extends Error {
  constructor(message = 'Request timeout - bitte versuchen Sie es erneut') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Fetch with timeout support
 * Automatically aborts requests that take longer than the specified timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError();
    }
    throw error;
  }
}

/**
 * Create an AbortController with automatic timeout
 * Useful for Supabase queries and other async operations
 */
export function createTimeoutController(timeout = DEFAULT_TIMEOUT): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
  clear: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return {
    controller,
    timeoutId,
    clear: () => clearTimeout(timeoutId),
  };
}

/**
 * Wrap a promise with timeout
 * Useful for any async operation that doesn't support AbortController
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout = DEFAULT_TIMEOUT,
  errorMessage = 'Operation timed out'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(errorMessage));
    }, timeout);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError || 
    (error instanceof Error && error.name === 'AbortError');
}
