import { useEffect, useRef, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface UseSessionExpiryOptions {
  session: Session | null;
  onExpired?: () => void;
  warningMinutes?: number; // Minutes before expiry to show warning
  checkIntervalMs?: number; // How often to check (default: 60 seconds)
}

/**
 * Hook to monitor session expiry and show warnings
 * Supabase handles auto-refresh, but this provides user feedback
 */
export function useSessionExpiry({
  session,
  onExpired,
  warningMinutes = 5,
  checkIntervalMs = 60000,
}: UseSessionExpiryOptions) {
  const hasShownWarning = useRef(false);
  const lastWarningTime = useRef<number>(0);

  const checkSessionExpiry = useCallback(() => {
    if (!session?.expires_at) return;

    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - now;
    const warningThreshold = warningMinutes * 60;

    // Warning before expiry
    if (timeUntilExpiry <= warningThreshold && timeUntilExpiry > 0) {
      const minutesLeft = Math.ceil(timeUntilExpiry / 60);
      const now = Date.now();
      
      // Only show warning if we haven't shown one in the last 2 minutes
      if (!hasShownWarning.current || (now - lastWarningTime.current) > 120000) {
        hasShownWarning.current = true;
        lastWarningTime.current = now;
        
        toast.warning(
          `Ihre Session läuft in ${minutesLeft} Minute${minutesLeft > 1 ? 'n' : ''} ab.`,
          {
            description: 'Speichern Sie Ihre Arbeit.',
            duration: 10000,
          }
        );
      }
    }

    // Session expired
    if (timeUntilExpiry <= 0) {
      toast.error('Ihre Session ist abgelaufen.', {
        description: 'Bitte melden Sie sich erneut an.',
        duration: 0, // Don't auto-dismiss
      });
      onExpired?.();
    }

    // Reset warning flag if session was refreshed
    if (timeUntilExpiry > warningThreshold) {
      hasShownWarning.current = false;
    }
  }, [session, warningMinutes, onExpired]);

  useEffect(() => {
    if (!session) {
      hasShownWarning.current = false;
      return;
    }

    // Check immediately
    checkSessionExpiry();

    // Then check periodically
    const interval = setInterval(checkSessionExpiry, checkIntervalMs);

    return () => clearInterval(interval);
  }, [session, checkSessionExpiry, checkIntervalMs]);

  return {
    /**
     * Get remaining time until session expires (in seconds)
     */
    getTimeUntilExpiry: useCallback(() => {
      if (!session?.expires_at) return null;
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, session.expires_at - now);
    }, [session]),
    
    /**
     * Check if session is about to expire (within warning threshold)
     */
    isAboutToExpire: useCallback(() => {
      if (!session?.expires_at) return false;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = session.expires_at - now;
      return timeUntilExpiry <= warningMinutes * 60 && timeUntilExpiry > 0;
    }, [session, warningMinutes]),
  };
}
