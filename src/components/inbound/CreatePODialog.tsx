import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Upload, Plus, Trash2 } from '@/components/icons';
import { toast } from 'sonner';

const poSchema = z.object({
  po_number: z.string().min(1, 'PO number is required'),
  supplier_name: z.string().min(1, 'Supplier name is required'),
  supplier_code: z.string().optional(),
  eta: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type POFormData = z.infer<typeof poSchema>;

interface POLine {
  sku: string;
  product_name: string;
  qty_expected: number;
  uom: string;
}

interface CreatePODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePODialog({ open, onOpenChange }: CreatePODialogProps) {
  const { t } = useLanguage();
  const { activeCompanyId } = useAuth();
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');
  const [lines, setLines] = useState<POLine[]>([{ sku: '', product_name: '', qty_expected: 1, uom: 'EA' }]);
  const createPO = useCreatePurchaseOrder();

  const form = useForm<POFormData>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      po_number: '',
      supplier_name: '',
      supplier_code: '',
      eta: '',
      location: 'main_warehouse',
      notes: '',
    },
  });

  const addLine = () => {
    setLines([...lines, { sku: '', product_name: '', qty_expected: 1, uom: 'EA' }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof POLine, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').slice(1); // Skip header
      const parsedLines: POLine[] = rows
        .filter(row => row.trim())
        .map(row => {
          const [sku, product_name, qty_expected, uom] = row.split(',').map(s => s.trim());
          return {
            sku: sku || '',
            product_name: product_name || '',
            qty_expected: parseInt(qty_expected) || 1,
            uom: uom || 'EA',
          };
        });
      setLines(parsedLines);
      toast.success(`${parsedLines.length} lines imported`);
    };
    reader.readAsText(file);
  };

  const onSubmit = async (data: POFormData) => {
    if (!activeCompanyId) {
      toast.error(t('common.noCompanySelected'));
      return;
    }

    const validLines = lines.filter(line => line.sku.trim());
    if (validLines.length === 0) {
      toast.error(t('inbound.create.noLines'));
      return;
    }

    try {
      await createPO.mutateAsync({
        ...data,
        company_id: activeCompanyId,
        lines: validLines,
      });
      toast.success(t('inbound.create.success'));
      onOpenChange(false);
      form.reset();
      setLines([{ sku: '', product_name: '', qty_expected: 1, uom: 'EA' }]);
    } catch (error) {
      toast.error(t('inbound.create.error'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('inbound.create.title')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="po_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inbound.create.poNumber')} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="PO-2024-001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplier_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inbound.create.supplier')} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('inbound.create.supplierPlaceholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplier_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inbound.create.supplierCode')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="SUP001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="eta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('inbound.create.eta')}</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.notes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t('inbound.create.notesPlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Lines Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{t('inbound.create.lines')}</h3>
                <Tabs value={mode} onValueChange={(v) => setMode(v as 'manual' | 'csv')}>
                  <TabsList className="h-8">
                    <TabsTrigger value="manual" className="text-xs">{t('inbound.create.manual')}</TabsTrigger>
                    <TabsTrigger value="csv" className="text-xs">{t('inbound.create.csv')}</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {mode === 'csv' && (
                <div className="rounded-lg border-2 border-dashed p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('inbound.create.csvInstructions')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    SKU, Name, Qty, UOM
                  </p>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="mx-auto mt-4 max-w-xs"
                  />
                </div>
              )}

              <div className="space-y-2">
                {lines.map((line, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={line.sku}
                      onChange={(e) => updateLine(index, 'sku', e.target.value)}
                      placeholder={t('inbound.line.sku')}
                      className="flex-1"
                    />
                    <Input
                      value={line.product_name}
                      onChange={(e) => updateLine(index, 'product_name', e.target.value)}
                      placeholder={t('inbound.line.name')}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={line.qty_expected}
                      onChange={(e) => updateLine(index, 'qty_expected', parseInt(e.target.value) || 0)}
                      placeholder={t('inbound.line.qty')}
                      className="w-20"
                      min={1}
                    />
                    <Input
                      value={line.uom}
                      onChange={(e) => updateLine(index, 'uom', e.target.value)}
                      placeholder="UOM"
                      className="w-16"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(index)}
                      disabled={lines.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t('inbound.create.addLine')}
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createPO.isPending}>
                {createPO.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('inbound.create.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
