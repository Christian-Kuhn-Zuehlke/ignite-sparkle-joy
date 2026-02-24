import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  start?: number;
  end: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  easing?: 'easeOut' | 'easeInOut' | 'linear';
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function linear(t: number): number {
  return t;
}

export function useCountUp({
  start = 0,
  end,
  duration = 1500,
  delay = 0,
  decimals = 0,
  easing = 'easeOut',
}: UseCountUpOptions): number {
  const [count, setCount] = useState(start);
  const countRef = useRef(start);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const previousEndRef = useRef(end);

  useEffect(() => {
    // If end value changed, animate from current to new end
    const startValue = previousEndRef.current !== end ? countRef.current : start;
    previousEndRef.current = end;

    const easingFn = easing === 'easeOut' ? easeOutQuart : easing === 'easeInOut' ? easeInOutQuart : linear;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current - delay;

      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);
      const currentValue = startValue + (end - startValue) * easedProgress;

      countRef.current = currentValue;
      setCount(currentValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = null;
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [end, start, duration, delay, easing]);

  return decimals > 0 ? parseFloat(count.toFixed(decimals)) : Math.round(count);
}

// Formatted version that returns string with locale formatting
export function useCountUpFormatted(options: UseCountUpOptions & { locale?: string }): string {
  const { locale = 'de-DE', ...rest } = options;
  const count = useCountUp(rest);
  
  return count.toLocaleString(locale);
}
