import { useState, useEffect } from 'react';
import { Plug, Loader2, Settings, RefreshCw } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type IntegrationType =
  | 'business_central'
  | 'woocommerce'
  | 'shopify'
  | 'dhl'
  | 'post_ch'
  | 'custom';

interface Integration {
  id: string;
  company_id: string;
  type: IntegrationType;
  name: string;
  config: Record<string, unknown>;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  created_at: string;
  updated_at: string;
}

interface IntegrationConfigProps {
  companyId: string;
  companyName: string;
}

const getIntegrationTypes = (t: (key: string) => string) => [
  {
    type: 'business_central' as IntegrationType,
    name: 'Business Central',
    description: t('integrations.bcDescription'),
    icon: '📊',
    fields: [
      { key: 'tenant_id', label: 'Tenant ID', type: 'text', placeholder: 'Azure AD Tenant ID' },
      { key: 'environment', label: 'Environment', type: 'text', placeholder: 'Production' },
      { key: 'company_name', label: 'BC Company Name', type: 'text', placeholder: 'CRONUS AG' },
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'OAuth App Client ID' },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '••••••••' },
    ],
  },
  {
    type: 'woocommerce' as IntegrationType,
    name: 'WooCommerce',
    description: t('integrations.wooDescription'),
    icon: '🛒',
    fields: [
      { key: 'store_url', label: 'Store URL', type: 'url', placeholder: 'https://shop.example.com' },
      { key: 'consumer_key', label: 'Consumer Key', type: 'text', placeholder: 'ck_...' },
      { key: 'consumer_secret', label: 'Consumer Secret', type: 'password', placeholder: 'cs_...' },
    ],
  },
  {
    type: 'shopify' as IntegrationType,
    name: 'Shopify',
    description: t('integrations.shopifyDescription'),
    icon: '🛍️',
    fields: [
      { key: 'store_name', label: 'Store Name', type: 'text', placeholder: 'my-store' },
      { key: 'api_key', label: 'API Key', type: 'text', placeholder: 'Shopify API Key' },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: '••••••••' },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'shpat_...' },
    ],
  },
  {
    type: 'dhl' as IntegrationType,
    name: 'DHL',
    description: t('integrations.dhlDescription'),
    icon: '📦',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'text', placeholder: 'DHL API Key' },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: '••••••••' },
      { key: 'account_number', label: t('integrations.accountNumber'), type: 'text', placeholder: t('integrations.customerNumber') },
    ],
  },
  {
    type: 'post_ch' as IntegrationType,
    name: 'Post CH',
    description: t('integrations.postChDescription'),
    icon: '✉️',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Post API Client ID' },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '••••••••' },
      { key: 'franking_license', label: t('integrations.frankingLicense'), type: 'text', placeholder: t('integrations.frankingLicensePlaceholder') },
    ],
  },
  {
    type: 'custom' as IntegrationType,
    name: t('integrations.custom'),
    description: t('integrations.customDescription'),
    icon: '🔧',
    fields: [
      { key: 'api_url', label: 'API URL', type: 'url', placeholder: 'https://api.example.com' },
      { key: 'api_key', label: 'API Key', type: 'text', placeholder: 'API Key' },
      { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: '••••••••' },
    ],
  },
];

export function IntegrationConfig({ companyId, companyName }: IntegrationConfigProps) {
  const { t } = useLanguage();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ReturnType<typeof getIntegrationTypes>[0] | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const INTEGRATION_TYPES = getIntegrationTypes(t);

  useEffect(() => {
    fetchIntegrations();
  }, [companyId]);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (error) throw error;
      setIntegrations((data as Integration[]) || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast.error(t('integrations.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (type: typeof INTEGRATION_TYPES[0], integration?: Integration) => {
    setSelectedType(type);
    if (integration) {
      setEditingIntegration(integration);
      const config = integration.config as Record<string, string>;
      setConfigForm(config);
    } else {
      setEditingIntegration(null);
      setConfigForm({});
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedType(null);
    setEditingIntegration(null);
    setConfigForm({});
  };

  const handleSaveIntegration = async () => {
    if (!selectedType) return;

    try {
      setSaving(true);

      if (editingIntegration) {
        const { error } = await supabase
          .from('integrations')
          .update({
            config: configForm,
          })
          .eq('id', editingIntegration.id);

        if (error) throw error;

        setIntegrations((prev) =>
          prev.map((i) =>
            i.id === editingIntegration.id ? { ...i, config: configForm } : i
          )
        );
        toast.success(t('integrations.updated'));
      } else {
        const { data, error } = await supabase
          .from('integrations')
          .insert({
            company_id: companyId,
            type: selectedType.type,
            name: selectedType.name,
            config: configForm,
            is_active: false,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            toast.error(t('integrations.alreadyExists'));
            return;
          }
          throw error;
        }

        setIntegrations((prev) => [...prev, data as Integration]);
        toast.success(t('integrations.created'));
      }

      handleCloseDialog();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast.error(t('integrations.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (integration: Integration) => {
    try {
      const { error } = await supabase
        .from('integrations')
        .update({ is_active: !integration.is_active })
        .eq('id', integration.id);

      if (error) throw error;

      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integration.id ? { ...i, is_active: !i.is_active } : i
        )
      );
      toast.success(
        integration.is_active
          ? t('integrations.deactivated').replace('{name}', integration.name)
          : t('integrations.activated').replace('{name}', integration.name)
      );
    } catch (error) {
      console.error('Error toggling integration:', error);
      toast.error(t('integrations.updateError'));
    }
  };

  const handleSync = async (integration: Integration) => {
    setSyncing(integration.id);
    try {
      // Simulate sync - in real app this would call an edge function
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { error } = await supabase
        .from('integrations')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success',
        })
        .eq('id', integration.id);

      if (error) throw error;

      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integration.id
            ? { ...i, last_sync_at: new Date().toISOString(), last_sync_status: 'success' }
            : i
        )
      );
      toast.success(t('integrations.synced').replace('{name}', integration.name));
    } catch (error) {
      console.error('Error syncing integration:', error);
      toast.error(t('integrations.syncError'));
    } finally {
      setSyncing(null);
    }
  };

  const getIntegrationByType = (type: IntegrationType) => {
    return integrations.find((i) => i.type === type);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground">
            {t('integrations.title')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('integrations.subtitle').replace('{company}', companyName)}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {integrations.filter((i) => i.is_active).length} / {integrations.length} {t('features.active')}
        </Badge>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {INTEGRATION_TYPES.map((type) => {
              const integration = getIntegrationByType(type.type);
              return (
                <AccordionItem key={type.type} value={type.type}>
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-2xl">{type.icon}</span>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-foreground">{type.name}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </div>
                      {integration && (
                        <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                          {integration.is_active ? t('integrations.active') : t('integrations.inactive')}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    {integration ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border border-border p-3">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={integration.is_active}
                              onCheckedChange={() => handleToggleActive(integration)}
                            />
                            <span className="text-sm">
                              {integration.is_active ? t('integrations.active') : t('integrations.inactive')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSync(integration)}
                              disabled={syncing === integration.id || !integration.is_active}
                              className="gap-2"
                            >
                              {syncing === integration.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                              Sync
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(type, integration)}
                              className="gap-2"
                            >
                              <Settings className="h-4 w-4" />
                              {t('integrations.configure')}
                            </Button>
                          </div>
                        </div>
                        {integration.last_sync_at && (
                          <p className="text-xs text-muted-foreground">
                            {t('integrations.lastSync')}:{' '}
                            {new Date(integration.last_sync_at).toLocaleString('de-CH')}
                            {integration.last_sync_status && (
                              <Badge
                                variant={
                                  integration.last_sync_status === 'success'
                                    ? 'default'
                                    : 'destructive'
                                }
                                className="ml-2 text-xs"
                              >
                                {integration.last_sync_status === 'success'
                                  ? t('integrations.syncSuccess')
                                  : t('integrations.syncFailed')}
                              </Badge>
                            )}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground mb-3">
                          {t('integrations.notConfigured')}
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => handleOpenDialog(type)}
                          className="gap-2"
                        >
                          <Plug className="h-4 w-4" />
                          {t('integrations.setup')}
                        </Button>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedType?.icon}</span>
              {selectedType?.name} {t('integrations.configure')}
            </DialogTitle>
            <DialogDescription>{selectedType?.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedType?.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type}
                  value={configForm[field.key] || ''}
                  onChange={(e) =>
                    setConfigForm({ ...configForm, [field.key]: e.target.value })
                  }
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveIntegration} disabled={saving}>
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
