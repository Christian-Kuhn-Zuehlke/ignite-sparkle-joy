import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Bug, Wrench, Plus } from 'lucide-react';
import { parseISO, isAfter, differenceInDays } from 'date-fns';

const LAST_SEEN_DATE_KEY = 'msdirect-last-seen-changelog-date';

interface ChangelogEntry {
  version: string;
  date: string; // Format: YYYY-MM-DD
  status: 'beta' | 'stable';
  changes: {
    type: 'feature' | 'fix' | 'improvement' | 'new';
    description: string;
  }[];
}

// Changelog hier pflegen - neueste Version zuerst
// WICHTIG: Datum im Format YYYY-MM-DD pflegen!
export const changelog: ChangelogEntry[] = [
  {
    version: '0.9.0',
    date: '2026-01-21',
    status: 'beta',
    changes: [
      { type: 'feature', description: 'Retourenquoten-Analyse pro SKU mit Trend-Visualisierung' },
      { type: 'feature', description: 'Lagerumschlag-Widget mit Reichweite in Tagen' },
      { type: 'feature', description: 'Lieferzeit-Monitoring mit SLA-Tracking' },
      { type: 'feature', description: 'Carrier-Performance Dashboard mit Zustellquoten' },
      { type: 'feature', description: 'Saisonale Trend-Analysen mit Vorjahresvergleich' },
      { type: 'feature', description: 'Automatische E-Mail-Reports (täglich/wöchentlich/monatlich)' },
      { type: 'feature', description: 'Erweiterte Smart-Alerts (Revenue, Churn, Delays)' },
      { type: 'improvement', description: 'Export-Funktionen für Carrier & Kundendaten' },
      { type: 'fix', description: 'Passwort-Sichtbarkeit auf Mobile' },
    ],
  },
  {
    version: '0.8.0',
    date: '2026-01-14',
    status: 'beta',
    changes: [
      { type: 'feature', description: 'ABC-Analyse mit einheitlichem Zeitraum-Filter' },
      { type: 'improvement', description: 'Standardisierte Datums-Filter auf allen Seiten' },
      { type: 'fix', description: 'Changelog-Versionierung korrigiert' },
    ],
  },
  {
    version: '0.7.1',
    date: '2026-01-13',
    status: 'beta',
    changes: [
      { type: 'feature', description: 'Executive Dashboard mit KPI-Übersicht' },
      { type: 'feature', description: 'ABC-Analyse für Bestandsoptimierung' },
      { type: 'improvement', description: 'Mehrsprachige Unterstützung erweitert' },
    ],
  },
  {
    version: '0.7.0',
    date: '2026-01-10',
    status: 'beta',
    changes: [
      { type: 'feature', description: 'AI-Hub mit Chatbot und Analysen' },
      { type: 'feature', description: 'Packaging Intelligence' },
      { type: 'feature', description: 'Quality Dashboard' },
    ],
  },
  {
    version: '0.6.0',
    date: '2025-12-20',
    status: 'beta',
    changes: [
      { type: 'feature', description: 'Inbound Management für Wareneingänge' },
      { type: 'feature', description: 'Forecast & Budget-Planung' },
      { type: 'improvement', description: 'SLA-Tracking auf Event-basiertes Modell umgestellt' },
    ],
  },
];

const typeConfig = {
  new: { icon: Plus, label: 'Neu', className: 'bg-green-500/10 text-green-500' },
  feature: { icon: Sparkles, label: 'Feature', className: 'bg-blue-500/10 text-blue-500' },
  fix: { icon: Bug, label: 'Bugfix', className: 'bg-red-500/10 text-red-500' },
  improvement: { icon: Wrench, label: 'Verbesserung', className: 'bg-amber-500/10 text-amber-500' },
};

// Ermittelt Änderungen seit dem letzten Login
function getChangesSinceDate(lastSeenDate: string | null): ChangelogEntry[] {
  if (!lastSeenDate) {
    // Erster Besuch - zeige nur die neueste Version
    return changelog.slice(0, 1);
  }

  const lastSeen = parseISO(lastSeenDate);
  return changelog.filter(entry => isAfter(parseISO(entry.date), lastSeen));
}

export function useChangelogAutoShow() {
  const [shouldShow, setShouldShow] = useState(false);
  const [newChanges, setNewChanges] = useState<ChangelogEntry[]>([]);
  const [daysSinceLastVisit, setDaysSinceLastVisit] = useState<number | null>(null);

  useEffect(() => {
    const lastSeenDate = localStorage.getItem(LAST_SEEN_DATE_KEY);
    const changes = getChangesSinceDate(lastSeenDate);
    
    if (lastSeenDate) {
      const days = differenceInDays(new Date(), parseISO(lastSeenDate));
      setDaysSinceLastVisit(days);
    }
    
    if (changes.length > 0) {
      setNewChanges(changes);
      setShouldShow(true);
    }
  }, []);

  const markAsSeen = () => {
    // Speichere das aktuelle Datum als "zuletzt gesehen"
    localStorage.setItem(LAST_SEEN_DATE_KEY, new Date().toISOString().split('T')[0]);
    setShouldShow(false);
  };

  return { shouldShow, markAsSeen, newChanges, daysSinceLastVisit };
}

interface ChangelogProps {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Zeigt nur diese Einträge an (für "neue Änderungen seit letztem Login") */
  filteredEntries?: ChangelogEntry[];
  /** Anzahl Tage seit letztem Besuch */
  daysSinceLastVisit?: number | null;
}

export function Changelog({ 
  children, 
  open: controlledOpen, 
  onOpenChange,
  filteredEntries,
  daysSinceLastVisit 
}: ChangelogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  // Wenn filteredEntries übergeben wird, zeige nur diese; sonst alle
  const entriesToShow = filteredEntries ?? changelog;
  const isFiltered = filteredEntries && filteredEntries.length > 0;

  const getDaysText = () => {
    if (daysSinceLastVisit === null || daysSinceLastVisit === undefined) return null;
    if (daysSinceLastVisit === 0) return 'Willkommen zurück! Du warst heute schon hier.';
    if (daysSinceLastVisit === 1) return 'Willkommen zurück! Du warst gestern zuletzt hier.';
    return `Willkommen zurück! Dein letzter Besuch war vor ${daysSinceLastVisit} Tagen.`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isFiltered ? 'Neu seit deinem letzten Besuch' : 'Changelog'}
          </DialogTitle>
          {isFiltered && daysSinceLastVisit !== null && (
            <p className="text-sm text-muted-foreground mt-1">
              {getDaysText()}
            </p>
          )}
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {entriesToShow.map((entry) => (
              <div key={entry.version} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">v{entry.version}</span>
                  <Badge variant={entry.status === 'beta' ? 'secondary' : 'default'}>
                    {entry.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                </div>
                <ul className="space-y-2 pl-1">
                  {entry.changes.map((change, idx) => {
                    const config = typeConfig[change.type];
                    const Icon = config.icon;
                    return (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${config.className}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                        <span className="text-muted-foreground">{change.description}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
