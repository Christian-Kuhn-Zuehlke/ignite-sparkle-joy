import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface TableSkeletonProps {
  columns: number;
  rows?: number;
  hasHeader?: boolean;
  className?: string;
}

export function TableSkeleton({ 
  columns, 
  rows = 5, 
  hasHeader = true,
  className 
}: TableSkeletonProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card shadow-card overflow-hidden', className)}>
      <Table>
        {hasHeader && (
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex} className="animate-pulse">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton 
                    className={cn(
                      'h-4',
                      colIndex === 0 ? 'w-24' : 'w-16',
                      colIndex === columns - 1 ? 'w-8' : ''
                    )} 
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Card skeleton for mobile views
interface CardSkeletonProps {
  count?: number;
  className?: string;
}

export function CardSkeleton({ count = 3, className }: CardSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="bg-card border border-border rounded-lg p-4 animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          
          {/* Content */}
          <div className="space-y-2 mb-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Dashboard widget skeleton
export function WidgetSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-card border border-border rounded-xl p-4 animate-pulse', className)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

// Stats grid skeleton
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <WidgetSkeleton key={i} />
      ))}
    </div>
  );
}
