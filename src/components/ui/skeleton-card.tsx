import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card/80 backdrop-blur-sm p-5 shadow-card animate-fade-in",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-4 w-24 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" />
          <div className="h-8 w-20 rounded-lg bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" style={{ animationDelay: '100ms' }} />
        </div>
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-muted via-muted-foreground/10 to-muted animate-shimmer" style={{ animationDelay: '200ms' }} />
      </div>
      <div className="mt-4 pt-3 border-t border-border/30">
        <div className="h-3 w-16 rounded-full bg-muted animate-shimmer" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card/80 backdrop-blur-sm shadow-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex gap-4 bg-muted/30">
        <div className="h-4 w-32 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" />
        <div className="h-4 w-24 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" style={{ animationDelay: '50ms' }} />
        <div className="h-4 w-20 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer flex-1" style={{ animationDelay: '100ms' }} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div 
          key={i} 
          className="border-b border-border last:border-0 px-6 py-4 flex items-center gap-4 hover:bg-muted/10 transition-colors"
          style={{ animationDelay: `${i * 75}ms` }}
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-muted via-muted-foreground/10 to-muted animate-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" />
            <div className="h-3 w-32 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" style={{ animationDelay: '50ms' }} />
          </div>
          <div className="h-6 w-20 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonWidget({ className }: SkeletonCardProps) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card animate-fade-in",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-32 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" />
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-muted via-muted-foreground/10 to-muted animate-shimmer" style={{ animationDelay: '100ms' }} />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" style={{ animationDelay: '150ms' }} />
        <div className="h-4 w-3/4 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" style={{ animationDelay: '200ms' }} />
        <div className="h-4 w-1/2 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" style={{ animationDelay: '250ms' }} />
      </div>
    </div>
  );
}

export function SkeletonChart({ className }: SkeletonCardProps) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card animate-fade-in",
      className
    )}>
      <div className="flex items-center justify-between mb-6">
        <div className="h-5 w-40 rounded-full bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" />
        <div className="h-8 w-24 rounded-lg bg-gradient-to-r from-muted via-muted-foreground/10 to-muted animate-shimmer" style={{ animationDelay: '100ms' }} />
      </div>
      {/* Chart bars skeleton */}
      <div className="h-48 w-full flex items-end justify-between gap-2 px-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div 
            key={i}
            className="flex-1 rounded-t-lg bg-gradient-to-t from-muted via-muted-foreground/10 to-transparent animate-shimmer"
            style={{ 
              height: `${30 + Math.random() * 70}%`,
              animationDelay: `${i * 100}ms`
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonMetricCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className={`animate-card-entrance-${Math.min(i + 1, 4)}`} />
      ))}
    </div>
  );
}