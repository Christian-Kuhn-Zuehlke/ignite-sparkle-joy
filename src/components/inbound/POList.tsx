import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { Search, Filter, Download, Eye, Loader2, AlertTriangle } from '@/components/icons';
import { format } from 'date-fns';
import { PODetailDialog } from './PODetailDialog';

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

export function POList() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);

  const { data: purchaseOrders, isLoading } = usePurchaseOrders({
    search,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export POs');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{t('inbound.poList.title')}</CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('inbound.poList.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 sm:w-64"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t('common.filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="draft">{t('inbound.status.draft')}</SelectItem>
                <SelectItem value="submitted">{t('inbound.status.submitted')}</SelectItem>
                <SelectItem value="confirmed">{t('inbound.status.confirmed')}</SelectItem>
                <SelectItem value="in_transit">{t('inbound.status.inTransit')}</SelectItem>
                <SelectItem value="arrived">{t('inbound.status.arrived')}</SelectItem>
                <SelectItem value="receiving">{t('inbound.status.receiving')}</SelectItem>
                <SelectItem value="received">{t('inbound.status.received')}</SelectItem>
                <SelectItem value="completed">{t('inbound.status.completed')}</SelectItem>
                <SelectItem value="cancelled">{t('inbound.status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleExport}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !purchaseOrders?.length ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">{t('inbound.poList.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inbound.poList.poNumber')}</TableHead>
                  <TableHead>{t('inbound.poList.supplier')}</TableHead>
                  <TableHead>{t('inbound.poList.eta')}</TableHead>
                  <TableHead>{t('inbound.poList.status')}</TableHead>
                  <TableHead>{t('inbound.poList.lines')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow 
                    key={po.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedPOId(po.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {po.po_number}
                        {po.has_discrepancies && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{po.supplier_name}</TableCell>
                    <TableCell>
                      {po.expected_date ? format(new Date(po.expected_date), 'dd.MM.yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[po.status] || 'bg-muted'}>
                        {t(`inbound.status.${po.status.replace('_', '')}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{po.line_count ?? 0}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPOId(po.id);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <PODetailDialog
        poId={selectedPOId}
        open={!!selectedPOId}
        onOpenChange={(open) => !open && setSelectedPOId(null)}
      />
    </Card>
  );
}
