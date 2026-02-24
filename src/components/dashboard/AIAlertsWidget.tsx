import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  Clock, 
  RotateCcw, 
  Target,
  Sparkles,
  RefreshCw,
  Bell,
  ChevronRight,
  CheckCircle2
} from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface Alert {
  id: string;
  type: 'low_stock' | 'delayed_order' | 'return_spike' | 'kpi_warning';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

const alertIcons = {
  low_stock: Package,
  delayed_order: Clock,
  return_spike: RotateCcw,
  kpi_warning: Target,
};

const severityStyles = {
  critical: 'bg-destructive/10 border-destructive/30 hover:bg-destructive/15',
  warning: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15',
  info: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15',
};

const severityIconStyles = {
  critical: 'bg-destructive/20 text-destructive',
  warning: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
  info: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
};

export const AIAlertsWidget: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFullInsight, setShowFullInsight] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const fetchAlerts = async (showRefresh = false) => {
    if (!profile?.company_id) return;
    
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-alerts', {
        body: { 
          companyId: profile.company_id,
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
  }, [profile?.company_id]);

  const handleAlertClick = (alert: Alert) => {
    switch (alert.type) {
      case 'low_stock':
        navigate('/inventory');
        break;
      case 'delayed_order':
        if (alert.data?.orderId) {
          navigate(`/orders/${alert.data.orderId}`);
        } else {
          navigate('/orders');
        }
        break;
      case 'return_spike':
        navigate('/returns');
        break;
      case 'kpi_warning':
        navigate('/kpis');
        break;
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  // Truncate AI insight for display
  const truncatedInsight = aiInsight && aiInsight.length > 150 
    ? aiInsight.substring(0, 150) + '...' 
    : aiInsight;

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-accent/5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            AI Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            AI Alerts
            {alerts.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 text-xs px-1.5">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
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
        
        {(criticalCount > 0 || warningCount > 0) && (
          <div className="flex gap-2 mt-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs px-2 py-0.5">
                {criticalCount} {t('widgets.critical')}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-xs px-2 py-0.5 text-amber-600 border-amber-500/50 bg-amber-500/10">
                {warningCount} {t('widgets.warning')}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        {/* AI Insight - Collapsible */}
        {aiInsight && (
          <div 
            className="p-3 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-border/50 cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={() => setShowFullInsight(!showFullInsight)}
          >
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm text-muted-foreground leading-relaxed",
                  !showFullInsight && "line-clamp-3"
                )}>
                  {showFullInsight ? aiInsight : truncatedInsight}
                </p>
                {aiInsight.length > 150 && (
                  <button className="text-xs text-primary hover:underline mt-1">
                    {showFullInsight ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="w-12 h-12 rounded-full bg-status-shipped/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-status-shipped" />
            </div>
            <p className="text-sm font-medium text-foreground">{t('widgets.noAlerts')}</p>
            <p className="text-xs text-muted-foreground mt-1">Alles läuft reibungslos</p>
          </div>
        ) : (
          <ScrollArea className="h-[240px]">
            <div className="p-2 space-y-1.5">
              {alerts.slice(0, 8).map((alert) => {
                const Icon = alertIcons[alert.type];
                return (
                  <button
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg border transition-all",
                      severityStyles[alert.severity]
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        "p-1.5 rounded-md flex-shrink-0",
                        severityIconStyles[alert.severity]
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm text-foreground truncate">
                            {alert.title}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
