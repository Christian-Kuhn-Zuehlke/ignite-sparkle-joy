import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSLAProfile, useUpdateSLAProfile } from '@/hooks/useSLAProfile';
import { useSLARules, useCreateSLARule, useUpdateSLARule, useDeleteSLARule } from '@/hooks/useSLARules';
import { SLARule, SLAScope, SLAMeasurementMethod, SLASeverity, OrderEventType } from '@/services/slaService';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface SLAManagementProps {
  companyId: string;
  companyName: string;
}

const scopeOptions: { value: SLAScope; label: string }[] = [
  { value: 'outbound_orders', label: 'Outbound Orders' },
  { value: 'returns', label: 'Returns' },
  { value: 'receiving', label: 'Receiving' },
];

const measurementMethodOptions: { value: SLAMeasurementMethod; label: string }[] = [
  { value: 'business_hours', label: 'Business Hours' },
  { value: '24_7', label: '24/7' },
];

const eventTypeOptions: { value: OrderEventType; label: string }[] = [
  { value: 'ORDER_RECEIVED', label: 'Order Received' },
  { value: 'PICK_STARTED', label: 'Pick Started' },
  { value: 'PACK_COMPLETED', label: 'Pack Completed' },
  { value: 'READY_TO_SHIP', label: 'Ready to Ship' },
  { value: 'CARRIER_HANDOVER', label: 'Carrier Handover' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'RETURN_RECEIVED', label: 'Return Received' },
  { value: 'RETURN_COMPLETED', label: 'Return Completed' },
];

export function SLAManagement({ companyId, companyName }: SLAManagementProps) {
  const { t } = useLanguage();
  const { data: profile, isLoading: profileLoading } = useSLAProfile(companyId);
  const { data: rules, isLoading: rulesLoading } = useSLARules(companyId);
  const updateProfile = useUpdateSLAProfile();
  const createRule = useCreateSLARule();
  const updateRule = useUpdateSLARule();
  const deleteRule = useDeleteSLARule();

  const workDayOptions = [
    { value: 1, label: t('slaMgmt.monday') },
    { value: 2, label: t('slaMgmt.tuesday') },
    { value: 3, label: t('slaMgmt.wednesday') },
    { value: 4, label: t('slaMgmt.thursday') },
    { value: 5, label: t('slaMgmt.friday') },
    { value: 6, label: t('slaMgmt.saturday') },
    { value: 7, label: t('slaMgmt.sunday') },
  ];

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SLARule | null>(null);

  const [profileForm, setProfileForm] = useState({
    timezone: 'Europe/Zurich',
    work_days: [1, 2, 3, 4, 5] as number[],
    work_hours_start: '08:00:00',
    work_hours_end: '18:00:00',
    cut_off_time: '14:00:00',
  });

  const [ruleForm, setRuleForm] = useState({
    name: '',
    description: '',
    scope: 'outbound_orders' as SLAScope,
    filters: '{}',
    start_event: 'ORDER_RECEIVED' as OrderEventType,
    end_event: 'SHIPPED' as OrderEventType,
    target_minutes: 1440, // 24 hours
    measurement_method: 'business_hours' as SLAMeasurementMethod,
    severity: 'warn' as SLASeverity,
    grace_minutes: 0,
    at_risk_threshold_percent: 10,
    exclude_statuses: [] as string[],
    is_active: true,
  });

  // Initialize profile form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        timezone: profile.timezone,
        work_days: profile.work_days,
        work_hours_start: profile.work_hours_start,
        work_hours_end: profile.work_hours_end,
        cut_off_time: profile.cut_off_time || '14:00:00',
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        company_id: companyId,
        ...profileForm,
      });
      toast.success(t('slaMgmt.profileSaved'));
      setProfileDialogOpen(false);
    } catch (error) {
      toast.error(t('slaMgmt.profileSaveError'));
      console.error(error);
    }
  };

  const handleOpenRuleDialog = (rule?: SLARule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleForm({
        name: rule.name,
        description: rule.description || '',
        scope: rule.scope,
        filters: JSON.stringify(rule.filters, null, 2),
        start_event: rule.start_event,
        end_event: rule.end_event,
        target_minutes: rule.target_minutes,
        measurement_method: rule.measurement_method,
        severity: rule.severity,
        grace_minutes: rule.grace_minutes,
        at_risk_threshold_percent: rule.at_risk_threshold_percent,
        exclude_statuses: rule.exclude_statuses || [],
        is_active: rule.is_active,
      });
    } else {
      setEditingRule(null);
      setRuleForm({
        name: '',
        description: '',
        scope: 'outbound_orders',
        filters: '{}',
        start_event: 'ORDER_RECEIVED',
        end_event: 'SHIPPED',
        target_minutes: 1440,
        measurement_method: 'business_hours',
        severity: 'warn',
        grace_minutes: 0,
        at_risk_threshold_percent: 10,
        exclude_statuses: [],
        is_active: true,
      });
    }
    setRuleDialogOpen(true);
  };

  const handleSaveRule = async () => {
    try {
      let filtersObj = {};
      try {
        filtersObj = JSON.parse(ruleForm.filters);
      } catch {
        toast.error(t('slaMgmt.invalidJson'));
        return;
      }

      const ruleData = {
        company_id: companyId,
        name: ruleForm.name,
        description: ruleForm.description || null,
        scope: ruleForm.scope,
        filters: filtersObj,
        start_event: ruleForm.start_event,
        end_event: ruleForm.end_event,
        target_minutes: ruleForm.target_minutes,
        measurement_method: ruleForm.measurement_method,
        severity: ruleForm.severity,
        grace_minutes: ruleForm.grace_minutes,
        at_risk_threshold_percent: ruleForm.at_risk_threshold_percent,
        exclude_statuses: ruleForm.exclude_statuses.length > 0 ? ruleForm.exclude_statuses : null,
        exclude_flags: null,
        is_active: ruleForm.is_active,
      };

      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, updates: ruleData });
        toast.success(t('slaMgmt.ruleUpdated'));
      } else {
        await createRule.mutateAsync(ruleData);
        toast.success(t('slaMgmt.ruleCreated'));
      }
      setRuleDialogOpen(false);
    } catch (error) {
      toast.error(t('slaMgmt.ruleSaveError'));
      console.error(error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm(t('slaMgmt.ruleDeleteConfirm'))) return;

    try {
      await deleteRule.mutateAsync({ id: ruleId, companyId });
      toast.success(t('slaMgmt.ruleDeleted'));
    } catch (error) {
      toast.error(t('slaMgmt.ruleDeleteError'));
      console.error(error);
    }
  };

  const toggleWorkDay = (day: number) => {
    setProfileForm(prev => ({
      ...prev,
      work_days: prev.work_days.includes(day)
        ? prev.work_days.filter(d => d !== day)
        : [...prev.work_days, day].sort(),
    }));
  };

  if (profileLoading || rulesLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('slaMgmt.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('slaMgmt.subtitle').replace('{company}', companyName)}
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <Clock className="h-4 w-4 mr-2" />
            {t('slaMgmt.serviceCalendar')}
          </TabsTrigger>
          <TabsTrigger value="rules">
            <AlertCircle className="h-4 w-4 mr-2" />
            {t('slaMgmt.slaRules')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('slaMgmt.serviceCalendar')}</CardTitle>
              <CardDescription>
                {t('slaMgmt.defineWorkingHours')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('slaMgmt.timezone')}</Label>
                      <Input value={profile.timezone} disabled />
                    </div>
                    <div>
                      <Label>{t('slaMgmt.cutOffTime')}</Label>
                      <Input value={profile.cut_off_time || '14:00:00'} disabled />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t('slaMgmt.workStart')}</Label>
                      <Input value={profile.work_hours_start} disabled />
                    </div>
                    <div>
                      <Label>{t('slaMgmt.workEnd')}</Label>
                      <Input value={profile.work_hours_end} disabled />
                    </div>
                  </div>
                  <div>
                    <Label>{t('slaMgmt.workDays')}</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {workDayOptions.map(day => (
                        <Badge
                          key={day.value}
                          variant={profile.work_days.includes(day.value) ? 'default' : 'outline'}
                        >
                          {day.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button onClick={() => setProfileDialogOpen(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    {t('slaMgmt.editProfile')}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">{t('slaMgmt.noProfile')}</p>
                  <Button onClick={() => setProfileDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('slaMgmt.createProfile')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-semibold">{t('slaMgmt.slaRules')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('slaMgmt.defineRules')}
              </p>
            </div>
            <Button onClick={() => handleOpenRuleDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {t('slaMgmt.newRule')}
            </Button>
          </div>

          {rules && rules.length > 0 ? (
            <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.name')}</TableHead>
                    <TableHead>{t('slaMgmt.scope')}</TableHead>
                    <TableHead>{t('slaMgmt.startEnd')}</TableHead>
                    <TableHead>{t('slaMgmt.targetTime')}</TableHead>
                    <TableHead>{t('common.status')}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground">{rule.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.scope}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {rule.start_event} → {rule.end_event}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {Math.floor(rule.target_minutes / 60)}h {rule.target_minutes % 60}m
                        </span>
                      </TableCell>
                      <TableCell>
                        {rule.is_active ? (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t('kpis.active')}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{t('kpis.inactive')}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenRuleDialog(rule)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">{t('slaMgmt.noRules')}</p>
                <Button onClick={() => handleOpenRuleDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('slaMgmt.createFirstRule')}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('slaMgmt.editSlaProfile')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timezone">{t('slaMgmt.timezone')}</Label>
                <Input
                  id="timezone"
                  value={profileForm.timezone}
                  onChange={e => setProfileForm({ ...profileForm, timezone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cut_off_time">{t('slaMgmt.cutOffTime')}</Label>
                <Input
                  id="cut_off_time"
                  type="time"
                  value={profileForm.cut_off_time}
                  onChange={e => setProfileForm({ ...profileForm, cut_off_time: e.target.value + ':00' })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="work_hours_start">{t('slaMgmt.workStart')}</Label>
                <Input
                  id="work_hours_start"
                  type="time"
                  value={profileForm.work_hours_start}
                  onChange={e => setProfileForm({ ...profileForm, work_hours_start: e.target.value + ':00' })}
                />
              </div>
              <div>
                <Label htmlFor="work_hours_end">{t('slaMgmt.workEnd')}</Label>
                <Input
                  id="work_hours_end"
                  type="time"
                  value={profileForm.work_hours_end}
                  onChange={e => setProfileForm({ ...profileForm, work_hours_end: e.target.value + ':00' })}
                />
              </div>
            </div>
            <div>
              <Label>{t('slaMgmt.workDays')}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {workDayOptions.map(day => (
                  <Badge
                    key={day.value}
                    variant={profileForm.work_days.includes(day.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleWorkDay(day.value)}
                  >
                    {day.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? t('common.edit') : t('common.add')} {t('slaMgmt.slaRules')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('common.name')}</Label>
                <Input
                  value={ruleForm.name}
                  onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('slaMgmt.scope')}</Label>
                <Select
                  value={ruleForm.scope}
                  onValueChange={(value) => setRuleForm({ ...ruleForm, scope: value as SLAScope })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('kpiMgmt.description')}</Label>
              <Textarea
                value={ruleForm.description}
                onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Event</Label>
                <Select
                  value={ruleForm.start_event}
                  onValueChange={(value) => setRuleForm({ ...ruleForm, start_event: value as OrderEventType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>End Event</Label>
                <Select
                  value={ruleForm.end_event}
                  onValueChange={(value) => setRuleForm({ ...ruleForm, end_event: value as OrderEventType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('slaMgmt.targetTime')} ({t('kpiMgmt.hours').toLowerCase()})</Label>
                <Input
                  type="number"
                  value={Math.floor(ruleForm.target_minutes / 60)}
                  onChange={e => setRuleForm({ ...ruleForm, target_minutes: parseInt(e.target.value) * 60 })}
                />
              </div>
              <div>
                <Label>Measurement Method</Label>
                <Select
                  value={ruleForm.measurement_method}
                  onValueChange={(value) => setRuleForm({ ...ruleForm, measurement_method: value as SLAMeasurementMethod })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {measurementMethodOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('kpiMgmt.kpiActive')}</Label>
              <Switch
                checked={ruleForm.is_active}
                onCheckedChange={(checked) => setRuleForm({ ...ruleForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveRule} disabled={createRule.isPending || updateRule.isPending}>
              {(createRule.isPending || updateRule.isPending) ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}