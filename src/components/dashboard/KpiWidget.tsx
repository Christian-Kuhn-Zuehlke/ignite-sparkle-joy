import { useState, useEffect } from 'react';
import { Target, CheckCircle, AlertTriangle, XCircle, TrendingUp, Loader2 } from '@/components/icons';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  KpiWithStatus,
  fetchKpisWithStatus,
  getUnitLabel,
} from '@/services/kpiService';

interface KpiWidgetProps {
  companyId?: string;
}

export function KpiWidget({ companyId }: KpiWidgetProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [kpis, setKpis] = useState<KpiWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKpis();
  }, [companyId]);

  const loadKpis = async () => {
    try {
      setLoading(true);
      const data = await fetchKpisWithStatus(companyId);
      // Only show active KPIs
      setKpis(data.filter(k => k.is_active));
    } catch (error) {
      console.error('Error loading KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: KpiWithStatus['status']) => {
    switch (status) {
      case 'achieved':
        return <CheckCircle className="h-5 w-5 text-status-shipped" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-status-processing" />;
      case 'missed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Target className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getProgressValue = (kpi: KpiWithStatus): number => {
    if (kpi.current_value === null) return 0;
    
    if (kpi.unit === 'percent') {
      return Math.min(100, (kpi.current_value / kpi.target_value) * 100);
    } else {
      // For time-based: invert (lower is better)
      if (kpi.current_value <= kpi.target_value) return 100;
      return Math.max(0, 100 - ((kpi.current_value - kpi.target_value) / kpi.target_value) * 100);
    }
  };

  const getProgressColor = (status: KpiWithStatus['status']): string => {
    switch (status) {
      case 'achieved':
        return 'bg-status-shipped';
      case 'warning':
        return 'bg-status-processing';
      case 'missed':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      </Card>
    );
  }

  if (kpis.length === 0) {
    return (
      <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Target className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold text-foreground">
              {t('widgets.slaPerformance')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('widgets.noKpisConfigured')}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/kpis')}
        >
          {t('widgets.setupKpis')}
        </Button>
      </Card>
    );
  }

  // Summary stats
  const achieved = kpis.filter(k => k.status === 'achieved').length;
  const warning = kpis.filter(k => k.status === 'warning').length;
  const missed = kpis.filter(k => k.status === 'missed').length;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <TrendingUp className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="font-heading text-base font-semibold text-foreground">
              {t('widgets.slaPerformance')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {achieved}/{kpis.length} {t('widgets.goalsAchieved')}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/kpis')}
        >
          {t('widgets.details')}
        </Button>
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 mb-4">
        {achieved > 0 && (
          <Badge variant="default" className="bg-status-shipped">
            <CheckCircle className="mr-1 h-3 w-3" />
            {achieved} {t('widgets.achieved')}
          </Badge>
        )}
        {warning > 0 && (
          <Badge variant="default" className="bg-status-processing">
            <AlertTriangle className="mr-1 h-3 w-3" />
            {warning} {t('widgets.warning')}
          </Badge>
        )}
        {missed > 0 && (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            {missed} {t('widgets.missed')}
          </Badge>
        )}
      </div>

      {/* KPI list */}
      <div className="space-y-4">
        {kpis.map((kpi, index) => (
          <div 
            key={kpi.id}
            className={cn(
              "animate-fade-in",
              "p-3 rounded-lg bg-secondary/30"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getStatusIcon(kpi.status)}
                <span className="font-medium text-sm text-foreground">
                  {kpi.name}
                </span>
              </div>
              <div className="text-right">
                <span className={cn(
                  "font-semibold text-sm",
                  kpi.status === 'achieved' && "text-status-shipped",
                  kpi.status === 'warning' && "text-status-processing",
                  kpi.status === 'missed' && "text-destructive",
                  kpi.status === 'no_data' && "text-muted-foreground"
                )}>
                  {kpi.current_value !== null 
                    ? `${kpi.current_value} ${getUnitLabel(kpi.unit)}`
                    : '—'}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  / {kpi.target_value} {getUnitLabel(kpi.unit)}
                </span>
              </div>
            </div>
            <div className="relative">
              <Progress 
                value={getProgressValue(kpi)} 
                className="h-2"
              />
              <div 
                className={cn(
                  "absolute top-0 left-0 h-2 rounded-full transition-all",
                  getProgressColor(kpi.status)
                )}
                style={{ width: `${getProgressValue(kpi)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
