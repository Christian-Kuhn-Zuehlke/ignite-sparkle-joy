import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getShortcutDisplay } from '@/hooks/useKeyboardShortcuts';
import { Keyboard } from 'lucide-react';

interface ShortcutItem {
  keys: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean };
  description: string;
  category: string;
}

const shortcuts: ShortcutItem[] = [
  // Navigation
  { keys: { key: '/' }, description: 'Suche fokussieren', category: 'Navigation' },
  { keys: { key: 'Escape' }, description: 'Filter zurücksetzen / Dialog schließen', category: 'Navigation' },
  
  // Actions
  { keys: { key: 'e', ctrl: true }, description: 'Daten exportieren', category: 'Aktionen' },
  { keys: { key: 'r', ctrl: true }, description: 'Daten aktualisieren', category: 'Aktionen' },
  
  // Help
  { keys: { key: '?', shift: true }, description: 'Tastaturkürzel anzeigen', category: 'Hilfe' },
];

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show modal on Shift+?
      if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutItem[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Tastaturkürzel
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {category}
              </h4>
              <div className="space-y-2">
                {items.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-muted border border-border rounded-md">
                      {getShortcutDisplay(shortcut.keys)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Drücke <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded">Esc</kbd> zum Schließen
        </p>
      </DialogContent>
    </Dialog>
  );
}
