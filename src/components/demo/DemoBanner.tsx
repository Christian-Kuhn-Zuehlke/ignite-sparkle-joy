import { Sparkles, Clock, ArrowRight, X } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DemoBannerProps {
  message: string;
  onStartTour?: () => void;
}

export function DemoBanner({ message, onStartTour }: DemoBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className={cn(
      "relative overflow-hidden",
      "bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-amber-500/90",
      "text-white px-4 py-3"
    )}>
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,white_1px,transparent_1px)] bg-[length:20px_20px]" />
      </div>
      
      <div className="relative flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 animate-pulse">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">🎉 Demo-Modus aktiv</span>
              <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                <Clock className="h-3 w-3" />
                <span>Freischaltung ausstehend</span>
              </div>
            </div>
            <p className="text-sm text-white/90 mt-0.5">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onStartTour && (
            <Button 
              size="sm" 
              variant="secondary"
              className="bg-white text-amber-600 hover:bg-white/90 gap-1"
              onClick={onStartTour}
            >
              Features erkunden
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
