import { toast } from 'sonner';

/**
 * Centralized error handler that logs the error and shows a toast notification.
 * 
 * @param error - The error to handle (can be Error, string, or unknown)
 * @param context - Optional context string for logging (e.g., 'OrderFetch', 'UserUpdate')
 * @returns The error message string
 */
export function handleError(error: unknown, context?: string): string {
  const message = error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten';
  
  if (context) {
    console.error(`[${context}]`, error);
  } else {
    console.error('Error:', error);
  }
  
  toast.error(message);
  
  return message;
}

/**
 * Extracts error message from an unknown error type.
 * Does NOT show a toast - use when you want to handle the error display yourself.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Ein unbekannter Fehler ist aufgetreten';
}
