import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Search,
  Filter,
  ExternalLink
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { QualityError, getErrorTypeLabel } from '@/hooks/useQualityIntelligence';
import { Link } from 'react-router-dom';

interface QualityErrorsListProps {
  errors: QualityError[];
  onResolve?: (id: string) => void;
}

const SEVERITY_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  critical: { label: 'Kritisch', variant: 'destructive' },
  high: { label: 'Hoch', variant: 'destructive' },
  medium: { label: 'Mittel', variant: 'default' },
  low: { label: 'Niedrig', variant: 'secondary' }
};

export function QualityErrorsList({ errors, onResolve }: QualityErrorsListProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const filteredErrors = errors.filter(error => {
    const matchesSearch = 
      error.sku?.toLowerCase().includes(search.toLowerCase()) ||
      error.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      error.description?.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = filterType === 'all' || error.error_type === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'resolved' && error.resolved_at) ||
      (filterStatus === 'open' && !error.resolved_at);
    
    return matchesSearch && matchesType && matchesStatus;
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Fehlerprotokoll</span>
          <Badge variant="outline">{filteredErrors.length} Einträge</Badge>
        </CardTitle>
        
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="SKU, Produkt oder Beschreibung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Fehlertyp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              <SelectItem value="wrong_item">Falscher Artikel</SelectItem>
              <SelectItem value="missing_item">Fehlmenge</SelectItem>
              <SelectItem value="damaged">Beschädigt</SelectItem>
              <SelectItem value="wrong_quantity">Falsche Menge</SelectItem>
              <SelectItem value="packaging_error">Verpackung</SelectItem>
              <SelectItem value="labeling_error">Etiketten</SelectItem>
              <SelectItem value="shipping_error">Versand</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="open">Offen</SelectItem>
              <SelectItem value="resolved">Behoben</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px]">
          {filteredErrors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Keine Fehler gefunden</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredErrors.map((error) => (
                <div 
                  key={error.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={SEVERITY_CONFIG[error.severity]?.variant || 'default'}>
                          {SEVERITY_CONFIG[error.severity]?.label || error.severity}
                        </Badge>
                        <Badge variant="outline">
                          {getErrorTypeLabel(error.error_type)}
                        </Badge>
                        {error.resolved_at ? (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Behoben
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Offen
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mt-2">
                        {error.sku && (
                          <p className="text-sm font-mono">
                            SKU: {error.sku}
                            {error.product_name && (
                              <span className="text-muted-foreground ml-2">
                                ({error.product_name})
                              </span>
                            )}
                          </p>
                        )}
                        {error.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {error.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>
                          {format(parseISO(error.detected_at), 'dd. MMM yyyy, HH:mm', { locale: de })}
                        </span>
                        {error.zone && <span>Zone: {error.zone}</span>}
                        {error.shift && <span>Schicht: {error.shift}</span>}
                        {error.cost_impact && (
                          <span className="text-red-600 dark:text-red-400">
                            Kosten: €{error.cost_impact.toFixed(2)}
                          </span>
                        )}
                      </div>
                      
                      {error.root_cause && (
                        <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                          <strong>Root Cause:</strong> {error.root_cause}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      {error.order_id && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/orders/${error.order_id}`}>
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Order
                          </Link>
                        </Button>
                      )}
                      {!error.resolved_at && onResolve && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onResolve(error.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Beheben
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
