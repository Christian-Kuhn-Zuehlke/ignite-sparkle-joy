import { Palette, Target, Shield, Globe, Settings2, Languages, Building2 } from '@/components/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BrandColorSettings } from './BrandColorSettings';
import { FeatureToggles } from './FeatureToggles';
import { ApiKeyManagement } from './ApiKeyManagement';
import { WebhookConfig } from './WebhookConfig';
import { IntegrationConfig } from './IntegrationConfig';
import { KpiManagement } from './KpiManagement';
import { CompanyLanguageSettings } from './CompanyLanguageSettings';
import { useLanguage } from '@/contexts/LanguageContext';

interface Company {
  id: string;
  name: string;
}

interface ConfigurationTabProps {
  isSystemAdmin: boolean;
  isCustomerAdmin: boolean;
  companies: Company[];
  selectedCompanyId: string;
  onCompanyChange: (companyId: string) => void;
  currentUserCompanyId: string | null;
  currentUserCompanyName: string | null;
}

export function ConfigurationTab({
  isSystemAdmin,
  isCustomerAdmin,
  companies,
  selectedCompanyId,
  onCompanyChange,
  currentUserCompanyId,
  currentUserCompanyName,
}: ConfigurationTabProps) {
  const { t } = useLanguage();
  const effectiveCompanyId = isSystemAdmin ? selectedCompanyId : (isCustomerAdmin ? currentUserCompanyId : null);
  const effectiveCompanyName = isSystemAdmin 
    ? companies.find(c => c.id === selectedCompanyId)?.name || ''
    : currentUserCompanyName || '';

  if (!effectiveCompanyId) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        {isSystemAdmin && (
          <div className="flex items-center gap-4 mb-6">
            <Label htmlFor="company-select" className="whitespace-nowrap font-medium">
              {t('settingsCommon.company')}:
            </Label>
            <Select value={selectedCompanyId} onValueChange={onCompanyChange}>
              <SelectTrigger className="w-[300px]" id="company-select">
                <SelectValue placeholder={t('configTab.selectCompany')} />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name} ({company.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Settings2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
            {t('configTab.selectCompany')}
          </h3>
          <p className="text-muted-foreground max-w-md">
            {t('configTab.selectCompanyDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-card">
      {/* Company Selection - Only for System Admins */}
      {isSystemAdmin && (
        <div className="flex items-center gap-4 mb-6">
          <Label htmlFor="company-select" className="whitespace-nowrap font-medium">
            {t('settingsCommon.company')}:
          </Label>
          <Select value={selectedCompanyId} onValueChange={onCompanyChange}>
            <SelectTrigger className="w-[300px]" id="company-select">
              <SelectValue placeholder={t('configTab.selectCompany')} />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name} ({company.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Customer Admin Info */}
      {isCustomerAdmin && currentUserCompanyId && (
        <div className="flex items-center gap-3 mb-6 p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <Building2 className="h-5 w-5 text-accent" />
          <div>
            <p className="font-medium text-foreground">{currentUserCompanyName}</p>
            <p className="text-sm text-muted-foreground">{t('configTab.companyConfig')}</p>
          </div>
        </div>
      )}

      {/* System Admin: Full tabs */}
      {isSystemAdmin && (
        <Tabs defaultValue="branding" className="space-y-4">
          <TabsList className="grid w-full max-w-4xl grid-cols-7">
            <TabsTrigger value="branding" className="gap-1">
              <Palette className="h-3 w-3" />
              <span className="hidden lg:inline">{t('settings.branding')}</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="gap-1">
              <Languages className="h-3 w-3" />
              <span className="hidden lg:inline">{t('misc.language')}</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-1">
              <Target className="h-3 w-3" />
              <span className="hidden lg:inline">{t('configTab.features')}</span>
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-1">
              <Shield className="h-3 w-3" />
              <span className="hidden lg:inline">{t('settings.apiKeys')}</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-1">
              <Globe className="h-3 w-3" />
              <span className="hidden lg:inline">{t('settings.webhooks')}</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-1">
              <Settings2 className="h-3 w-3" />
              <span className="hidden lg:inline">{t('settings.integrations')}</span>
            </TabsTrigger>
            <TabsTrigger value="kpis" className="gap-1">
              <Target className="h-3 w-3" />
              <span className="hidden lg:inline">KPIs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding">
            <BrandColorSettings companyId={effectiveCompanyId} companyName={effectiveCompanyName} />
          </TabsContent>
          <TabsContent value="language">
            <CompanyLanguageSettings companyId={effectiveCompanyId} />
          </TabsContent>
          <TabsContent value="features">
            <FeatureToggles companyId={effectiveCompanyId} companyName={effectiveCompanyName} />
          </TabsContent>
          <TabsContent value="api-keys">
            <ApiKeyManagement companyId={effectiveCompanyId} companyName={effectiveCompanyName} />
          </TabsContent>
          <TabsContent value="webhooks">
            <WebhookConfig companyId={effectiveCompanyId} companyName={effectiveCompanyName} />
          </TabsContent>
          <TabsContent value="integrations">
            <IntegrationConfig companyId={effectiveCompanyId} companyName={effectiveCompanyName} />
          </TabsContent>
          <TabsContent value="kpis">
            <KpiManagement companyId={effectiveCompanyId} companyName={effectiveCompanyName} />
          </TabsContent>
        </Tabs>
      )}

      {/* Customer Admin: Limited tabs */}
      {isCustomerAdmin && (
        <Tabs defaultValue="api-keys" className="space-y-4">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="api-keys" className="gap-1">
              <Shield className="h-3 w-3" />
              <span className="hidden lg:inline">{t('settings.apiKeys')}</span>
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="gap-1">
              <Globe className="h-3 w-3" />
              <span className="hidden lg:inline">{t('settings.webhooks')}</span>
            </TabsTrigger>
            <TabsTrigger value="kpis" className="gap-1">
              <Target className="h-3 w-3" />
              <span className="hidden lg:inline">KPIs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys">
            <ApiKeyManagement companyId={effectiveCompanyId} companyName={effectiveCompanyName} />
          </TabsContent>
          <TabsContent value="webhooks">
            <WebhookConfig companyId={effectiveCompanyId} companyName={effectiveCompanyName} />
          </TabsContent>
          <TabsContent value="kpis">
            <KpiManagement companyId={effectiveCompanyId} companyName={effectiveCompanyName} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}