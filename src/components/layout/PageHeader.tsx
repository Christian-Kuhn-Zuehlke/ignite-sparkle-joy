import { ChevronRight, Home } from '@/components/icons';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="border-b border-border bg-card px-4 md:px-6 py-3 md:py-4">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm mb-2">
          <Link 
            to="/" 
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={index} className="flex items-center gap-1">
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                {isLast || !item.href ? (
                  <span className={cn(
                    "text-sm",
                    isLast ? "font-medium text-foreground" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                ) : (
                  <Link 
                    to={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      )}

      {/* Title + Actions row */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-secondary leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-subtitle mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
