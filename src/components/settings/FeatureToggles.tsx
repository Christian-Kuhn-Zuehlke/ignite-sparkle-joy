import { useState, useEffect, useMemo } from 'react';
import { ToggleLeft, Loader2, Plus, Navigation, Plug, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FeatureToggle {
  id: string;
  company_id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface FeatureTogglesProps {
  companyId: string;
  companyName: string;
}

const getDefaultFeatures = (t: (key: string) => string) => [
  // Navigation Menu Items - NEW
  {
    feature_key: 'nav_orders',
    feature_name: t('features.navOrders'),
    description: t('features.navOrdersDesc'),
    category: 'navigation',
  },
  {
    feature_key: 'nav_inbound',
    feature_name: t('features.navInbound'),
    description: t('features.navInboundDesc'),
    category: 'navigation',
  },
  {
    feature_key: 'nav_inventory',
    feature_name: t('features.navInventory'),
    description: t('features.navInventoryDesc'),
    category: 'navigation',
  },
  {
    feature_key: 'nav_returns',
    feature_name: t('features.navReturns'),
    description: t('features.navReturnsDesc'),
    category: 'navigation',
  },
  {
    feature_key: 'nav_clarification',
    feature_name: t('features.navClarification'),
    description: t('features.navClarificationDesc'),
    category: 'navigation',
  },
  {
    feature_key: 'nav_quality',
    feature_name: t('features.navQuality'),
    description: t('features.navQualityDesc'),
    category: 'navigation',
  },
  {
    feature_key: 'nav_packaging',
    feature_name: t('features.navPackaging'),
    description: t('features.navPackagingDesc'),
    category: 'navigation',
  },
  {
    feature_key: 'nav_customers',
    feature_name: t('features.navCustomers'),
    description: t('features.navCustomersDesc'),
    category: 'navigation',
  },
  {
    feature_key: 'nav_ai_hub',
    feature_name: t('features.navAiHub'),
    description: t('features.navAiHubDesc'),
    category: 'navigation',
  },
  {
    feature_key: 'nav_intelligence',
    feature_name: t('features.navIntelligence'),
    description: t('features.navIntelligenceDesc'),
    category: 'navigation',
  },
  // API Features
  {
    feature_key: 'orders_api',
    feature_name: t('features.ordersApi'),
    description: t('features.ordersApiDesc'),
    category: 'api',
  },
  {
    feature_key: 'inventory_api',
    feature_name: t('features.inventoryApi'),
    description: t('features.inventoryApiDesc'),
    category: 'api',
  },
  {
    feature_key: 'returns_api',
    feature_name: t('features.returnsApi'),
    description: t('features.returnsApiDesc'),
    category: 'api',
  },
  {
    feature_key: 'webhooks',
    feature_name: t('features.webhooks'),
    description: t('features.webhooksDesc'),
    category: 'api',
  },
  // Integrations
  {
    feature_key: 'bc_integration',
    feature_name: t('features.bcIntegration'),
    description: t('features.bcIntegrationDesc'),
    category: 'integrations',
  },
  {
    feature_key: 'ecommerce_integration',
    feature_name: t('features.ecommerceIntegration'),
    description: t('features.ecommerceIntegrationDesc'),
    category: 'integrations',
  },
  {
    feature_key: 'shipping_integration',
    feature_name: t('features.shippingIntegration'),
    description: t('features.shippingIntegrationDesc'),
    category: 'integrations',
  },
  {
    feature_key: 'realtime_updates',
    feature_name: t('features.realtimeUpdates'),
    description: t('features.realtimeUpdatesDesc'),
    category: 'integrations',
  },
];

export function FeatureToggles({ companyId, companyName }: FeatureTogglesProps) {
  const { t } = useLanguage();
  const [features, setFeatures] = useState<FeatureToggle[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchFeatures();
  }, [companyId]);

  const fetchFeatures = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('feature_toggles')
        .select('*')
        .eq('company_id', companyId)
        .order('feature_name', { ascending: true });

      if (error) throw error;
      setFeatures(data || []);
    } catch (error) {
      console.error('Error fetching features:', error);
      toast.error(t('features.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeFeatures = async () => {
    try {
      setInitializing(true);

      const defaultFeatures = getDefaultFeatures(t);
      const featuresToInsert = defaultFeatures.map((f) => ({
        company_id: companyId,
        ...f,
        is_enabled: false,
      }));

      const { data, error } = await supabase
        .from('feature_toggles')
        .insert(featuresToInsert)
        .select();

      if (error) throw error;

      setFeatures(data || []);
      toast.success(t('features.initialized'));
    } catch (error) {
      console.error('Error initializing features:', error);
      toast.error(t('features.initError'));
    } finally {
      setInitializing(false);
    }
  };

  const handleToggleFeature = async (feature: FeatureToggle) => {
    try {
      const { error } = await supabase
        .from('feature_toggles')
        .update({ is_enabled: !feature.is_enabled })
        .eq('id', feature.id);

      if (error) throw error;

      setFeatures((prev) =>
        prev.map((f) =>
          f.id === feature.id ? { ...f, is_enabled: !f.is_enabled } : f
        )
      );
      toast.success(
        feature.is_enabled
          ? t('features.deactivated').replace('{name}', feature.feature_name)
          : t('features.activated').replace('{name}', feature.feature_name)
      );
    } catch (error) {
      console.error('Error toggling feature:', error);
      toast.error(t('features.updateError'));
    }
  };

  const enabledCount = features.filter((f) => f.is_enabled).length;

  // Group features by category based on feature_key prefix
  const groupedFeatures = useMemo(() => {
    const groups: Record<string, FeatureToggle[]> = {
      navigation: [],
      api: [],
      integrations: [],
    };
    
    features.forEach((feature) => {
      if (feature.feature_key.startsWith('nav_')) {
        groups.navigation.push(feature);
      } else if (feature.feature_key.includes('_api') || feature.feature_key === 'webhooks') {
        groups.api.push(feature);
      } else {
        groups.integrations.push(feature);
      }
    });
    
    return groups;
  }, [features]);

  const categoryLabels = {
    navigation: { label: 'Navigation', icon: Navigation, desc: 'Welche Menüpunkte der Kunde sieht' },
    api: { label: 'API & Webhooks', icon: Plug, desc: 'API-Zugriff und Echtzeit-Events' },
    integrations: { label: 'Integrationen', icon: Link2, desc: 'System-Verbindungen' },
  };

  const renderFeatureList = (featureList: FeatureToggle[]) => (
    <div className="divide-y divide-border">
      {featureList.map((feature, index) => (
        <div
          key={feature.id}
          className={cn(
            'flex items-center justify-between p-4 animate-fade-in',
            feature.is_enabled ? 'bg-accent/5' : ''
          )}
          style={{ animationDelay: `${index * 30}ms` }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">
                {feature.feature_name}
              </p>
              {feature.is_enabled && (
                <Badge variant="default" className="text-xs">
                  {t('features.activeLabel')}
                </Badge>
              )}
            </div>
            {feature.description && (
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            )}
          </div>
          <Switch
            checked={feature.is_enabled}
            onCheckedChange={() => handleToggleFeature(feature)}
          />
        </div>
      ))}
      {featureList.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          Keine Features in dieser Kategorie
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground">
            {t('features.title')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('features.subtitle').replace('{company}', companyName)}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {enabledCount} / {features.length} {t('features.active')}
        </Badge>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : features.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ToggleLeft className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-4">
              {t('features.noFeatures')}
            </p>
            <Button
              onClick={handleInitializeFeatures}
              disabled={initializing}
              className="gap-2"
            >
              {initializing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t('features.addDefault')}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="navigation" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-muted/30 p-0">
              {Object.entries(categoryLabels).map(([key, { label, icon: Icon }]) => (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {groupedFeatures[key as keyof typeof groupedFeatures]?.filter(f => f.is_enabled).length || 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(categoryLabels).map(([key, { desc }]) => (
              <TabsContent key={key} value={key} className="mt-0">
                <div className="p-3 bg-muted/20 border-b text-sm text-muted-foreground">
                  {desc}
                </div>
                {renderFeatureList(groupedFeatures[key as keyof typeof groupedFeatures] || [])}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
