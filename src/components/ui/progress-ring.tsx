import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: 'accent' | 'success' | 'warning' | 'danger';
  showValue?: boolean;
  label?: string;
  animated?: boolean;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  className,
  color = 'accent',
  showValue = true,
  label,
  animated = true,
}: ProgressRingProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (normalizedValue / 100) * circumference;

  const colorClasses = {
    accent: 'stroke-accent',
    success: 'stroke-status-shipped',
    warning: 'stroke-status-pending',
    danger: 'stroke-status-exception',
  };

  const glowColors = {
    accent: 'drop-shadow-[0_0_8px_hsl(var(--accent)/0.5)]',
    success: 'drop-shadow-[0_0_8px_hsl(var(--status-shipped)/0.5)]',
    warning: 'drop-shadow-[0_0_8px_hsl(var(--status-pending)/0.5)]',
    danger: 'drop-shadow-[0_0_8px_hsl(var(--status-exception)/0.5)]',
  };

  const valueColor = useMemo(() => {
    if (value >= 90) return 'text-status-shipped';
    if (value >= 70) return 'text-accent';
    if (value >= 50) return 'text-status-pending';
    return 'text-status-exception';
  }, [value]);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className={cn('transform -rotate-90', animated && 'transition-all duration-1000')}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? offset : offset}
          className={cn(
            colorClasses[color],
            glowColors[color],
            animated && 'transition-all duration-1000 ease-out'
          )}
          style={{
            '--progress-offset': offset,
          } as React.CSSProperties}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <span className={cn('font-heading text-2xl font-bold tabular-nums', valueColor)}>
            {Math.round(normalizedValue)}%
          </span>
        )}
        {label && (
          <span className="text-xs text-muted-foreground mt-0.5">{label}</span>
        )}
      </div>
    </div>
  );
}
