import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Hash, 
  AlertCircle, 
  Box, 
  Tag, 
  Truck,
  HelpCircle,
  MinusCircle
} from 'lucide-react';
import { QualityErrorType, getErrorTypeLabel } from '@/hooks/useQualityIntelligence';

interface ErrorTypeBreakdownProps {
  data: Record<QualityErrorType, number>;
  totalErrors: number;
}

const ERROR_ICONS: Record<QualityErrorType, React.ReactNode> = {
  wrong_item: <Package className="h-4 w-4" />,
  missing_item: <MinusCircle className="h-4 w-4" />,
  damaged: <AlertCircle className="h-4 w-4" />,
  wrong_quantity: <Hash className="h-4 w-4" />,
  packaging_error: <Box className="h-4 w-4" />,
  labeling_error: <Tag className="h-4 w-4" />,
  shipping_error: <Truck className="h-4 w-4" />,
  other: <HelpCircle className="h-4 w-4" />
};

const ERROR_COLORS: Record<QualityErrorType, string> = {
  wrong_item: 'bg-red-500',
  missing_item: 'bg-orange-500',
  damaged: 'bg-yellow-500',
  wrong_quantity: 'bg-blue-500',
  packaging_error: 'bg-purple-500',
  labeling_error: 'bg-pink-500',
  shipping_error: 'bg-cyan-500',
  other: 'bg-gray-500'
};

export function ErrorTypeBreakdown({ data, totalErrors }: ErrorTypeBreakdownProps) {
  const sortedErrors = Object.entries(data)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a) as [QualityErrorType, number][];
  
  if (sortedErrors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Fehlerarten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Keine Fehler im Zeitraum</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Fehlerarten</span>
          <Badge variant="secondary">{totalErrors} Fehler</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedErrors.map(([type, count]) => {
          const percentage = totalErrors > 0 ? (count / totalErrors) * 100 : 0;
          
          return (
            <div key={type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {ERROR_ICONS[type]}
                  </span>
                  <span>{getErrorTypeLabel(type)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{count}</span>
                  <span className="text-muted-foreground text-xs">
                    ({percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div 
                  className={`h-full transition-all ${ERROR_COLORS[type]}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
