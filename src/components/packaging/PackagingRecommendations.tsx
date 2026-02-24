import { Lightbulb, ArrowDown, ArrowUp, Leaf, Truck, Layers, Check, TrendingUp, type LucideIcon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePackagingRecommendations, useImplementRecommendation, PackagingRecommendation } from '@/hooks/usePackagingIntelligence';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const typeIcons: Record<string, LucideIcon> = {
  downsize: ArrowDown,
  upsize: ArrowUp,
  eco_switch: Leaf,
  carrier_change: Truck,
  consolidation: Layers,
};

const typeColors: Record<string, string> = {
  downsize: 'bg-blue-500/10 text-blue-500',
  upsize: 'bg-purple-500/10 text-purple-500',
  eco_switch: 'bg-emerald-500/10 text-emerald-500',
  carrier_change: 'bg-amber-500/10 text-amber-500',
  consolidation: 'bg-cyan-500/10 text-cyan-500',
};

export function PackagingRecommendations() {
  const { data: recommendations, isLoading } = usePackagingRecommendations();
  const implementRecommendation = useImplementRecommendation();
  const { t } = useLanguage();

  const handleImplement = async (recommendation: PackagingRecommendation) => {
    try {
      await implementRecommendation.mutateAsync(recommendation.id);
      toast.success(t('packaging.recommendationImplemented'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            {t('packaging.recommendations')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingRecommendations = recommendations?.filter(r => !r.is_implemented) || [];
  const totalSavings = pendingRecommendations.reduce((sum, r) => sum + (r.estimated_savings_cents || 0), 0) / 100;
  const totalCO2Savings = pendingRecommendations.reduce((sum, r) => sum + (r.estimated_co2_savings_g || 0), 0) / 1000;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            {t('packaging.recommendations')}
            {pendingRecommendations.length > 0 && (
              <Badge variant="secondary">{pendingRecommendations.length}</Badge>
            )}
          </div>
          {pendingRecommendations.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                {t('packaging.totalPotential')}: <span className="font-bold text-foreground">CHF {totalSavings.toFixed(0)}</span>
              </span>
              <span className="text-muted-foreground">
                CO₂: <span className="font-bold text-emerald-500">-{totalCO2Savings.toFixed(1)} kg</span>
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingRecommendations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>{t('packaging.noRecommendations')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRecommendations.slice(0, 8).map((rec) => {
              const Icon = typeIcons[rec.recommendation_type] || Lightbulb;
              const confidence = (rec.confidence_score || 0) * 100;
              return (
                <div
                  key={rec.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${typeColors[rec.recommendation_type]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={typeColors[rec.recommendation_type]}>
                          {t(`packaging.recType.${rec.recommendation_type}`)}
                        </Badge>
                        {rec.sku && (
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                            {rec.sku}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium">
                        {rec.reason || t(`packaging.recType.${rec.recommendation_type}`)}
                      </p>
                      {rec.current_packaging_code && rec.recommended_packaging_code && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {rec.current_packaging_code} → {rec.recommended_packaging_code}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        {rec.estimated_savings_cents && rec.estimated_savings_cents > 0 && (
                          <span className="text-sm font-medium text-amber-500">
                            +CHF {(rec.estimated_savings_cents / 100).toFixed(2)}
                          </span>
                        )}
                        {rec.estimated_co2_savings_g && rec.estimated_co2_savings_g > 0 && (
                          <span className="text-sm font-medium text-emerald-500">
                            -{rec.estimated_co2_savings_g.toFixed(0)}g CO₂
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t('packaging.confidence')}:</span>
                          <Progress value={confidence} className="w-16 h-2" />
                          <span className="text-xs">{confidence.toFixed(0)}%</span>
                        </div>
                        {rec.sample_size && (
                          <span className="text-xs text-muted-foreground">
                            n={rec.sample_size}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImplement(rec)}
                      disabled={implementRecommendation.isPending}
                      className="shrink-0"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {t('packaging.implement')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
