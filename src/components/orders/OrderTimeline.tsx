import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderStatus } from '@/services/dataService';
import { useBrandedIcons } from '@/hooks/useBrandedIcon';

interface TimelineStep {
  id: OrderStatus;
  label: string;
}

const steps: TimelineStep[] = [
  { id: 'received', label: 'Eingegangen' },
  { id: 'putaway', label: 'Einlagerung' },
  { id: 'picking', label: 'Picking' },
  { id: 'packing', label: 'Packing' },
  { id: 'ready_to_ship', label: 'Versandbereit' },
  { id: 'shipped', label: 'Versendet' },
];

interface OrderTimelineProps {
  currentStatus: OrderStatus;
}

// Golf ball SVG for Golfyr
function GolfBallMini({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5"
      className={className}
    >
      <circle cx="12" cy="12" r="5" fill={filled ? "currentColor" : "none"} />
      {filled && (
        <>
          <circle cx="10" cy="11" r="0.8" fill="white" opacity="0.5" />
          <circle cx="13" cy="10" r="0.8" fill="white" opacity="0.5" />
          <circle cx="12" cy="13" r="0.8" fill="white" opacity="0.5" />
        </>
      )}
    </svg>
  );
}

export function OrderTimeline({ currentStatus }: OrderTimelineProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStatus);
  const { iconTheme } = useBrandedIcons();
  const isGolfBranded = iconTheme === 'golf';

  return (
    <div className="flex items-center justify-between overflow-x-auto pb-2 -mx-2 px-2 md:mx-0 md:px-0">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <div key={step.id} className="flex flex-1 items-center min-w-0">
            <div className="flex flex-col items-center">
              <div 
                className={cn(
                  "flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full border-2 transition-all duration-300 shrink-0",
                  isCompleted && "border-status-shipped bg-status-shipped text-primary-foreground",
                  isCurrent && "border-accent bg-accent/10 text-accent animate-pulse-subtle",
                  isUpcoming && "border-border bg-secondary text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 md:h-4 md:w-4" />
                ) : isGolfBranded ? (
                  <GolfBallMini className="h-4 w-4 md:h-5 md:w-5" filled={isCurrent} />
                ) : (
                  <Circle className={cn(
                    "h-2.5 w-2.5 md:h-3 md:w-3",
                    isCurrent && "fill-current"
                  )} />
                )}
              </div>
              <span className={cn(
                "mt-1.5 md:mt-2 text-[10px] md:text-xs font-medium text-center max-w-[50px] md:max-w-[80px] leading-tight",
                (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
            
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  "h-0.5 flex-1 mx-1 md:mx-2 rounded-full transition-colors duration-300 min-w-[8px]",
                  index < currentIndex ? "bg-status-shipped" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
