import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  Package, 
  Truck, 
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  ArrowRight,
  Ban,
  PackageX,
  ClipboardList
} from '@/components/icons';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ClarificationCase {
  id: string;
  case_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  title: string;
  description: string;
  ai_explanation: string | null;
  ai_confidence_score: number | null;
  recommended_action: string | null;
  related_sku: string | null;
  expected_value: number | null;
  actual_value: number | null;
  discrepancy_value: number | null;
  detected_at: string;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
}

const ClarificationCases = () => {
  useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [cases, setCases] = useState<ClarificationCase[]>([]);
  const [activeTab, setActiveTab] = useState('all');

  const fetchCases = async () => {
    if (!effectiveCompanyId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clarification_cases')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .order('detected_at', { ascending: false });

      if (error) throw error;
      setCases((data || []) as unknown as ClarificationCase[]);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [effectiveCompanyId]);

  const runScan = async () => {
    if (!effectiveCompanyId) return;
    
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-clarification-cases', {
        body: { companyId: effectiveCompanyId }
      });

      if (error) throw error;

      toast.success('Scan abgeschlossen', {
        description: `${data.casesDetected || 0} neue Klärfälle erkannt`
      });

      await fetchCases();
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Fehler beim Scannen');
    } finally {
      setIsScanning(false);
    }
  };

  const resolveCase = async (id: string) => {
    try {
      await supabase
        .from('clarification_cases')
        .update({ 
          status: 'resolved', 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', id);

      setCases(prev => prev.map(c => 
        c.id === id ? { ...c, status: 'resolved', resolved_at: new Date().toISOString() } : c
      ));
      toast.success('Klärfall als gelöst markiert');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const dismissCase = async (id: string) => {
    try {
      await supabase
        .from('clarification_cases')
        .update({ status: 'dismissed' })
        .eq('id', id);

      setCases(prev => prev.map(c => 
        c.id === id ? { ...c, status: 'dismissed' } : c
      ));
      toast.success('Klärfall verworfen');
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const getCaseIcon = (type: string) => {
    switch (type) {
      case 'stock_discrepancy': return <Package className="h-5 w-5" />;
      case 'order_stuck': return <Clock className="h-5 w-5" />;
      case 'inbound_incomplete': return <Truck className="h-5 w-5" />;
      case 'return_unclear': return <RotateCcw className="h-5 w-5" />;
      case 'item_blocked': return <Ban className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getCaseTypeName = (type: string) => {
    switch (type) {
      case 'stock_discrepancy': return 'Bestandsabweichung';
      case 'order_stuck': return 'Bestellung hängt';
      case 'inbound_incomplete': return 'Wareneingang unvollständig';
      case 'return_unclear': return 'Retoure unklar';
      case 'item_blocked': return 'Artikel blockiert';
      default: return type;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge className="bg-red-500">Kritisch</Badge>;
      case 'high': return <Badge className="bg-orange-500">Hoch</Badge>;
      case 'medium': return <Badge className="bg-yellow-500">Mittel</Badge>;
      default: return <Badge className="bg-blue-500">Niedrig</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge variant="outline" className="border-orange-500 text-orange-500">Offen</Badge>;
      case 'in_progress': return <Badge variant="outline" className="border-blue-500 text-blue-500">In Bearbeitung</Badge>;
      case 'resolved': return <Badge variant="outline" className="border-green-500 text-green-500">Gelöst</Badge>;
      case 'dismissed': return <Badge variant="outline" className="border-gray-500 text-gray-500">Verworfen</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openCases = cases.filter(c => c.status === 'open' || c.status === 'in_progress');
  const resolvedCases = cases.filter(c => c.status === 'resolved' || c.status === 'dismissed');

  const filteredCases = activeTab === 'all' 
    ? cases.filter(c => c.status === 'open' || c.status === 'in_progress')
    : activeTab === 'resolved' 
      ? resolvedCases 
      : openCases.filter(c => c.case_type === activeTab);

  if (isLoading) {
    return (
      <MainLayout title="Klärfälle" subtitle="Problemfälle & Exceptions">
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
    <MainLayout title="Klärfälle" subtitle="Problemfälle & Exceptions">
      <div className="space-y-6">
        {/* Header */}
        <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-lg">Klärfälle-Center</CardTitle>
              </div>
              <Button 
                onClick={runScan} 
                disabled={isScanning}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Scannt...' : 'Neue Probleme erkennen'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Automatische Erkennung von Bestandsabweichungen, blockierten Artikeln, 
              hängenden Bestellungen und unklaren Retouren. AI-gestützte Ursachen-Hypothesen 
              und empfohlene Aktionen.
            </p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:bg-accent/10" onClick={() => setActiveTab('all')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openCases.length}</p>
                  <p className="text-xs text-muted-foreground">Offen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/10" onClick={() => setActiveTab('stock_discrepancy')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <PackageX className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openCases.filter(c => c.case_type === 'stock_discrepancy').length}</p>
                  <p className="text-xs text-muted-foreground">Bestand</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/10" onClick={() => setActiveTab('order_stuck')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openCases.filter(c => c.case_type === 'order_stuck').length}</p>
                  <p className="text-xs text-muted-foreground">Bestellungen</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/10" onClick={() => setActiveTab('inbound_incomplete')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Truck className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{openCases.filter(c => c.case_type === 'inbound_incomplete').length}</p>
                  <p className="text-xs text-muted-foreground">Wareneingang</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/10" onClick={() => setActiveTab('resolved')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{resolvedCases.length}</p>
                  <p className="text-xs text-muted-foreground">Gelöst</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cases List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {activeTab === 'all' ? 'Alle offenen Klärfälle' : 
               activeTab === 'resolved' ? 'Gelöste Klärfälle' :
               getCaseTypeName(activeTab)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCases.length === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold">Keine Klärfälle</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'resolved' 
                    ? 'Noch keine Fälle wurden gelöst.'
                    : 'Alle Probleme wurden behoben. Führen Sie einen neuen Scan durch.'}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-4">
                  {filteredCases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${
                            caseItem.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
                            caseItem.severity === 'high' ? 'bg-orange-500/10 text-orange-500' :
                            caseItem.severity === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {getCaseIcon(caseItem.case_type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{caseItem.title}</h4>
                              {getSeverityBadge(caseItem.severity)}
                              {getStatusBadge(caseItem.status)}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {caseItem.description}
                            </p>
                            
                            {/* AI Explanation */}
                            {caseItem.ai_explanation && (
                              <div className="mt-3 p-3 rounded-lg bg-accent/10 border border-accent/20">
                                <div className="flex items-center gap-2 mb-1">
                                  <Sparkles className="h-4 w-4 text-accent" />
                                  <span className="text-xs font-medium text-accent">
                                    AI-Analyse ({Math.round((caseItem.ai_confidence_score || 0) * 100)}% Konfidenz)
                                  </span>
                                </div>
                                <p className="text-sm">{caseItem.ai_explanation}</p>
                              </div>
                            )}
                            
                            {/* Recommended Action */}
                            {caseItem.recommended_action && caseItem.status === 'open' && (
                              <div className="mt-2 flex items-center gap-2 text-sm text-accent">
                                <ArrowRight className="h-4 w-4" />
                                <span className="font-medium">Empfohlen: {caseItem.recommended_action}</span>
                              </div>
                            )}
                            
                            {/* Metadata */}
                            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                              {caseItem.related_sku && <span>SKU: {caseItem.related_sku}</span>}
                              {caseItem.discrepancy_value !== null && (
                                <span>Differenz: {caseItem.discrepancy_value}</span>
                              )}
                              <span>Erkannt: {new Date(caseItem.detected_at).toLocaleString('de-CH')}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        {caseItem.status === 'open' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resolveCase(caseItem.id)}
                              className="gap-1"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Gelöst
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissCase(caseItem.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ClarificationCases;