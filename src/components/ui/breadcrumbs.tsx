import { ChevronRight, Home } from '@/components/icons';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn("flex items-center gap-1 text-sm", className)}
    >
      <Link 
        to="/" 
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            {isLast || !item.href ? (
              <span className={cn(
                "flex items-center gap-1",
                isLast ? "font-medium text-foreground" : "text-muted-foreground"
              )}>
                {item.icon}
                {item.label}
              </span>
            ) : (
              <Link 
                to={item.href}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.icon}
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}