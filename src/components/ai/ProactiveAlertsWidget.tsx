import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bell,
  AlertTriangle,
  Clock,
  Package,
  RotateCcw,
  Target,
  TrendingUp,
  
  Sparkles,
  RefreshCw,
  ChevronRight,
  Zap,
  Shield
} from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface Alert {
  id: string;
  type: 'low_stock' | 'delayed_order' | 'return_spike' | 'kpi_warning' | 'anomaly' | 'opportunity';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  action?: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

const alertConfig = {
  low_stock: { icon: Package, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  delayed_order: { icon: Clock, color: 'text-red-500', bg: 'bg-red-500/10' },
  return_spike: { icon: RotateCcw, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  kpi_warning: { icon: Target, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  anomaly: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  opportunity: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
};

const severityStyles = {
  critical: { badge: 'destructive', border: 'border-destructive/50', bg: 'bg-destructive/5' },
  warning: { badge: 'secondary', border: 'border-orange-500/50', bg: 'bg-orange-500/5' },
  info: { badge: 'outline', border: 'border-primary/30', bg: 'bg-primary/5' },
};

export const ProactiveAlertsWidget: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { profile, activeCompanyId } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const effectiveCompanyId = activeCompanyId === 'ALL' ? profile?.company_id : activeCompanyId;

  const fetchAlerts = async (showRefresh = false) => {
    if (!effectiveCompanyId) return;
    
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-alerts', {
        body: { 
          companyId: effectiveCompanyId,
          generateAiInsight: true 
        }
      });

      if (error) throw error;

      setAlerts(data.alerts || []);
      setAiInsight(data.aiInsight || null);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => fetchAlerts(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [effectiveCompanyId]);

  const handleAlertClick = (alert: Alert) => {
    switch (alert.type) {
      case 'low_stock':
        navigate('/inventory?filter=low-stock');
        break;
      case 'delayed_order':
        if (alert.data?.orderId) {
          navigate(`/orders/${alert.data.orderId}`);
        } else {
          navigate('/orders?status=pending');
        }
        break;
      case 'return_spike':
        navigate('/returns');
        break;
      case 'kpi_warning':
        navigate('/kpis');
        break;
      default:
        navigate('/');
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  if (isLoading) {
    return (
      <Card className={compact ? '' : ''}>
        <CardHeader className={compact ? 'pb-2' : 'pb-3'}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            {t('alerts.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", compact ? '' : '')}>
      <CardHeader className={cn("pb-3", compact ? 'py-3' : '')}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="relative">
              <Bell className="h-5 w-5" />
              {criticalCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
              )}
            </div>
            {t('alerts.title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">{criticalCount}</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-600">{warningCount}</Badge>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => fetchAlerts(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={cn("pt-0", compact ? 'pb-3' : '')}>
        {aiInsight && !compact && (
          <div className="mb-4 p-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/20">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">{aiInsight}</p>
            </div>
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
              <Shield className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm font-medium">{t('alerts.allClear')}</p>
            <p className="text-xs">{t('alerts.noIssues')}</p>
          </div>
        ) : (
          <ScrollArea className={compact ? "h-[200px]" : "h-[300px]"}>
            <div className="space-y-2 pr-2">
              {alerts.slice(0, compact ? 5 : 10).map((alert) => {
                const config = alertConfig[alert.type] || alertConfig.anomaly;
                const Icon = config.icon;
                const severity = severityStyles[alert.severity];
                
                return (
                  <button
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all",
                      "hover:shadow-md hover:scale-[1.01]",
                      severity.border,
                      severity.bg
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", config.bg)}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="font-medium text-sm truncate">{alert.title}</span>
                          <div className="flex items-center gap-1">
                            <Badge variant={severity.badge as any} className="text-[10px] px-1.5 py-0">
                              {alert.severity}
                            </Badge>
                            <ChevronRight className="h-4 w-4 opacity-50 flex-shrink-0" />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                        {alert.action && !compact && (
                          <p className="text-xs text-primary mt-1 flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {alert.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {alerts.length > (compact ? 5 : 10) && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full mt-2 text-xs"
            onClick={() => navigate('/ai')}
          >
            {t('alerts.viewAll')} ({alerts.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
