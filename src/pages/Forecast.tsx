import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  AlertTriangle, 
  ShoppingCart,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Target
} from '@/components/icons';
import { SeasonalTrendsWidget } from '@/components/analytics/SeasonalTrendsWidget';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface StockoutAlert {
  id: string;
  sku: string;
  product_name: string;
  abc_class: string | null;
  current_stock: number;
  avg_daily_demand: number;
  days_until_stockout: number;
  stockout_probability: number;
  estimated_revenue_at_risk: number;
  alert_severity: 'critical' | 'warning' | 'info';
  status: string;
  created_at: string;
}

interface ReplenishmentSuggestion {
  id: string;
  sku: string;
  product_name: string;
  current_stock: number;
  avg_daily_demand: number;
  days_of_stock_remaining: number;
  stockout_date: string;
  stockout_probability: number;
  suggested_order_quantity: number;
  order_by_date: string;
  reasoning: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  is_launch_product: boolean;
}

const Forecast = () => {
  useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [alerts, setAlerts] = useState<StockoutAlert[]>([]);
  const [suggestions, setSuggestions] = useState<ReplenishmentSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState('alerts');

  const fetchData = async () => {
    if (!effectiveCompanyId) return;
    
    setIsLoading(true);
    try {
      // Fetch stockout alerts
      const { data: alertsData } = await (supabase as any)
        .from('stockout_alerts')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('status', 'active')
        .order('alert_severity', { ascending: true });

      if (alertsData) {
        setAlerts(alertsData as StockoutAlert[]);
      }

      // Fetch replenishment suggestions
      const { data: suggestionsData } = await (supabase as any)
        .from('replenishment_suggestions')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('status', 'pending')
        .order('priority', { ascending: true });

      if (suggestionsData) {
        setSuggestions(suggestionsData as ReplenishmentSuggestion[]);
      }
    } catch (error) {
      console.error('Error fetching forecast data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [effectiveCompanyId]);

  const generateForecasts = async () => {
    if (!effectiveCompanyId) return;
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-forecasts', {
        body: { companyId: effectiveCompanyId }
      });

      if (error) throw error;

      toast.success('Prognosen aktualisiert', {
        description: `${data.alertsGenerated || 0} Warnungen, ${data.suggestionsGenerated || 0} Nachbestell-Empfehlungen`
      });

      await fetchData();
    } catch (error) {
      console.error('Forecast error:', error);
      toast.error('Fehler bei der Prognose-Erstellung');
    } finally {
      setIsGenerating(false);
    }
  };

  const acknowledgeAlert = async (id: string) => {
    try {
      await (supabase as any)
        .from('stockout_alerts')
        .update({ 
          status: 'acknowledged', 
          acknowledged_at: new Date().toISOString() 
        })
        .eq('id', id);

      setAlerts(prev => prev.filter(a => a.id !== id));
      toast.success('Warnung bestätigt');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const markAsOrdered = async (id: string) => {
    try {
      await (supabase as any)
        .from('replenishment_suggestions')
        .update({ 
          status: 'ordered', 
          actioned_at: new Date().toISOString() 
        })
        .eq('id', id);

      setSuggestions(prev => prev.filter(s => s.id !== id));
      toast.success('Als bestellt markiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const dismissSuggestion = async (id: string) => {
    try {
      await (supabase as any)
        .from('replenishment_suggestions')
        .update({ status: 'dismissed' })
        .eq('id', id);

      setSuggestions(prev => prev.filter(s => s.id !== id));
      toast.success('Empfehlung verworfen');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge className="bg-red-500">Kritisch</Badge>;
      case 'warning': return <Badge className="bg-orange-500">Warnung</Badge>;
      default: return <Badge className="bg-blue-500">Info</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge className="bg-red-500">Dringend</Badge>;
      case 'high': return <Badge className="bg-orange-500">Hoch</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Mittel</Badge>;
      default: return <Badge className="bg-blue-500">Niedrig</Badge>;
    }
  };

  const criticalAlerts = alerts.filter(a => a.alert_severity === 'critical');
  const warningAlerts = alerts.filter(a => a.alert_severity === 'warning');

  if (isLoading) {
    return (
      <MainLayout title="Prognosen & Nachbestellung" subtitle="Demand Intelligence" breadcrumbs={[{ label: 'Intelligence', href: '/abc-analysis' }, { label: 'Prognosen' }]}>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Prognosen & Nachbestellung" subtitle="Demand Intelligence" breadcrumbs={[{ label: 'Intelligence', href: '/abc-analysis' }, { label: 'Prognosen' }]}>
      <div className="space-y-6">
        {/* Seasonal Trends Analytics Widget */}
        <SeasonalTrendsWidget />
        {/* Header */}
        <Card className="border-accent/20 bg-gradient-to-r from-accent/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">Forecast & Replenishment</CardTitle>
              </div>
              <Button 
                onClick={generateForecasts} 
                disabled={isGenerating}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Berechnet...' : 'Prognosen aktualisieren'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              AI-basierte Nachfrage-Prognosen, Stock-out-Risiko-Warnungen und 
              datengestützte Nachbestell-Empfehlungen. Das Hub bestellt nichts automatisch – 
              es schlägt vor.
            </p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{criticalAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">Kritische Warnungen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{warningAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">Stock-out Warnungen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <ShoppingCart className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{suggestions.length}</p>
                  <p className="text-xs text-muted-foreground">Nachbestell-Vorschläge</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Target className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    CHF {Math.round(alerts.reduce((s, a) => s + (a.estimated_revenue_at_risk || 0), 0)).toLocaleString('de-CH')}
                  </p>
                  <p className="text-xs text-muted-foreground">Umsatz gefährdet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="alerts" className="relative">
              Stock-out Warnungen
              {alerts.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {alerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="replenishment" className="relative">
              Nachbestellung
              {suggestions.length > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-accent">
                  {suggestions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            {alerts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold">Keine Stock-out Risiken</h3>
                  <p className="text-muted-foreground">Alle Bestände sind ausreichend.</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-4">
                  {alerts.map((alert) => (
                    <Card key={alert.id} className={`border-l-4 ${
                      alert.alert_severity === 'critical' ? 'border-l-red-500' :
                      alert.alert_severity === 'warning' ? 'border-l-orange-500' : 'border-l-blue-500'
                    }`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{alert.product_name || alert.sku}</h4>
                              {getSeverityBadge(alert.alert_severity)}
                              {alert.abc_class && (
                                <Badge variant="outline">{alert.abc_class}-Artikel</Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">
                              SKU: {alert.sku}
                            </p>

                            {/* Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Aktueller Bestand</p>
                                <p className="font-semibold">{alert.current_stock} Stk.</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Ø Tagesabsatz</p>
                                <p className="font-semibold">{alert.avg_daily_demand?.toFixed(1)} Stk.</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Tage bis Stockout</p>
                                <p className="font-semibold text-red-500">{alert.days_until_stockout} Tage</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Umsatz gefährdet</p>
                                <p className="font-semibold">CHF {alert.estimated_revenue_at_risk?.toLocaleString('de-CH')}</p>
                              </div>
                            </div>

                            {/* Risk Bar */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Risiko:</span>
                              <Progress 
                                value={alert.stockout_probability * 100} 
                                className="h-2 flex-1"
                              />
                              <span className="text-xs font-medium">
                                {Math.round(alert.stockout_probability * 100)}%
                              </span>
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Bestätigen
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="replenishment" className="space-y-4">
            {suggestions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold">Keine Nachbestellungen nötig</h3>
                  <p className="text-muted-foreground">Alle Bestände sind ausreichend versorgt.</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-4">
                  {suggestions.map((suggestion) => (
                    <Card key={suggestion.id} className={`border-l-4 ${
                      suggestion.priority === 'critical' ? 'border-l-red-500' :
                      suggestion.priority === 'high' ? 'border-l-orange-500' :
                      suggestion.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                    }`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{suggestion.product_name || suggestion.sku}</h4>
                              {getPriorityBadge(suggestion.priority)}
                              {suggestion.is_launch_product && (
                                <Badge className="bg-purple-500">Launch</Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">
                              SKU: {suggestion.sku}
                            </p>

                            {/* Recommendation Box */}
                            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-accent" />
                                <span className="font-medium text-accent">Nachbestell-Empfehlung</span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground">Bestellmenge</p>
                                  <p className="text-lg font-bold">{suggestion.suggested_order_quantity} Stk.</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Bestellen bis</p>
                                  <p className="text-lg font-bold">
                                    {new Date(suggestion.order_by_date).toLocaleDateString('de-CH')}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Reasoning */}
                            {suggestion.reasoning && (
                              <p className="text-sm text-muted-foreground mb-3">
                                <strong>Begründung:</strong> {suggestion.reasoning}
                              </p>
                            )}

                            {/* Metrics */}
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Aktueller Bestand</p>
                                <p className="font-medium">{suggestion.current_stock} Stk.</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Reichweite</p>
                                <p className="font-medium">{suggestion.days_of_stock_remaining} Tage</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Stockout-Datum</p>
                                <p className="font-medium">
                                  {suggestion.stockout_date 
                                    ? new Date(suggestion.stockout_date).toLocaleDateString('de-CH')
                                    : '-'}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => markAsOrdered(suggestion.id)}
                              className="gap-1"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              Bestellt
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissSuggestion(suggestion.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Forecast;