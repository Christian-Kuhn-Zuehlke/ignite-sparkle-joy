import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Package } from '@/components/icons';

interface TopErrorSKUsProps {
  skus: Array<{ sku: string; count: number; name?: string }>;
  totalErrors: number;
}

export function TopErrorSKUs({ skus, totalErrors }: TopErrorSKUsProps) {
  if (skus.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Top Fehler-SKUs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <Package className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Keine SKU-Daten verfügbar</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate what percentage these top SKUs represent
  const topSkusTotal = skus.reduce((sum, s) => sum + s.count, 0);
  const topSkusPercentage = totalErrors > 0 ? (topSkusTotal / totalErrors) * 100 : 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Top Fehler-SKUs
          </span>
          <Badge variant="outline" className="text-xs">
            {topSkusPercentage.toFixed(0)}% aller Fehler
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px]">
          <div className="space-y-3">
            {skus.map((item, index) => {
              const percentage = totalErrors > 0 ? (item.count / totalErrors) * 100 : 0;
              const isHighImpact = percentage > 10;
              
              return (
                <div 
                  key={item.sku}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={`
                    flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                    ${index === 0 ? 'bg-red-500 text-white' : 
                      index === 1 ? 'bg-orange-500 text-white' : 
                      index === 2 ? 'bg-yellow-500 text-white' : 
                      'bg-muted-foreground/20 text-muted-foreground'}
                  `}>
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono">{item.sku}</code>
                      {isHighImpact && (
                        <Badge variant="destructive" className="text-xs">
                          High Impact
                        </Badge>
                      )}
                    </div>
                    {item.name && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.name}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="font-semibold">{item.count}</div>
                    <div className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        {skus.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <p className="text-xs text-orange-700 dark:text-orange-300">
              <strong>Root-Cause Insight:</strong> Diese {skus.length} SKUs verursachen {topSkusPercentage.toFixed(0)}% aller Fehler. 
              Fokussierte Analyse könnte signifikante Qualitätsverbesserungen bringen.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
