import { ReactNode, memo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from '@/components/icons';
import { useLanguage } from '@/contexts/LanguageContext';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { useBranding } from '@/contexts/BrandingContext';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  trendLabel?: string;
  className?: string;
  accentColor?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  animationDelay?: number;
}

export const MetricCard = memo(function MetricCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendLabel,
  className,
  accentColor = 'default',
  onClick,
  animationDelay = 0,
}: MetricCardProps) {
  const { t } = useLanguage();
  const { isCustomBranded, brand } = useBranding();
  
  const accentColors = {
    default: 'bg-accent/10 text-accent',
    success: 'bg-status-shipped/10 text-status-shipped',
    warning: 'bg-status-pending/10 text-status-pending',
    danger: 'bg-status-exception/10 text-status-exception',
  };

  const glowColors = {
    default: 'hover:glow-accent',
    success: 'hover:glow-success',
    warning: 'hover:glow-warning',
    danger: 'hover:glow-danger',
  };

  const iconBgColors = {
    default: isCustomBranded 
      ? `hsl(${brand.accentHue} ${brand.accentSaturation}% ${brand.accentLightness}% / 0.15)`
      : undefined,
    success: undefined,
    warning: undefined,
    danger: undefined,
  };

  const numericValue = typeof value === 'number' ? value : parseInt(String(value), 10);
  const isNumeric = !isNaN(numericValue);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative rounded-xl border border-border/50 p-3 sm:p-4 md:p-5 transition-all duration-300",
        // Glassmorphism base
        "glass-card shadow-card",
        // Gradient border effect
        "gradient-border",
        // Hover effects - reduced on mobile for better performance
        "hover:shadow-elevated md:hover:scale-[1.02] md:hover:-translate-y-1",
        // Responsive height
        "h-full min-h-[100px] sm:min-h-[120px] md:min-h-[140px] flex flex-col",
        glowColors[accentColor],
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 via-transparent to-black/5 pointer-events-none" />
      
      <div className="relative flex items-start justify-between flex-1">
        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1 pr-2 sm:pr-3">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="font-heading text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            {isNumeric ? (
              <AnimatedCounter 
                value={numericValue} 
                duration={1200} 
                delay={animationDelay}
              />
            ) : (
              value
            )}
          </p>
        </div>
        <div 
          className={cn(
            "flex h-8 w-8 sm:h-10 sm:w-10 md:h-11 md:w-11 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-xl transition-all duration-300",
            "group-hover:scale-110 md:group-hover:rotate-3",
            accentColors[accentColor]
          )}
          style={iconBgColors[accentColor] ? { backgroundColor: iconBgColors[accentColor] } : undefined}
        >
          {icon}
        </div>
      </div>
      
      {trend && (
        <div className="relative mt-auto pt-2 sm:pt-3 flex items-center gap-1.5 sm:gap-2 border-t border-border/30">
          <div className={cn(
            "flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium",
            trend.isPositive 
              ? "bg-status-shipped/10 text-status-shipped" 
              : "bg-status-exception/10 text-status-exception"
          )}>
            {trend.isPositive ? (
              <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            ) : (
              <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            )}
            <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{trendLabel || t('common.vsPreviousPeriod')}</span>
        </div>
      )}
    </div>
  );
});
