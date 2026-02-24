import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SLAResultStatus, SLAResult } from '@/services/slaService';
import { useSLAResultsForOrder } from '@/hooks/useSLAResults';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SLABadgeProps {
  orderId: string;
  compact?: boolean;
}

export function SLABadge({ orderId, compact = false }: SLABadgeProps) {
  const { data: results, isLoading, error } = useSLAResultsForOrder(orderId);

  // Don't show badge if loading, error, or no results
  if (isLoading || error || !results || !Array.isArray(results) || results.length === 0) {
    return null;
  }

  // Get the worst status (breached > at_risk > met)
  const priority: Record<SLAResultStatus, number> = {
    breached: 3,
    at_risk: 2,
    met: 1,
    not_applicable: 0,
    excluded: 0,
  };

  const worstResult = results.reduce((worst: SLAResult, current: SLAResult) => {
    const currentPriority = priority[current.status as SLAResultStatus] || 0;
    const worstPriority = priority[worst.status as SLAResultStatus] || 0;
    return currentPriority > worstPriority ? current : worst;
  }, results[0]);

  const getBadgeConfig = (status: SLAResultStatus) => {
    switch (status) {
      case 'met':
        return {
          variant: 'default' as const,
          className: 'bg-green-500 hover:bg-green-600',
          icon: CheckCircle2,
          label: 'SLA Eingehalten',
        };
      case 'at_risk':
        return {
          variant: 'default' as const,
          className: 'bg-yellow-500 hover:bg-yellow-600',
          icon: AlertTriangle,
          label: 'SLA At Risk',
        };
      case 'breached':
        return {
          variant: 'destructive' as const,
          className: '',
          icon: XCircle,
          label: 'SLA Verletzt',
        };
      default:
        return null;
    }
  };

  const config = getBadgeConfig(worstResult.status);
  if (!config) return null;

  const Icon = config.icon;
  const elapsedHours = worstResult.elapsed_minutes 
    ? Math.floor(worstResult.elapsed_minutes / 60) 
    : null;
  const elapsedMins = worstResult.elapsed_minutes 
    ? worstResult.elapsed_minutes % 60 
    : null;
  const targetHours = Math.floor(worstResult.target_minutes / 60);
  const targetMins = worstResult.target_minutes % 60;

  const tooltipContent = (
    <div className="space-y-1">
      <p className="font-medium">{config.label}</p>
      {worstResult.elapsed_minutes !== null && (
        <p className="text-xs">
          Verstrichen: {elapsedHours}h {elapsedMins}m
        </p>
      )}
      <p className="text-xs">
        Ziel: {targetHours}h {targetMins}m
      </p>
    </div>
  );

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={config.variant} className={config.className}>
              <Icon className="h-3 w-3" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className={config.className}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
