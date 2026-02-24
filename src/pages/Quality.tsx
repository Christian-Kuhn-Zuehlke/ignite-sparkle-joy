import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  DollarSign,
  Target,
  Sparkles
} from 'lucide-react';
import { 
  useQualityMetrics, 
  useQualityErrors,
  useResolveQualityError 
} from '@/hooks/useQualityIntelligence';
import { QualityScoreCard } from '@/components/quality/QualityScoreCard';
import { ErrorTypeBreakdown } from '@/components/quality/ErrorTypeBreakdown';
import { TopErrorSKUs } from '@/components/quality/TopErrorSKUs';
import { QualityTrendChart } from '@/components/quality/QualityTrendChart';
import { ZoneShiftAnalysis } from '@/components/quality/ZoneShiftAnalysis';
import { QualityErrorsList } from '@/components/quality/QualityErrorsList';
import { toast } from 'sonner';

export default function Quality() {
  const [days, setDays] = useState(30);
  const { data: metrics, isLoading, refetch } = useQualityMetrics(days);
  const { data: errors } = useQualityErrors(days);
  const resolveError = useResolveQualityError();
  
  const handleResolve = async (id: string) => {
    try {
      await resolveError.mutateAsync({ id });
      toast.success('Fehler als behoben markiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };
  
  if (isLoading) {
    return (
      <MainLayout 
        title="Quality Intelligence" 
        subtitle="Fehler-Transparenz und Root-Cause-Analyse"
      >
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout 
      title="Quality Intelligence" 
      subtitle="Fehler-Transparenz, Root-Cause-Analyse und Qualitäts-Scores"
    >
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            AI-gestützte Insights
          </Badge>
          <div className="flex rounded-lg border overflow-hidden">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={days === d ? "default" : "ghost"}
                size="sm"
                onClick={() => setDays(d)}
                className="rounded-none"
              >
                {d}T
              </Button>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aktualisieren
        </Button>
      </div>
      
      {/* KPI Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Qualitäts-Score</p>
                <p className="text-3xl font-bold text-primary">
                  {metrics?.qualityScore.toFixed(1) || 0}%
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fehler gesamt</p>
                <p className="text-3xl font-bold">
                  {metrics?.totalErrors || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.unresolvedErrors || 0} offen
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Behebungsrate</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {metrics?.totalErrors 
                    ? ((metrics.resolvedErrors / metrics.totalErrors) * 100).toFixed(1) 
                    : 100}%
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kosten-Impact</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  €{(metrics?.costImpact || 0).toFixed(0)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Übersicht</TabsTrigger>
          <TabsTrigger value="analysis">Analyse</TabsTrigger>
          <TabsTrigger value="errors">Fehlerprotokoll</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <QualityTrendChart data={metrics?.trends || []} />
            <ErrorTypeBreakdown 
              data={metrics?.byErrorType || {
                wrong_item: 0,
                missing_item: 0,
                damaged: 0,
                wrong_quantity: 0,
                packaging_error: 0,
                labeling_error: 0,
                shipping_error: 0,
                other: 0
              }} 
              totalErrors={metrics?.totalErrors || 0} 
            />
          </div>
          
          <div className="grid gap-4 lg:grid-cols-2">
            <TopErrorSKUs 
              skus={metrics?.topErrorSkus || []} 
              totalErrors={metrics?.totalErrors || 0} 
            />
            <ZoneShiftAnalysis 
              byZone={metrics?.byZone || {}}
              byShift={metrics?.byShift || {}}
              bySeverity={metrics?.bySeverity || {}}
              totalErrors={metrics?.totalErrors || 0}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <QualityScoreCard
              title="Genauigkeit"
              score={metrics?.qualityScore || 0}
              target={98}
              variant="accuracy"
              description="Order Accuracy Rate"
            />
            <QualityScoreCard
              title="Schadensquote"
              score={100 - (metrics?.byErrorType?.damaged || 0) / Math.max(metrics?.totalErrors || 1, 1) * 100}
              target={99}
              variant="damage"
              description="Inverse Damage Rate"
            />
            <QualityScoreCard
              title="Pünktlichkeit"
              score={95}
              target={95}
              variant="timeliness"
              description="On-time Accuracy"
            />
            <QualityScoreCard
              title="Verpackung"
              score={100 - (metrics?.byErrorType?.packaging_error || 0) / Math.max(metrics?.totalErrors || 1, 1) * 100}
              target={97}
              variant="packaging"
              description="Packaging Quality Score"
            />
          </div>
          
          {/* AI Insights */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Root-Cause Analyse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {metrics?.totalErrors === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Keine Fehler im ausgewählten Zeitraum. Exzellente Qualität!
                </p>
              ) : (
                <>
                  {Object.entries(metrics?.byErrorType || {})
                    .filter(([, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([type, count]) => {
                      const percentage = ((count / (metrics?.totalErrors || 1)) * 100).toFixed(1);
                      return (
                        <div key={type} className="p-3 rounded-lg bg-background border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">
                              {type === 'wrong_item' && 'Falscher Artikel'}
                              {type === 'missing_item' && 'Fehlmenge'}
                              {type === 'damaged' && 'Beschädigt'}
                              {type === 'wrong_quantity' && 'Falsche Menge'}
                              {type === 'packaging_error' && 'Verpackungsfehler'}
                              {type === 'labeling_error' && 'Etikettenfehler'}
                              {type === 'shipping_error' && 'Versandfehler'}
                              {type === 'other' && 'Sonstige'}
                            </span>
                            <Badge variant="outline">{percentage}%</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {type === 'wrong_item' && 'Mögliche Ursachen: Scanner-Fehler, ähnliche Artikelnummern, Pick-Fehler in der Zone'}
                            {type === 'missing_item' && 'Mögliche Ursachen: Bestandsdifferenzen, unvollständige Picks, Systemfehler'}
                            {type === 'damaged' && 'Mögliche Ursachen: Handling im Lager, ungeeignete Verpackung, Carrier-Probleme'}
                            {type === 'wrong_quantity' && 'Mögliche Ursachen: Zählfehler, Multi-Pack Verwechslung, Scanner nicht genutzt'}
                            {type === 'packaging_error' && 'Mögliche Ursachen: Falsche Kartongröße, fehlendes Füllmaterial, Beschädigung'}
                            {type === 'labeling_error' && 'Mögliche Ursachen: Drucker-Probleme, falsche Etiketten, Verwechslung'}
                            {type === 'shipping_error' && 'Mögliche Ursachen: Falscher Carrier, fehlende Dokumente, Adressfehler'}
                            {type === 'other' && 'Individuelle Analyse erforderlich'}
                          </p>
                        </div>
                      );
                    })}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="errors">
          <QualityErrorsList 
            errors={errors || []} 
            onResolve={handleResolve}
          />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
