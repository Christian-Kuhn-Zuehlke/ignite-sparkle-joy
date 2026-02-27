import { useState, useEffect, useMemo } from 'react';
import { Target, TrendingUp, CheckCircle, AlertTriangle, XCircle, Calendar, Loader2, RefreshCw, Zap } from '@/components/icons';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CompanyFilterDropdown } from '@/components/filters/CompanyFilterDropdown';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  KpiWithStatus,
  KpiMeasurement,
  fetchKpisWithStatus,
  fetchKpiHistory,
  calculateDeliveryTimeSla,
  calculateProcessingTime,
  saveMeasurement,
  getUnitLabel,
  getKpiTypeDescription,
} from '@/services/kpiService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { de, enUS, fr, it, es } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export default function Kpis() {
  const { role, profile, activeCompanyId } = useAuth();
  const { t, language } = useLanguage();
  const [kpis, setKpis] = useState<KpiWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [autoCalculating, setAutoCalculating] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<KpiWithStatus | null>(null);
  const [kpiHistory, setKpiHistory] = useState<KpiMeasurement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Get locale based on language
  const dateLocale = useMemo(() => {
    const locales = { de, en: enUS, fr, it, es };
    return locales[language] || de;
  }, [language]);

  const canViewAllCompanies = ['system_admin', 'msd_csm', 'msd_ma'].includes(role || '');
  
  // Use activeCompanyId for MSD staff, profile.company_id for customers
  const effectiveCompanyId = canViewAllCompanies 
    ? (activeCompanyId === 'ALL' ? undefined : activeCompanyId)
    : profile?.company_id;

  useEffect(() => {
    loadKpis();
  }, [effectiveCompanyId]);

  const loadKpis = async () => {
    try {
      setLoading(true);
      const data = await fetchKpisWithStatus(effectiveCompanyId || undefined);
      setKpis(data);
      
      // Auto-select first KPI for history
      if (data.length > 0 && !selectedKpi) {
        loadHistory(data[0]);
      }
    } catch (error) {
      console.error('Error loading KPIs:', error);
      toast.error(t('kpis.errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (kpi: KpiWithStatus) => {
    setSelectedKpi(kpi);
    setHistoryLoading(true);
    try {
      const history = await fetchKpiHistory(kpi.id, 30);
      setKpiHistory(history.reverse()); // Oldest first for chart
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCalculateKpis = async () => {
    const companyId = effectiveCompanyId || profile?.company_id;
    if (!companyId) return;

    setCalculating(true);
    try {
      const today = new Date();
      const lastMonth = subMonths(today, 1);
      const periodStart = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
      const periodEnd = format(endOfMonth(lastMonth), 'yyyy-MM-dd');

      let calculatedCount = 0;

      for (const kpi of kpis) {
        if (!kpi.is_active) continue;

        try {
          if (kpi.kpi_type === 'delivery_time_sla') {
            const result = await calculateDeliveryTimeSla(companyId, periodStart, periodEnd);
            if (result.total > 0) {
              await saveMeasurement(
                kpi.id,
                companyId,
                result.value,
                periodStart,
                periodEnd,
                result.total,
                result.success
              );
              calculatedCount++;
            }
          } else if (kpi.kpi_type === 'processing_time') {
            const result = await calculateProcessingTime(companyId, periodStart, periodEnd);
            if (result.total > 0) {
              await saveMeasurement(
                kpi.id,
                companyId,
                result.value,
                periodStart,
                periodEnd,
                result.total
              );
              calculatedCount++;
            }
          }
        } catch (err) {
          console.error(`Error calculating ${kpi.kpi_type}:`, err);
        }
      }

      if (calculatedCount > 0) {
        toast.success(`${calculatedCount} ${t('kpis.kpisCalculated')} (${format(lastMonth, 'MMMM yyyy', { locale: dateLocale })})`);
        loadKpis();
      } else {
        toast.info(t('kpis.noDataForCalculation'));
      }
    } catch (error) {
      console.error('Error calculating KPIs:', error);
      toast.error(t('kpis.errorCalculating'));
    } finally {
      setCalculating(false);
    }
  };

  const handleAutoCalculateKpis = async () => {
    const companyId = effectiveCompanyId || profile?.company_id;
    
    setAutoCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-kpis', {
        body: { company_id: companyId, period_days: 30 },
      });

      if (error) throw error;

      toast.success(`${data.calculated} ${t('kpis.kpisCalculated')}`);
      loadKpis();
    } catch (error) {
      console.error('Error auto-calculating KPIs:', error);
      toast.error(t('kpis.errorAutoCalculating'));
    } finally {
      setAutoCalculating(false);
    }
  };

  const getStatusIcon = (status: KpiWithStatus['status']) => {
    switch (status) {
      case 'achieved':
        return <CheckCircle className="h-6 w-6 text-status-shipped" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-status-processing" />;
      case 'missed':
        return <XCircle className="h-6 w-6 text-destructive" />;
      default:
        return <Target className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: KpiWithStatus['status']): string => {
    switch (status) {
      case 'achieved': return 'border-status-shipped bg-status-shipped/5';
      case 'warning': return 'border-status-processing bg-status-processing/5';
      case 'missed': return 'border-destructive bg-destructive/5';
      default: return 'border-border';
    }
  };

  const getProgressValue = (kpi: KpiWithStatus): number => {
    if (kpi.current_value === null) return 0;
    if (kpi.unit === 'percent') {
      return Math.min(100, (kpi.current_value / kpi.target_value) * 100);
    }
    if (kpi.current_value <= kpi.target_value) return 100;
    return Math.max(0, 100 - ((kpi.current_value - kpi.target_value) / kpi.target_value) * 100);
  };

  // Chart data
  const chartData = kpiHistory.map(m => ({
    date: format(new Date(m.period_end), 'MMM yy', { locale: dateLocale }),
    value: m.measured_value,
    target: selectedKpi?.target_value,
    warning: selectedKpi?.warning_threshold,
  }));

  return (
    <MainLayout 
      title={t('kpis.title')} 
      subtitle={t('kpis.subtitle')}
      breadcrumbs={[{ label: 'Intelligence', href: '/abc-analysis' }, { label: t('kpis.title') }]}
    >
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        {/* Company Filter */}
        <CompanyFilterDropdown />

        <Button
          variant="outline"
          onClick={handleCalculateKpis}
          disabled={calculating || autoCalculating || kpis.length === 0}
          className="gap-2"
        >
          {calculating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {t('kpis.manualCalculate')}
        </Button>

        <Button
          onClick={handleAutoCalculateKpis}
          disabled={calculating || autoCalculating || kpis.length === 0}
          className="gap-2"
        >
          {autoCalculating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {t('kpis.autoCalculate')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : kpis.length === 0 ? (
        <Card className="p-8 text-center">
          <Target className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
            {t('kpis.noKpis')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('kpis.defineKpis')}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* KPI Cards */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-heading text-lg font-semibold text-foreground">
              {t('kpis.currentPerformance')}
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {kpis.map((kpi, index) => (
                <Card
                  key={kpi.id}
                  className={cn(
                    "p-5 cursor-pointer transition-all hover:shadow-lg border-2",
                    getStatusColor(kpi.status),
                    selectedKpi?.id === kpi.id && "ring-2 ring-accent"
                  )}
                  onClick={() => loadHistory(kpi)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(kpi.status)}
                      <div>
                        <h4 className="font-heading font-semibold text-foreground">
                          {kpi.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {getKpiTypeDescription(kpi.kpi_type)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={kpi.is_active ? 'default' : 'secondary'}>
                      {kpi.is_active ? t('kpis.active') : t('kpis.inactive')}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{t('kpis.current')}</p>
                        <p className={cn(
                          "text-2xl font-bold",
                          kpi.status === 'achieved' && "text-status-shipped",
                          kpi.status === 'warning' && "text-status-processing",
                          kpi.status === 'missed' && "text-destructive",
                          kpi.status === 'no_data' && "text-muted-foreground"
                        )}>
                          {kpi.current_value !== null 
                            ? `${kpi.current_value}${getUnitLabel(kpi.unit)}`
                            : '—'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{t('kpis.target')}</p>
                        <p className="text-lg font-semibold text-foreground">
                          {kpi.target_value}{getUnitLabel(kpi.unit)}
                        </p>
                      </div>
                    </div>

                    <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "absolute top-0 left-0 h-full rounded-full transition-all",
                          kpi.status === 'achieved' && "bg-status-shipped",
                          kpi.status === 'warning' && "bg-status-processing",
                          kpi.status === 'missed' && "bg-destructive",
                          kpi.status === 'no_data' && "bg-muted"
                        )}
                        style={{ width: `${getProgressValue(kpi)}%` }}
                      />
                    </div>

                    {kpi.last_measurement && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {t('kpis.lastMeasured')}: {format(new Date(kpi.last_measurement.period_end), 'd. MMM yyyy', { locale: dateLocale })}
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* History Chart */}
          <div className="space-y-4">
            <h3 className="font-heading text-lg font-semibold text-foreground">
              {t('kpis.history')}
            </h3>

            <Card className="p-5">
              {selectedKpi ? (
                <>
                  <div className="mb-4">
                    <h4 className="font-heading font-semibold text-foreground">
                      {selectedKpi.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {t('kpis.last30Measurements')}
                    </p>
                  </div>

                  {historyLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-accent" />
                    </div>
                  ) : kpiHistory.length === 0 ? (
                    <div className="py-8 text-center">
                      <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t('kpis.noHistoricalData')}
                      </p>
                    </div>
                  ) : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 11 }}
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 11 }}
                            domain={selectedKpi.unit === 'percent' ? [0, 100] : ['auto', 'auto']}
                            className="text-muted-foreground"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [
                              `${value} ${getUnitLabel(selectedKpi.unit)}`,
                              t('kpis.value')
                            ]}
                          />
                          <ReferenceLine 
                            y={selectedKpi.target_value} 
                            stroke="hsl(var(--status-shipped))" 
                            strokeDasharray="5 5"
                            label={{ value: t('kpis.target'), position: 'right', fontSize: 10 }}
                          />
                          {selectedKpi.warning_threshold && (
                            <ReferenceLine 
                              y={selectedKpi.warning_threshold} 
                              stroke="hsl(var(--status-processing))" 
                              strokeDasharray="3 3"
                              label={{ value: t('kpis.warning'), position: 'right', fontSize: 10 }}
                            />
                          )}
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="hsl(var(--accent))"
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--accent))', strokeWidth: 0, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center">
                  <Target className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {t('kpis.selectKpi')}
                  </p>
                </div>
              )}
            </Card>

            {/* Summary Stats */}
            <Card className="p-5">
              <h4 className="font-heading font-semibold text-foreground mb-4">
                {t('kpis.summary')}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-status-shipped" />
                    <span className="text-sm">{t('kpis.achieved')}</span>
                  </div>
                  <Badge variant="default" className="bg-status-shipped">
                    {kpis.filter(k => k.status === 'achieved').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-status-processing" />
                    <span className="text-sm">{t('kpis.warning')}</span>
                  </div>
                  <Badge variant="outline" className="border-status-processing text-status-processing">
                    {kpis.filter(k => k.status === 'warning').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm">{t('kpis.missed')}</span>
                  </div>
                  <Badge variant="outline" className="border-destructive text-destructive">
                    {kpis.filter(k => k.status === 'missed').length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{t('kpis.noData')}</span>
                  </div>
                  <Badge variant="secondary">
                    {kpis.filter(k => k.status === 'no_data').length}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </MainLayout>
  );
}