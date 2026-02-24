import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  className?: string;
  locale?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({
  value,
  duration = 1200,
  delay = 0,
  decimals = 0,
  className,
  locale = 'de-DE',
  prefix = '',
  suffix = '',
}: AnimatedCounterProps) {
  const count = useCountUp({
    end: value,
    duration,
    delay,
    decimals,
    easing: 'easeOut',
  });

  const formattedValue = decimals > 0 
    ? count.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(count).toLocaleString(locale);

  return (
    <span className={cn('tabular-nums', className)}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
}
