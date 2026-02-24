import { Switch } from '@/components/ui/switch';
import { OnboardingData } from '../OnboardingWizard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Database, 
  ShoppingCart, 
  Truck, 
  Webhook, 
  Key, 
  ExternalLink,
  Check,
  AlertCircle
} from '@/components/icons';
import { useLanguage } from '@/contexts/LanguageContext';

interface StepIntegrationsProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepIntegrations({ data, updateData }: StepIntegrationsProps) {
  const { t } = useLanguage();

  const INTEGRATIONS = [
    {
      id: 'business_central',
      name: 'Business Central',
      description: t('onboarding.integrationBcDesc'),
      icon: Database,
      category: 'ERP',
      status: 'ready',
    },
    {
      id: 'shopify',
      name: 'Shopify',
      description: t('onboarding.integrationShopifyDesc'),
      icon: ShoppingCart,
      category: 'Shop',
      status: 'ready',
    },
    {
      id: 'woocommerce',
      name: 'WooCommerce',
      description: t('onboarding.integrationWooDesc'),
      icon: ShoppingCart,
      category: 'Shop',
      status: 'ready',
    },
    {
      id: 'dhl',
      name: 'DHL',
      description: t('onboarding.integrationDhlDesc'),
      icon: Truck,
      category: 'Carrier',
      status: 'ready',
    },
    {
      id: 'post_ch',
      name: 'Post CH',
      description: t('onboarding.integrationPostChDesc'),
      icon: Truck,
      category: 'Carrier',
      status: 'ready',
    },
    {
      id: 'webhooks',
      name: 'Webhooks',
      description: t('onboarding.integrationWebhooksDesc'),
      icon: Webhook,
      category: 'Custom',
      status: 'ready',
    },
    {
      id: 'api_keys',
      name: t('onboarding.integrationApiAccess'),
      description: t('onboarding.integrationApiDesc'),
      icon: Key,
      category: 'Custom',
      status: 'ready',
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      description: t('onboarding.integrationHubspotDesc'),
      icon: ExternalLink,
      category: 'CRM',
      status: 'coming_soon',
    },
  ];

  const toggleIntegration = (integrationId: string) => {
    const current = data.enabledIntegrations;
    const updated = current.includes(integrationId)
      ? current.filter(id => id !== integrationId)
      : [...current, integrationId];
    updateData({ enabledIntegrations: updated });
  };

  const categories = [...new Set(INTEGRATIONS.map(i => i.category))];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('onboarding.integrationsDesc')}
      </p>

      {categories.map(category => (
        <div key={category} className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            {category}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INTEGRATIONS.filter(i => i.category === category).map(integration => {
              const Icon = integration.icon;
              const isEnabled = data.enabledIntegrations.includes(integration.id);
              const isComingSoon = integration.status === 'coming_soon';
              
              return (
                <Card 
                  key={integration.id}
                  className={`transition-all ${
                    isEnabled ? 'border-primary bg-primary/5' : ''
                  } ${isComingSoon ? 'opacity-60' : 'cursor-pointer hover:border-primary/50'}`}
                  onClick={() => !isComingSoon && toggleIntegration(integration.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{integration.name}</CardTitle>
                          {isComingSoon && (
                            <Badge variant="outline" className="text-xs mt-1">{t('onboarding.comingSoon')}</Badge>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleIntegration(integration.id)}
                        disabled={isComingSoon}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs">
                      {integration.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-4 border">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          {data.enabledIntegrations.length > 0 ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-500" />
          )}
          {t('onboarding.selectedIntegrations')}
        </h4>
        {data.enabledIntegrations.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.enabledIntegrations.map(id => {
              const integration = INTEGRATIONS.find(i => i.id === id);
              return integration ? (
                <Badge key={id} variant="secondary">{integration.name}</Badge>
              ) : null;
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('onboarding.noIntegrationsSelected')}
          </p>
        )}
      </div>
    </div>
  );
}
