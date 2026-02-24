import { useState, useEffect } from 'react';
import { Target, Plus, Edit2, Trash2, Loader2, AlertTriangle, CheckCircle, XCircle } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  CompanyKpi,
  KpiType,
  KpiUnit,
  KpiWithStatus,
  fetchKpisWithStatus,
  upsertKpi,
  deleteKpi,
} from '@/services/kpiService';

interface KpiManagementProps {
  companyId: string;
  companyName: string;
}

export function KpiManagement({ companyId, companyName }: KpiManagementProps) {
  const { t } = useLanguage();
  const [kpis, setKpis] = useState<KpiWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<CompanyKpi | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const kpiTypeOptions: { value: KpiType; label: string; description: string; defaultUnit: KpiUnit }[] = [
    { 
      value: 'delivery_time_sla', 
      label: t('kpiMgmt.deliveryTimeSla'), 
      description: t('kpiMgmt.deliveryTimeSlaDesc'),
      defaultUnit: 'percent'
    },
    { 
      value: 'processing_time', 
      label: t('kpiMgmt.processingTime'), 
      description: t('kpiMgmt.processingTimeDesc'),
      defaultUnit: 'hours'
    },
    { 
      value: 'dock_to_stock', 
      label: t('kpiMgmt.dockToStock'), 
      description: t('kpiMgmt.dockToStockDesc'),
      defaultUnit: 'hours'
    },
  ];

  const unitOptions: { value: KpiUnit; label: string }[] = [
    { value: 'percent', label: t('kpiMgmt.unitPercent') },
    { value: 'hours', label: t('kpiMgmt.unitHours') },
    { value: 'days', label: t('kpiMgmt.unitDays') },
  ];

  const [form, setForm] = useState({
    kpi_type: 'delivery_time_sla' as KpiType,
    name: '',
    description: '',
    target_value: '',
    unit: 'percent' as KpiUnit,
    warning_threshold: '',
    is_active: true,
  });

  useEffect(() => {
    if (companyId) {
      loadKpis();
    }
  }, [companyId]);

  const loadKpis = async () => {
    try {
      setLoading(true);
      const data = await fetchKpisWithStatus(companyId);
      setKpis(data);
    } catch (error) {
      console.error('Error loading KPIs:', error);
      toast.error(t('kpiMgmt.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const getKpiTypeLabel = (type: KpiType) => {
    const option = kpiTypeOptions.find(o => o.value === type);
    return option?.label || type;
  };

  const getKpiTypeDescription = (type: KpiType) => {
    const option = kpiTypeOptions.find(o => o.value === type);
    return option?.description || '';
  };

  const getUnitLabel = (unit: KpiUnit) => {
    const option = unitOptions.find(o => o.value === unit);
    return option?.label || unit;
  };

  const handleOpenDialog = (kpi?: KpiWithStatus) => {
    if (kpi) {
      setEditingKpi(kpi);
      setForm({
        kpi_type: kpi.kpi_type,
        name: kpi.name,
        description: kpi.description || '',
        target_value: String(kpi.target_value),
        unit: kpi.unit,
        warning_threshold: kpi.warning_threshold ? String(kpi.warning_threshold) : '',
        is_active: kpi.is_active,
      });
    } else {
      setEditingKpi(null);
      const defaultOption = kpiTypeOptions[0];
      setForm({
        kpi_type: defaultOption.value,
        name: defaultOption.label,
        description: '',
        target_value: defaultOption.defaultUnit === 'percent' ? '95' : '24',
        unit: defaultOption.defaultUnit,
        warning_threshold: defaultOption.defaultUnit === 'percent' ? '90' : '48',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleKpiTypeChange = (type: KpiType) => {
    const option = kpiTypeOptions.find(o => o.value === type);
    if (option) {
      setForm(prev => ({
        ...prev,
        kpi_type: type,
        name: prev.name === getKpiTypeLabel(prev.kpi_type) ? option.label : prev.name,
        unit: option.defaultUnit,
        target_value: option.defaultUnit === 'percent' ? '95' : '24',
        warning_threshold: option.defaultUnit === 'percent' ? '90' : '48',
      }));
    }
  };

  const handleSave = async () => {
    if (!form.target_value.trim()) {
      toast.error(t('kpiMgmt.enterTargetValue'));
      return;
    }

    try {
      setSaving(true);
      
      await upsertKpi({
        id: editingKpi?.id,
        company_id: companyId,
        kpi_type: form.kpi_type,
        name: form.name || getKpiTypeLabel(form.kpi_type),
        description: form.description || null,
        target_value: parseFloat(form.target_value),
        unit: form.unit,
        warning_threshold: form.warning_threshold ? parseFloat(form.warning_threshold) : null,
        is_active: form.is_active,
      });

      toast.success(editingKpi ? t('kpiMgmt.updated') : t('kpiMgmt.created'));
      setDialogOpen(false);
      loadKpis();
    } catch (error: any) {
      console.error('Error saving KPI:', error);
      if (error.code === '23505') {
        toast.error(t('kpiMgmt.alreadyExists'));
      } else {
        toast.error(t('kpiMgmt.saveError'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (kpi: KpiWithStatus) => {
    try {
      setDeleting(kpi.id);
      await deleteKpi(kpi.id);
      toast.success(t('kpiMgmt.deleted'));
      loadKpis();
    } catch (error) {
      console.error('Error deleting KPI:', error);
      toast.error(t('kpiMgmt.deleteError'));
    } finally {
      setDeleting(null);
    }
  };

  const getStatusIcon = (status: KpiWithStatus['status']) => {
    switch (status) {
      case 'achieved':
        return <CheckCircle className="h-5 w-5 text-status-shipped" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-status-processing" />;
      case 'missed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Target className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: KpiWithStatus['status']) => {
    switch (status) {
      case 'achieved':
        return <Badge variant="default" className="bg-status-shipped">{t('kpis.achieved')}</Badge>;
      case 'warning':
        return <Badge variant="default" className="bg-status-processing">{t('kpis.warning')}</Badge>;
      case 'missed':
        return <Badge variant="destructive">{t('kpiMgmt.notAchieved')}</Badge>;
      default:
        return <Badge variant="secondary">{t('kpis.noData')}</Badge>;
    }
  };

  // Check which KPI types are already used
  const usedKpiTypes = kpis.map(k => k.kpi_type);
  const availableKpiTypes = kpiTypeOptions.filter(
    opt => !usedKpiTypes.includes(opt.value) || editingKpi?.kpi_type === opt.value
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground">
            {t('kpiMgmt.title')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('kpiMgmt.subtitle').replace('{company}', companyName)}
          </p>
        </div>
        {availableKpiTypes.length > 0 && (
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('kpiMgmt.newKpi')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : kpis.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Target className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
          <h4 className="font-heading text-lg font-semibold text-foreground mb-2">
            {t('kpiMgmt.noKpis')}
          </h4>
          <p className="text-muted-foreground mb-4">
            {t('kpiMgmt.createToMonitor')}
          </p>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('kpiMgmt.createFirst')}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="font-semibold">{t('kpiMgmt.kpi')}</TableHead>
                <TableHead className="font-semibold">{t('kpiMgmt.targetValue')}</TableHead>
                <TableHead className="font-semibold">{t('kpiMgmt.currentValue')}</TableHead>
                <TableHead className="font-semibold">{t('common.status')}</TableHead>
                <TableHead className="font-semibold">{t('kpiMgmt.activeLabel')}</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpis.map((kpi, index) => (
                <TableRow
                  key={kpi.id}
                  className={cn("animate-fade-in")}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(kpi.status)}
                      <div>
                        <p className="font-medium text-foreground">{kpi.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getKpiTypeDescription(kpi.kpi_type)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {kpi.target_value} {getUnitLabel(kpi.unit)}
                    </span>
                    {kpi.warning_threshold && (
                      <p className="text-xs text-muted-foreground">
                        {t('kpis.warning')}: {kpi.warning_threshold} {getUnitLabel(kpi.unit)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {kpi.current_value !== null ? (
                      <span className={cn(
                        "font-semibold",
                        kpi.status === 'achieved' && "text-status-shipped",
                        kpi.status === 'warning' && "text-status-processing",
                        kpi.status === 'missed' && "text-destructive"
                      )}>
                        {kpi.current_value} {getUnitLabel(kpi.unit)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(kpi.status)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={kpi.is_active ? 'default' : 'secondary'}>
                      {kpi.is_active ? t('kpis.active') : t('kpis.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(kpi)}
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(kpi)}
                        disabled={deleting === kpi.id}
                      >
                        {deleting === kpi.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* KPI Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingKpi ? t('kpiMgmt.editKpi') : t('kpiMgmt.newKpi')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('kpiMgmt.kpiType')}</Label>
              <Select
                value={form.kpi_type}
                onValueChange={(v) => handleKpiTypeChange(v as KpiType)}
                disabled={!!editingKpi}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(editingKpi ? kpiTypeOptions : availableKpiTypes).map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <p>{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('common.name')}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('kpiMgmt.kpiNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('kpiMgmt.descriptionOptional')}</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('kpiMgmt.shortDescription')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('kpiMgmt.targetValue')}</Label>
                <Input
                  type="number"
                  value={form.target_value}
                  onChange={(e) => setForm({ ...form, target_value: e.target.value })}
                  placeholder="z.B. 95"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('kpiMgmt.unit')}</Label>
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm({ ...form, unit: v as KpiUnit })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('kpiMgmt.warningThreshold')}</Label>
              <Input
                type="number"
                value={form.warning_threshold}
                onChange={(e) => setForm({ ...form, warning_threshold: e.target.value })}
                placeholder={form.unit === 'percent' ? 'z.B. 90' : 'z.B. 48'}
              />
              <p className="text-xs text-muted-foreground">
                {form.unit === 'percent' 
                  ? t('kpiMgmt.warningPercentDesc')
                  : t('kpiMgmt.warningTimeDesc')}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label>{t('kpiMgmt.kpiActive')}</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
