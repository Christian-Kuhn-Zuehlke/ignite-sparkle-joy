import { AlertTriangle, Clock, Package, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  titleKey: string;
  descriptionKey: string;
  timeKey: string;
}

const alertsData: Alert[] = [
  {
    id: '1',
    type: 'warning',
    titleKey: 'alerts.slaExceeded',
    descriptionKey: 'alerts.slaExceededDesc',
    timeKey: 'alerts.hoursAgo'
  },
  {
    id: '2',
    type: 'error',
    titleKey: 'alerts.lowStock',
    descriptionKey: 'alerts.lowStockDesc',
    timeKey: 'alerts.hoursAgo4'
  },
  {
    id: '3',
    type: 'info',
    titleKey: 'alerts.returnsOpen',
    descriptionKey: 'alerts.returnsOpenDesc',
    timeKey: 'common.today'
  }
];

export function AlertsWidget() {
  const { t } = useLanguage();

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-status-exception/10',
          icon: 'text-status-exception',
          border: 'border-l-status-exception'
        };
      case 'warning':
        return {
          bg: 'bg-status-pending/10',
          icon: 'text-status-pending',
          border: 'border-l-status-pending'
        };
      case 'info':
        return {
          bg: 'bg-status-processing/10',
          icon: 'text-status-processing',
          border: 'border-l-status-processing'
        };
    }
  };

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <AlertTriangle className="h-4 w-4 text-status-pending" />
        <h3 className="font-heading text-base font-semibold text-foreground">
          {t('widgets.alertsExceptions')}
        </h3>
        <span className="ml-auto rounded-full bg-status-exception/15 px-2 py-0.5 text-xs font-medium text-status-exception">
          {alertsData.length}
        </span>
      </div>
      
      <div className="divide-y divide-border">
        {alertsData.map((alert, index) => {
          const styles = getAlertStyles(alert.type);
          
          return (
            <div 
              key={alert.id}
              className={cn(
                "flex items-start gap-3 border-l-2 px-5 py-3.5 transition-colors hover:bg-secondary/30 cursor-pointer",
                styles.border,
                "animate-slide-in-left"
              )}
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <div className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md mt-0.5",
                styles.bg,
                styles.icon
              )}>
                {getIcon(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{t(alert.titleKey)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t(alert.descriptionKey)}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                <Clock className="h-3 w-3" />
                {t(alert.timeKey)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
