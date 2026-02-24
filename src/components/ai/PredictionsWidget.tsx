import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  Minus,
  Package,
  RotateCcw,
  AlertTriangle,
  Clock,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Brain
} from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface Prediction {
  type: 'order_volume' | 'return_rate' | 'stockout_risk' | 'sla_risk';
  title: string;
  prediction: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  details: string;
  recommendations: string[];
  data?: Record<string, unknown>;
}

const predictionIcons = {
  order_volume: Package,
  return_rate: RotateCcw,
  stockout_risk: AlertTriangle,
  sla_risk: Clock,
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const trendColors = {
  up: 'text-green-500',
  down: 'text-red-500',
  stable: 'text-muted-foreground',
};

export const PredictionsWidget: React.FC = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { profile, activeCompanyId } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const effectiveCompanyId = activeCompanyId === 'ALL' ? profile?.company_id : activeCompanyId;

  const fetchPredictions = async (showRefresh = false) => {
    if (!effectiveCompanyId) return;
    
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-predictions', {
        body: { 
          companyId: effectiveCompanyId,
          predictionTypes: ['all']
        }
      });

      if (error) throw error;

      setPredictions(data.predictions || []);
      setAiSummary(data.aiSummary || null);
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
    // Refresh every 10 minutes
    const interval = setInterval(() => fetchPredictions(true), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [effectiveCompanyId]);

  const handlePredictionClick = (prediction: Prediction) => {
    switch (prediction.type) {
      case 'order_volume':
        navigate('/orders');
        break;
      case 'return_rate':
        navigate('/returns');
        break;
      case 'stockout_risk':
        navigate('/inventory?filter=low-stock');
        break;
      case 'sla_risk':
        navigate('/orders?sla=at-risk');
        break;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5" />
            {t('predictions.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            {t('predictions.title')}
            <Badge variant="secondary" className="ml-2 text-xs">AI</Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => fetchPredictions(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        {aiSummary && (
          <div className="mb-4 p-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/20">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">{aiSummary}</p>
            </div>
          </div>
        )}

        {predictions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('predictions.noData')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {predictions.map((prediction) => {
              const Icon = predictionIcons[prediction.type];
              const TrendIcon = trendIcons[prediction.trend];
              
              return (
                <button
                  key={prediction.type}
                  onClick={() => handlePredictionClick(prediction)}
                  className="w-full text-left p-4 rounded-lg border bg-card hover:bg-muted/50 transition-all hover:shadow-md group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm">{prediction.title}</span>
                        <div className="flex items-center gap-1">
                          <TrendIcon className={cn("h-4 w-4", trendColors[prediction.trend])} />
                          <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{prediction.details}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t('predictions.confidence')}:</span>
                        <Progress value={prediction.confidence * 100} className="flex-1 h-1.5" />
                        <span className="text-xs font-medium">{Math.round(prediction.confidence * 100)}%</span>
                      </div>
                      {prediction.recommendations.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-primary">
                            💡 {prediction.recommendations[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
