import { useState, useEffect } from 'react';
import { Webhook, Plus, Trash2, Edit2, Loader2, TestTube } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type WebhookEvent =
  | 'order_created'
  | 'order_updated'
  | 'order_shipped'
  | 'return_created'
  | 'return_updated'
  | 'inventory_low'
  | 'inventory_updated';

interface WebhookData {
  id: string;
  company_id: string;
  name: string;
  url: string;
  secret: string | null;
  events: WebhookEvent[];
  is_active: boolean;
  last_triggered_at: string | null;
  last_status_code: number | null;
  created_at: string;
  updated_at: string;
}

interface WebhookConfigProps {
  companyId: string;
  companyName: string;
}

export function WebhookConfig({ companyId, companyName }: WebhookConfigProps) {
  const { t } = useLanguage();
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookData | null>(null);
  const [form, setForm] = useState({
    name: '',
    url: '',
    secret: '',
    events: [] as WebhookEvent[],
  });
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookData | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const EVENT_OPTIONS: { value: WebhookEvent; label: string }[] = [
    { value: 'order_created', label: t('webhooks.event.order_created') },
    { value: 'order_updated', label: t('webhooks.event.order_updated') },
    { value: 'order_shipped', label: t('webhooks.event.order_shipped') },
    { value: 'return_created', label: t('webhooks.event.return_created') },
    { value: 'return_updated', label: t('webhooks.event.return_updated') },
    { value: 'inventory_low', label: t('webhooks.event.inventory_low') },
    { value: 'inventory_updated', label: t('webhooks.event.inventory_updated') },
  ];

  useEffect(() => {
    fetchWebhooks();
  }, [companyId]);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase
        .from as any)('webhooks')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks((data as WebhookData[]) || []);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast.error(t('webhooks.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (webhook?: WebhookData) => {
    if (webhook) {
      setEditingWebhook(webhook);
      setForm({
        name: webhook.name,
        url: webhook.url,
        secret: webhook.secret || '',
        events: webhook.events,
      });
    } else {
      setEditingWebhook(null);
      setForm({ name: '', url: '', secret: '', events: [] });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingWebhook(null);
    setForm({ name: '', url: '', secret: '', events: [] });
  };

  const handleEventToggle = (event: WebhookEvent) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const handleSaveWebhook = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      toast.error(t('memberships.fillRequired'));
      return;
    }

    if (form.events.length === 0) {
      toast.error(t('memberships.fillRequired'));
      return;
    }

    try {
      setSaving(true);

      if (editingWebhook) {
        const { error } = await (supabase
          .from as any)('webhooks')
          .update({
            name: form.name,
            url: form.url,
            secret: form.secret || null,
            events: form.events,
          })
          .eq('id', editingWebhook.id);

        if (error) throw error;

        setWebhooks((prev) =>
          prev.map((w) =>
            w.id === editingWebhook.id
              ? { ...w, ...form, secret: form.secret || null }
              : w
          )
        );
        toast.success(t('webhooks.saved'));
      } else {
        const { data, error } = await (supabase
          .from as any)('webhooks')
          .insert({
            company_id: companyId,
            name: form.name,
            url: form.url,
            secret: form.secret || null,
            events: form.events,
          })
          .select()
          .single();

        if (error) throw error;

        setWebhooks((prev) => [data as WebhookData, ...prev]);
        toast.success(t('webhooks.saved'));
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error saving webhook:', error);
      toast.error(t('webhooks.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWebhook = async () => {
    if (!webhookToDelete) return;

    try {
      const { error } = await (supabase
        .from as any)('webhooks')
        .delete()
        .eq('id', webhookToDelete.id);

      if (error) throw error;

      setWebhooks((prev) => prev.filter((w) => w.id !== webhookToDelete.id));
      toast.success(t('webhooks.deleted'));
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error(t('webhooks.deleteError'));
    } finally {
      setDeleteDialogOpen(false);
      setWebhookToDelete(null);
    }
  };

  const handleToggleActive = async (webhook: WebhookData) => {
    try {
      const { error } = await (supabase
        .from as any)('webhooks')
        .update({ is_active: !webhook.is_active })
        .eq('id', webhook.id);

      if (error) throw error;

      setWebhooks((prev) =>
        prev.map((w) => (w.id === webhook.id ? { ...w, is_active: !w.is_active } : w))
      );
      toast.success(webhook.is_active ? t('webhooks.deactivated') : t('webhooks.activated'));
    } catch (error) {
      console.error('Error toggling webhook:', error);
      toast.error(t('webhooks.updateError'));
    }
  };

  const handleTestWebhook = async (webhook: WebhookData) => {
    setTesting(webhook.id);
    try {
      await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          event: 'test',
          timestamp: new Date().toISOString(),
          company_id: companyId,
          message: 'Test webhook from MSD Portal',
        }),
      });

      toast.success(t('webhooks.testSuccess'));
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error(t('webhooks.testError'));
    } finally {
      setTesting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground">{t('webhooks.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('webhooks.desc').replace('{company}', companyName)}
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('webhooks.new')}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Webhook className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{t('webhooks.noWebhooks')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="font-semibold">{t('common.name')}</TableHead>
                <TableHead className="font-semibold">URL</TableHead>
                <TableHead className="font-semibold">{t('webhooks.events')}</TableHead>
                <TableHead className="font-semibold">{t('common.status')}</TableHead>
                <TableHead className="font-semibold">{t('webhooks.lastTriggered')}</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((webhook, index) => (
                <TableRow
                  key={webhook.id}
                  className={cn('animate-fade-in')}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <span className="font-medium text-foreground">{webhook.name}</span>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground truncate max-w-[200px] block">
                      {webhook.url}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.slice(0, 2).map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {EVENT_OPTIONS.find((e) => e.value === event)?.label || event}
                        </Badge>
                      ))}
                      {webhook.events.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{webhook.events.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={webhook.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => handleToggleActive(webhook)}
                    >
                      {webhook.is_active ? t('kpis.active') : t('kpis.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {webhook.last_triggered_at
                        ? new Date(webhook.last_triggered_at).toLocaleDateString()
                        : t('apiKeys.never')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleTestWebhook(webhook)}
                        disabled={testing === webhook.id}
                      >
                        {testing === webhook.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(webhook)}
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          setWebhookToDelete(webhook);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create/Edit Webhook Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingWebhook ? t('webhooks.edit') : t('webhooks.create')}
            </DialogTitle>
            <DialogDescription>
              {t('webhooks.desc').replace('{company}', companyName)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-name">{t('common.name')}</Label>
              <Input
                id="webhook-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="z.B. Order Notifications"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-url">{t('webhooks.url')}</Label>
              <Input
                id="webhook-url"
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder={t('webhooks.urlPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook-secret">{t('webhooks.secret')}</Label>
              <Input
                id="webhook-secret"
                type="password"
                value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                placeholder={t('webhooks.secretPlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('webhooks.events')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_OPTIONS.map((event) => (
                  <div
                    key={event.value}
                    className="flex items-center space-x-2 rounded-md border border-border p-2"
                  >
                    <Checkbox
                      id={event.value}
                      checked={form.events.includes(event.value)}
                      onCheckedChange={() => handleEventToggle(event.value)}
                    />
                    <label
                      htmlFor={event.value}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {event.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveWebhook} disabled={saving}>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('webhooks.title')} {t('common.delete')}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t('apiKeys.deleteConfirm').replace('{name}', webhookToDelete?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWebhook}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}