import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Clock, Users } from '@/components/icons';
import { cn } from '@/lib/utils';

interface ZoneShiftAnalysisProps {
  byZone: Record<string, number>;
  byShift: Record<string, number>;
  bySeverity: Record<string, number>;
  totalErrors: number;
}

const SHIFT_LABELS: Record<string, string> = {
  morning: 'Frühschicht',
  afternoon: 'Spätschicht',
  night: 'Nachtschicht',
  Unbekannt: 'Nicht zugeordnet'
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'Kritisch', color: 'text-red-600', bg: 'bg-red-500' },
  high: { label: 'Hoch', color: 'text-orange-600', bg: 'bg-orange-500' },
  medium: { label: 'Mittel', color: 'text-yellow-600', bg: 'bg-yellow-500' },
  low: { label: 'Niedrig', color: 'text-green-600', bg: 'bg-green-500' }
};

export function ZoneShiftAnalysis({ 
  byZone, 
  byShift, 
  bySeverity,
  totalErrors 
}: ZoneShiftAnalysisProps) {
  const sortedZones = Object.entries(byZone)
    .sort(([, a], [, b]) => b - a);
  
  const sortedShifts = Object.entries(byShift)
    .sort(([, a], [, b]) => b - a);
  
  const maxZoneErrors = Math.max(...Object.values(byZone), 1);
  const maxShiftErrors = Math.max(...Object.values(byShift), 1);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Fehleranalyse nach Dimension</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="zone" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="zone" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              Zone
            </TabsTrigger>
            <TabsTrigger value="shift" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Schicht
            </TabsTrigger>
            <TabsTrigger value="severity" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Schwere
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="zone" className="mt-4 space-y-3">
            {sortedZones.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Zonendaten verfügbar
              </p>
            ) : (
              sortedZones.map(([zone, count]) => {
                const percentage = (count / maxZoneErrors) * 100;
                const isHighest = count === maxZoneErrors && count > 0;
                
                return (
                  <div key={zone} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{zone}</span>
                        {isHighest && (
                          <Badge variant="destructive" className="text-xs">
                            Hotspot
                          </Badge>
                        )}
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          isHighest ? "bg-red-500" : "bg-blue-500"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
            
            {sortedZones.length > 0 && sortedZones[0][1] > 5 && (
              <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Insight:</strong> Zone "{sortedZones[0][0]}" hat die meisten Fehler. 
                  Prozessoptimierung oder zusätzliches Training könnte helfen.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="shift" className="mt-4 space-y-3">
            {sortedShifts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Keine Schichtdaten verfügbar
              </p>
            ) : (
              sortedShifts.map(([shift, count]) => {
                const percentage = (count / maxShiftErrors) * 100;
                const label = SHIFT_LABELS[shift] || shift;
                const isHighest = count === maxShiftErrors && count > 0;
                
                return (
                  <div key={shift} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{label}</span>
                        {isHighest && (
                          <Badge variant="destructive" className="text-xs">
                            Meiste Fehler
                          </Badge>
                        )}
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          isHighest ? "bg-orange-500" : "bg-purple-500"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>
          
          <TabsContent value="severity" className="mt-4 space-y-3">
            {Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
              const count = bySeverity[key] || 0;
              const percentage = totalErrors > 0 ? (count / totalErrors) * 100 : 0;
              
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${config.bg}`} />
                      <span className={config.color}>{config.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{count}</span>
                      <span className="text-xs text-muted-foreground">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div 
                      className={`h-full transition-all ${config.bg}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            {(bySeverity.critical || 0) + (bySeverity.high || 0) > totalErrors * 0.3 && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-700 dark:text-red-300">
                  <strong>Warnung:</strong> Über 30% der Fehler sind kritisch oder hoch. 
                  Sofortige Maßnahmen empfohlen.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
