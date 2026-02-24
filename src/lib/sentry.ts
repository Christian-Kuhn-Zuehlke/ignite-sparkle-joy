import * as Sentry from '@sentry/react';

// Sentry configuration for production error tracking
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  // Only initialize in production or if DSN is explicitly set
  if (!SENTRY_DSN) {
    console.log('[Sentry] No DSN configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Environment detection
    environment: import.meta.env.MODE,
    
    // Release tracking (uses git commit hash if available)
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    
    // Sample rate for performance monitoring (1.0 = 100%)
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,
    
    // Sample rate for session replays
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Integration configuration
    integrations: [
      // Browser tracing for performance
      Sentry.browserTracingIntegration(),
      // Session replay for debugging
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Filter out known non-critical errors
    beforeSend(event, hint) {
      const error = hint?.originalException;
      
      // Ignore network errors that are expected (user offline, etc.)
      if (error instanceof TypeError && error.message?.includes('Failed to fetch')) {
        return null;
      }
      
      // Ignore cancelled requests
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      
      // Ignore ResizeObserver errors (common browser quirk)
      if (error instanceof Error && error.message?.includes('ResizeObserver')) {
        return null;
      }
      
      return event;
    },
    
    // Don't send PII automatically
    sendDefaultPii: false,
    
    // Allowed URLs (only track errors from our app)
    allowUrls: [
      /lovable\.app/,
      /lovable\.dev/,
      /lovableproject\.com/,
      /localhost/,
    ],
    
    // Ignore errors from browser extensions
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });

  console.log('[Sentry] Initialized with DSN:', SENTRY_DSN.substring(0, 20) + '...');
}

// Helper to identify users (call after login)
export function identifySentryUser(user: { id: string; email?: string; }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
}

// Clear user on logout
export function clearSentryUser() {
  Sentry.setUser(null);
}

// Set context for current company
export function setSentryCompanyContext(companyId: string, companyName?: string) {
  Sentry.setContext('company', {
    id: companyId,
    name: companyName,
  });
  Sentry.setTag('company_id', companyId);
}

// Manual error capture with extra context
export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

// Capture message for non-error events
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level);
}

// Performance monitoring helpers
export function startTransaction(name: string, op: string) {
  return Sentry.startInactiveSpan({ name, op });
}

// Add breadcrumb for debugging
export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}
