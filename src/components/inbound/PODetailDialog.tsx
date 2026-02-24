import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePurchaseOrderDetail, useStartReceiving } from '@/hooks/usePurchaseOrders';
import { format } from 'date-fns';
import { 
  Loader2, 
  Package, 
  Truck, 
  AlertTriangle, 
  FileText,
  Play,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ReceivingDialog } from './ReceivingDialog';

interface PODetailDialogProps {
  poId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  in_transit: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  arrived: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  receiving: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  received: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-destructive/10 text-destructive',
};

export function PODetailDialog({ poId, open, onOpenChange }: PODetailDialogProps) {
  const { t } = useLanguage();
  const { hasRole } = useAuth();
  const [receivingOpen, setReceivingOpen] = useState(false);
  const { data: po, isLoading } = usePurchaseOrderDetail(poId);
  const startReceiving = useStartReceiving();

  const canStartReceiving = hasRole('msd_ops') || hasRole('system_admin');
  const canReceive = po?.status === 'arrived' || po?.status === 'receiving';

  const handleStartReceiving = async () => {
    if (!poId) return;
    await startReceiving.mutateAsync(poId);
    setReceivingOpen(true);
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Package className="h-5 w-5" />
              {isLoading ? t('common.loading') : po?.po_number}
              {po && (
                <Badge className={STATUS_COLORS[po.status] || 'bg-muted'}>
                  {t(`inbound.status.${po.status.replace('_', '')}`)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : po ? (
            <Tabs defaultValue="details" className="mt-4">
              <TabsList>
                <TabsTrigger value="details">{t('inbound.detail.tabs.details')}</TabsTrigger>
                <TabsTrigger value="lines">{t('inbound.detail.tabs.lines')}</TabsTrigger>
                <TabsTrigger value="discrepancies">{t('inbound.detail.tabs.discrepancies')}</TabsTrigger>
                <TabsTrigger value="audit">{t('inbound.detail.tabs.audit')}</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t('inbound.detail.supplier')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{po.supplier_name}</p>
                      {po.supplier_code && (
                        <p className="text-sm text-muted-foreground">{po.supplier_code}</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t('inbound.detail.eta')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">
                          {po.eta ? format(new Date(po.eta), 'dd.MM.yyyy') : '-'}
                        </p>
                      </div>
                      {po.arrival_date && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t('inbound.detail.arrivedOn')}: {format(new Date(po.arrival_date), 'dd.MM.yyyy')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t('inbound.detail.location')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium">{po.location || 'Main Warehouse'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t('inbound.detail.source')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium capitalize">{po.source}</p>
                    </CardContent>
                  </Card>
                </div>

                {po.notes && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {t('common.notes')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{po.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {canStartReceiving && canReceive && (
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleStartReceiving}
                      disabled={startReceiving.isPending}
                      className="gap-2"
                    >
                      {startReceiving.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      {t('inbound.startReceiving')}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="lines" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('inbound.line.sku')}</TableHead>
                      <TableHead>{t('inbound.line.name')}</TableHead>
                      <TableHead className="text-right">{t('inbound.line.expected')}</TableHead>
                      <TableHead className="text-right">{t('inbound.line.received')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {po.lines?.length ? (
                      po.lines.map((line) => {
                        const isComplete = line.qty_received >= line.qty_expected;
                        const hasDiscrepancy = line.qty_received !== line.qty_expected && line.qty_received > 0;
                        return (
                          <TableRow key={line.id}>
                            <TableCell className="font-mono text-sm">{line.sku}</TableCell>
                            <TableCell>{line.product_name || '-'}</TableCell>
                            <TableCell className="text-right">{line.qty_expected}</TableCell>
                            <TableCell className="text-right">{line.qty_received}</TableCell>
                            <TableCell>
                              {isComplete ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : hasDiscrepancy ? (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          {t('inbound.detail.noLines')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="discrepancies" className="mt-4">
                {po.discrepancies?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('inbound.discrepancy.type')}</TableHead>
                        <TableHead>{t('inbound.discrepancy.sku')}</TableHead>
                        <TableHead>{t('inbound.discrepancy.severity')}</TableHead>
                        <TableHead>{t('inbound.discrepancy.resolution')}</TableHead>
                        <TableHead>{t('common.notes')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {po.discrepancies.map((disc) => (
                        <TableRow key={disc.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {t(`inbound.discrepancyType.${disc.type}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{disc.sku || '-'}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={disc.severity === 'critical' ? 'destructive' : 'secondary'}
                            >
                              {t(`inbound.severity.${disc.severity}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {t(`inbound.resolution.${disc.resolution}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{disc.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('inbound.detail.noDiscrepancies')}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="audit" className="mt-4">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('inbound.detail.auditComingSoon')}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      {po && (
        <ReceivingDialog
          po={po}
          open={receivingOpen}
          onOpenChange={setReceivingOpen}
        />
      )}
    </>
  );
}
