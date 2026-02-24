import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, CheckCircle } from '@/components/icons';
import { cn } from '@/lib/utils';

interface QualityScoreCardProps {
  title: string;
  score: number;
  previousScore?: number;
  target?: number;
  description?: string;
  variant?: 'default' | 'accuracy' | 'damage' | 'timeliness' | 'packaging';
}

export function QualityScoreCard({
  title,
  score,
  previousScore,
  target = 95,
  description,
  variant = 'default'
}: QualityScoreCardProps) {
  const trend = previousScore !== undefined ? score - previousScore : 0;
  const isOnTarget = score >= target;
  
  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600 dark:text-green-400';
    if (score >= 85) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 70) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  const getVariantIcon = () => {
    switch (variant) {
      case 'accuracy':
        return <Target className="h-4 w-4 text-muted-foreground" />;
      case 'damage':
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
      case 'timeliness':
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {getVariantIcon()}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-3xl font-bold", getScoreColor(score))}>
            {score.toFixed(1)}%
          </span>
          
          {trend !== 0 && (
            <Badge 
              variant={trend > 0 ? "default" : "destructive"}
              className="text-xs"
            >
              {trend > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </Badge>
          )}
          
          {trend === 0 && previousScore !== undefined && (
            <Badge variant="secondary" className="text-xs">
              <Minus className="h-3 w-3 mr-1" />
              Stabil
            </Badge>
          )}
        </div>
        
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Fortschritt</span>
            <span>Ziel: {target}%</span>
          </div>
          <div className="relative">
            <Progress value={Math.min(score, 100)} className="h-2" />
            <div 
              className="absolute top-0 h-2 w-0.5 bg-foreground/50"
              style={{ left: `${target}%` }}
            />
          </div>
        </div>
        
        {description && (
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        )}
        
        <div className="mt-2 flex items-center gap-1 text-xs">
          {isOnTarget ? (
            <>
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Ziel erreicht</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-3 w-3 text-orange-500" />
              <span className="text-orange-600 dark:text-orange-400">
                {(target - score).toFixed(1)}% unter Ziel
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
