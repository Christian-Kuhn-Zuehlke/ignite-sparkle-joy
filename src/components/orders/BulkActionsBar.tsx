import { X, CheckSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OrderStatus } from '@/services/dataService';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onUpdateStatus: (status: OrderStatus) => void;
  isUpdating: boolean;
}

const statusOptions: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'received', label: 'Eingegangen', color: 'bg-blue-500' },
  { value: 'putaway', label: 'Einlagerung', color: 'bg-cyan-500' },
  { value: 'picking', label: 'Picking', color: 'bg-yellow-500' },
  { value: 'packing', label: 'Packing', color: 'bg-orange-500' },
  { value: 'ready_to_ship', label: 'Versandbereit', color: 'bg-purple-500' },
  { value: 'shipped', label: 'Versendet', color: 'bg-green-500' },
  { value: 'delivered', label: 'Zugestellt', color: 'bg-emerald-500' },
];

export function BulkActionsBar({ 
  selectedCount, 
  onClearSelection, 
  onUpdateStatus,
  isUpdating,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-3 rounded-xl shadow-lg border border-primary/20">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          <span className="font-medium">{selectedCount} ausgewählt</span>
        </div>
        
        <div className="h-6 w-px bg-primary-foreground/20" />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="secondary" 
              size="sm" 
              disabled={isUpdating}
              className="gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aktualisiere...
                </>
              ) : (
                'Status ändern'
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuLabel>Neuer Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {statusOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onUpdateStatus(option.value)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className={cn("h-2 w-2 rounded-full", option.color)} />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClearSelection}
          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
