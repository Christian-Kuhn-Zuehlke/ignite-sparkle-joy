import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Changelog, useChangelogAutoShow, changelog } from './Changelog';
import { useAuth } from '@/contexts/AuthContext';

// Build-Datum - manuell pflegen bei Releases
const BUILD_DATE = '2026-01-21';

// Aktuelle Version aus dem Changelog (erste = neueste)
export const APP_VERSION = changelog[0]?.version || '0.1.0';
export const APP_STATUS = changelog[0]?.status || 'beta';

export function VersionFooter() {
  const { shouldShow, markAsSeen, newChanges, daysSinceLastVisit } = useChangelogAutoShow();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // Nur auf Auth-Seiten NICHT automatisch anzeigen
  const isAuthPage = location.pathname === '/auth' || location.pathname === '/reset-password';

  useEffect(() => {
    // Changelog nur anzeigen wenn: User eingeloggt UND nicht auf Auth-Seite
    if (shouldShow && user && !isAuthPage) {
      // Kurze Verzögerung damit die App erst geladen wird
      const timer = setTimeout(() => setDialogOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldShow, user, isAuthPage]);

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open && shouldShow) {
      markAsSeen();
    }
  };

  // Auf Auth-Seiten nur die Version anzeigen, kein Dialog
  if (isAuthPage) {
    return (
      <div className="fixed bottom-2 right-2 z-50">
        <span className="text-[10px] text-muted-foreground/50 font-mono">
          v{APP_VERSION} {APP_STATUS} • {BUILD_DATE}
        </span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-2 right-2 z-50">
      <Changelog 
        open={dialogOpen} 
        onOpenChange={handleOpenChange}
        filteredEntries={shouldShow ? newChanges : undefined}
        daysSinceLastVisit={shouldShow ? daysSinceLastVisit : undefined}
      >
        <button className="text-[10px] text-muted-foreground/50 font-mono hover:text-muted-foreground transition-colors cursor-pointer">
          v{APP_VERSION} {APP_STATUS} • {BUILD_DATE}
        </button>
      </Changelog>
    </div>
  );
}
