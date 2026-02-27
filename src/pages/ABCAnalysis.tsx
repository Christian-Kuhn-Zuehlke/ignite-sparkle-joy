import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Package, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2,
  XCircle,
  DollarSign,
  Percent,
  Sparkles,
  Target,
  ShoppingCart,
  RotateCcw,
  Calendar
} from '@/components/icons';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import { useDateRangeFilter, DateRangePreset } from '@/hooks/useDateRangeFilter';
import { differenceInDays } from 'date-fns';

interface ABCClassification {
  id: string;
  sku: string;
  product_name: string;
  abc_class: 'A' | 'B' | 'C';
  total_revenue: number;
  revenue_share_percent: number;
  order_count: number;
  units_sold: number;
  current_stock: number;
  avg_days_in_warehouse: number;
  days_of_stock: number | null;
  return_rate_percent: number;
  stockout_risk_score: number;
  overstock_risk_score: number;
  trending_direction: 'up' | 'stable' | 'down';
}

interface ABCRecommendation {
  id: string;
  sku: string;
  recommendation_type: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  reasoning: string;
  confidence_score: number;
  estimated_impact_value: number | null;
  estimated_impact_type: string | null;
  status: string;
  key_metrics: Record<string, unknown>;
}

interface AnalysisRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: string;
  total_skus_analyzed: number;
  a_class_count: number;
  b_class_count: number;
  c_class_count: number;
  ai_summary: string | null;
  analysis_period_days: number;
}

// Helper to convert date range preset to days
const getPresetDays = (preset: DateRangePreset, dateRange: { from: Date | null; to: Date | null }): number => {
  // For "all_time", use 3650 days (10 years) as a practical "all data" timeframe
  if (preset === 'all_time') return 3650;
  if (dateRange.from && dateRange.to) {
    return differenceInDays(dateRange.to, dateRange.from);
  }
  switch (preset) {
    case 'last_30_days': return 30;
    case 'last_90_days': return 90;
    case 'last_6_months': return 180;
    case 'last_year': return 365;
    case 'current_year': 
      return differenceInDays(new Date(), new Date(new Date().getFullYear(), 0, 1));
    default: return 90;
  }
};

const ABCAnalysis = () => {
  useAuth(); // Ensure user is authenticated
  const effectiveCompanyId = useEffectiveCompanyId();
  useLanguage(); // For future translations
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [classifications, setClassifications] = useState<ABCClassification[]>([]);
  const [recommendations, setRecommendations] = useState<ABCRecommendation[]>([]);
  const [latestRun, setLatestRun] = useState<AnalysisRun | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [classFilter, setClassFilter] = useState<'A' | 'B' | 'C' | null>(null);
  
  // Use standard date range filter
  const dateFilter = useDateRangeFilter({ 
    defaultPreset: 'last_90_days',
    syncToUrl: true,
    urlParamPrefix: 'abc_'
  });

  const handleClassClick = (cls: 'A' | 'B' | 'C') => {
    setClassFilter(cls);
    setActiveTab('details');
  };

  const handleRecommendationsClick = () => {
    setActiveTab('recommendations');
  };

  const filteredClassifications = classFilter 
    ? classifications.filter(c => c.abc_class === classFilter)
    : classifications;

  const fetchData = async () => {
    if (!effectiveCompanyId) return;
    
    setIsLoading(true);
    try {
      // Fetch latest analysis run
      const { data: runs } = await (supabase as any)
        .from('abc_analysis_runs')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1);

      if (runs && runs.length > 0) {
        setLatestRun(runs[0] as AnalysisRun);
      }

      // Fetch classifications
      const { data: classData } = await supabase
        .from('abc_classifications')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('revenue', { ascending: false });

      if (classData) {
        setClassifications(classData as unknown as ABCClassification[]);
      }

      // Fetch recommendations
      const { data: recData } = await (supabase as any)
        .from('abc_recommendations')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('status', 'open')
        .order('priority', { ascending: true });

      if (recData) {
        setRecommendations(recData as ABCRecommendation[]);
      }
    } catch (error) {
      console.error('Error fetching ABC data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [effectiveCompanyId]);

  const runAnalysis = async () => {
    if (!effectiveCompanyId) return;
    
    setIsAnalyzing(true);
    try {
      // Calculate period days from date filter
      const periodDays = getPresetDays(dateFilter.preset, dateFilter.dateRange);
      
      const { data, error } = await supabase.functions.invoke('abc-analysis', {
        body: { 
          companyId: effectiveCompanyId, 
          periodDays: periodDays,
          dateFrom: dateFilter.dateFrom,
          dateTo: dateFilter.dateTo
        }
      });

      if (error) throw error;

      toast.success('ABC-Analyse abgeschlossen', {
        description: periodDays 
          ? `Zeitraum: ${periodDays} Tage - ${data.aiSummary}`
          : `Gesamter Zeitraum - ${data.aiSummary}`
      });

      await fetchData();
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Fehler bei der Analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const dismissRecommendation = async (id: string) => {
    try {
      await (supabase as any)
        .from('abc_recommendations')
        .update({ status: 'dismissed', actioned_at: new Date().toISOString() })
        .eq('id', id);

      setRecommendations(prev => prev.filter(r => r.id !== id));
      toast.success('Empfehlung verworfen');
    } catch (error) {
      toast.error('Fehler beim Verwerfen');
    }
  };

  const completeRecommendation = async (id: string) => {
    try {
      await (supabase as any)
        .from('abc_recommendations')
        .update({ status: 'completed', actioned_at: new Date().toISOString() })
        .eq('id', id);

      setRecommendations(prev => prev.filter(r => r.id !== id));
      toast.success('Empfehlung als erledigt markiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  // Prepare chart data
  const pieData = [
    { name: 'A-Artikel', value: classifications.filter(c => c.abc_class === 'A').length, color: '#22c55e' },
    { name: 'B-Artikel', value: classifications.filter(c => c.abc_class === 'B').length, color: '#f59e0b' },
    { name: 'C-Artikel', value: classifications.filter(c => c.abc_class === 'C').length, color: '#ef4444' }
  ];

  const revenueData = [
    { 
      name: 'A', 
      revenue: classifications.filter(c => c.abc_class === 'A').reduce((s, c) => s + c.total_revenue, 0),
      count: classifications.filter(c => c.abc_class === 'A').length
    },
    { 
      name: 'B', 
      revenue: classifications.filter(c => c.abc_class === 'B').reduce((s, c) => s + c.total_revenue, 0),
      count: classifications.filter(c => c.abc_class === 'B').length
    },
    { 
      name: 'C', 
      revenue: classifications.filter(c => c.abc_class === 'C').reduce((s, c) => s + c.total_revenue, 0),
      count: classifications.filter(c => c.abc_class === 'C').length
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'clearance_sale': return <Percent className="h-5 w-5" />;
      case 'reorder_soon': return <ShoppingCart className="h-5 w-5" />;
      case 'reduce_stock': return <TrendingDown className="h-5 w-5" />;
      case 'monitor_closely': return <AlertTriangle className="h-5 w-5" />;
      case 'return_to_supplier': return <RotateCcw className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getClassBadge = (cls: string) => {
    switch (cls) {
      case 'A': return <Badge className="bg-green-500">A</Badge>;
      case 'B': return <Badge className="bg-yellow-500">B</Badge>;
      case 'C': return <Badge className="bg-red-500">C</Badge>;
      default: return <Badge>{cls}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="ABC-Analyse" subtitle="Artikel-Klassifizierung & Empfehlungen" breadcrumbs={[{ label: 'Intelligence', href: '/abc-analysis' }, { label: 'ABC-Analyse' }]}>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="ABC-Analyse" subtitle="Artikel-Klassifizierung & Empfehlungen" breadcrumbs={[{ label: 'Intelligence', href: '/abc-analysis' }, { label: 'ABC-Analyse' }]}>
      <div className="space-y-6">
        {/* Header with AI Summary */}
        <Card className="border-accent/20 bg-gradient-to-r from-accent/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <CardTitle className="text-lg">AI-Analyse</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <DateRangeFilter
                  preset={dateFilter.preset}
                  dateRange={dateFilter.dateRange}
                  onPresetChange={dateFilter.setPreset}
                  onCustomRangeChange={(from, to) => dateFilter.setCustomRange({ from, to })}
                  onClear={dateFilter.resetToDefault}
                  compact
                />
                <Button 
                  onClick={runAnalysis} 
                  disabled={isAnalyzing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  {isAnalyzing ? 'Analysiert...' : 'Neue Analyse'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {latestRun?.ai_summary ? (
              <p className="text-muted-foreground">{latestRun.ai_summary}</p>
            ) : (
              <p className="text-muted-foreground">
                Keine Analyse vorhanden. Starten Sie eine neue ABC-Analyse.
              </p>
            )}
            {latestRun && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                <span>Letzte Analyse: {new Date(latestRun.completed_at || latestRun.started_at).toLocaleString('de-CH')}</span>
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {(latestRun.analysis_period_days || 90) >= 3650 
                    ? 'Gesamter Zeitraum' 
                    : `${latestRun.analysis_period_days || 90} Tage Zeitraum`}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats - Clickable */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:border-green-500/50 hover:shadow-md transition-all"
            onClick={() => handleClassClick('A')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Package className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{classifications.filter(c => c.abc_class === 'A').length}</p>
                  <p className="text-xs text-muted-foreground">A-Artikel (Top-Performer)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:border-yellow-500/50 hover:shadow-md transition-all"
            onClick={() => handleClassClick('B')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Package className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{classifications.filter(c => c.abc_class === 'B').length}</p>
                  <p className="text-xs text-muted-foreground">B-Artikel (Mittelfeld)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:border-red-500/50 hover:shadow-md transition-all"
            onClick={() => handleClassClick('C')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Package className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{classifications.filter(c => c.abc_class === 'C').length}</p>
                  <p className="text-xs text-muted-foreground">C-Artikel (Langsamdreher)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:border-accent/50 hover:shadow-md transition-all"
            onClick={handleRecommendationsClick}
          >
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-accent/10">
                  <AlertTriangle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{recommendations.length}</p>
                  <p className="text-xs text-muted-foreground">Offene Empfehlungen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Übersicht</TabsTrigger>
            <TabsTrigger value="recommendations" className="relative">
              Empfehlungen
              {recommendations.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {recommendations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Verteilung nach Klasse</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 cursor-pointer">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          onClick={(data) => {
                            const classMap: Record<string, 'A' | 'B' | 'C'> = {
                              'A-Artikel': 'A',
                              'B-Artikel': 'B',
                              'C-Artikel': 'C'
                            };
                            if (data?.name && classMap[data.name]) {
                              handleClassClick(classMap[data.name]);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {pieData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              style={{ cursor: 'pointer' }}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Umsatz nach Klasse</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 cursor-pointer">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData}>
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip 
                          formatter={(value: number) => [`CHF ${value.toLocaleString('de-CH')}`, 'Umsatz']}
                        />
                        <Bar 
                          dataKey="revenue" 
                          fill="hsl(var(--accent))" 
                          radius={[4, 4, 0, 0]} 
                          onClick={(data) => {
                            const classMap: Record<string, 'A' | 'B' | 'C'> = { 'A': 'A', 'B': 'B', 'C': 'C' };
                            if (data?.name && classMap[data.name]) {
                              handleClassClick(classMap[data.name]);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top A-Articles */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Top A-Artikel
                </CardTitle>
                <CardDescription>Ihre umsatzstärksten Produkte</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {classifications
                    .filter(c => c.abc_class === 'A')
                    .slice(0, 5)
                    .map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">{item.sku}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">CHF {item.total_revenue.toLocaleString('de-CH')}</p>
                          <p className="text-sm text-muted-foreground">{item.order_count} Bestellungen</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            {recommendations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold">Alles erledigt!</h3>
                  <p className="text-muted-foreground">Keine offenen Empfehlungen vorhanden.</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  {recommendations.map((rec) => (
                    <Card key={rec.id} className="relative overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityColor(rec.priority)}`} />
                      <CardContent className="pt-4 pl-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${getPriorityColor(rec.priority)}/10`}>
                              {getRecommendationIcon(rec.recommendation_type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="capitalize">
                                  {rec.priority}
                                </Badge>
                                <span className="text-sm text-muted-foreground">{rec.sku}</span>
                              </div>
                              <h4 className="font-semibold">{rec.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                              
                              {rec.reasoning && (
                                <div className="mt-3 p-3 rounded-lg bg-muted/50">
                                  <p className="text-sm">
                                    <span className="font-medium">Begründung:</span> {rec.reasoning}
                                  </p>
                                </div>
                              )}

                              {rec.estimated_impact_value && (
                                <div className="flex items-center gap-2 mt-3">
                                  <DollarSign className="h-4 w-4 text-green-500" />
                                  <span className="text-sm font-medium">
                                    Geschätztes Potenzial: CHF {rec.estimated_impact_value.toLocaleString('de-CH')}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-2 mt-3">
                                <Progress value={rec.confidence_score * 100} className="h-2 w-24" />
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(rec.confidence_score * 100)}% Konfidenz
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => completeRecommendation(rec.id)}
                              className="gap-1"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Erledigt
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => dismissRecommendation(rec.id)}
                              className="gap-1"
                            >
                              <XCircle className="h-4 w-4" />
                              Verwerfen
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

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {classFilter ? `${classFilter}-Artikel` : 'Alle Artikel'}
                    </CardTitle>
                    <CardDescription>
                      {classFilter 
                        ? `${filteredClassifications.length} Artikel der Klasse ${classFilter}`
                        : 'Detaillierte Übersicht aller klassifizierten Artikel'
                      }
                    </CardDescription>
                  </div>
                  {classFilter && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setClassFilter(null)}
                      className="gap-1"
                    >
                      <XCircle className="h-4 w-4" />
                      Filter entfernen
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {filteredClassifications.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getClassBadge(item.abc_class)}
                          <div>
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">{item.sku}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm font-medium">CHF {item.total_revenue.toLocaleString('de-CH')}</p>
                            <p className="text-xs text-muted-foreground">{item.revenue_share_percent.toFixed(1)}% Anteil</p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm font-medium">{item.current_stock} Stk</p>
                            <p className="text-xs text-muted-foreground">
                              {item.days_of_stock ? `${item.days_of_stock} Tage` : '-'}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm font-medium">{item.order_count} Best.</p>
                            <p className="text-xs text-muted-foreground">{item.units_sold} Stk</p>
                          </div>

                          <div className="flex items-center gap-1">
                            {getTrendIcon(item.trending_direction)}
                          </div>

                          {item.stockout_risk_score > 0.5 && (
                            <Badge variant="destructive" className="text-xs">
                              Stockout-Risiko
                            </Badge>
                          )}
                          {item.overstock_risk_score > 0.5 && (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                              Überbestand
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ABCAnalysis;
