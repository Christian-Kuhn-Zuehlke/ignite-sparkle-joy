import { ReactNode } from 'react';
import { Package, Plus, Search, FolderOpen, FileQuestion } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: {
    icon: 'h-8 w-8',
    title: 'text-base',
    desc: 'text-xs',
    padding: 'p-4 md:p-6',
  },
  md: {
    icon: 'h-10 w-10',
    title: 'text-lg',
    desc: 'text-sm',
    padding: 'p-6 md:p-8',
  },
  lg: {
    icon: 'h-12 w-12',
    title: 'text-xl',
    desc: 'text-base',
    padding: 'p-8 md:p-12',
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const config = sizeConfig[size];
  
  return (
    <div 
      className={cn(
        'rounded-xl border border-border bg-card shadow-card text-center',
        'animate-fade-in',
        config.padding,
        className
      )}
    >
      <div className={cn('mx-auto mb-3 text-muted-foreground', config.icon)}>
        {icon || <Package className="h-full w-full" />}
      </div>
      
      <h3 className={cn('font-semibold text-foreground mb-1', config.title)}>
        {title}
      </h3>
      
      {description && (
        <p className={cn('text-muted-foreground mb-4 max-w-sm mx-auto', config.desc)}>
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4">
          {action && (
            <Button onClick={action.onClick} size={size === 'sm' ? 'sm' : 'default'}>
              {action.icon || <Plus className="h-4 w-4 mr-2" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              variant="outline" 
              onClick={secondaryAction.onClick}
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-configured empty states for common use cases
export function NoResultsState({ 
  searchTerm,
  onClear,
}: { 
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={<Search className="h-full w-full" />}
      title="Keine Ergebnisse gefunden"
      description={
        searchTerm 
          ? `Keine Treffer für "${searchTerm}". Versuchen Sie einen anderen Suchbegriff.`
          : 'Versuchen Sie, Ihre Suchkriterien anzupassen.'
      }
      action={onClear ? {
        label: 'Filter zurücksetzen',
        onClick: onClear,
        icon: null,
      } : undefined}
      size="md"
    />
  );
}

export function NoDataState({ 
  entity,
  onAdd,
  addLabel,
}: { 
  entity: string;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <EmptyState
      icon={<FolderOpen className="h-full w-full" />}
      title={`Keine ${entity} vorhanden`}
      description={onAdd ? `Erstellen Sie Ihre erste ${entity}, um loszulegen.` : undefined}
      action={onAdd ? {
        label: addLabel || `${entity} erstellen`,
        onClick: onAdd,
      } : undefined}
      size="md"
    />
  );
}

export function ErrorState({ 
  message,
  onRetry,
}: { 
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<FileQuestion className="h-full w-full text-destructive" />}
      title="Etwas ist schiefgelaufen"
      description={message || 'Ein unerwarteter Fehler ist aufgetreten.'}
      action={onRetry ? {
        label: 'Erneut versuchen',
        onClick: onRetry,
        icon: null,
      } : undefined}
      size="md"
    />
  );
}
