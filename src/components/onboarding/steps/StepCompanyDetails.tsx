import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OnboardingData } from '../OnboardingWizard';
import { Building2, Globe, Mail, Phone, User, FileText } from '@/components/icons';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface StepCompanyDetailsProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepCompanyDetails({ data, updateData }: StepCompanyDetailsProps) {
  const { t } = useLanguage();

  const INDUSTRIES = [
    { value: 'fashion', label: t('onboarding.industryFashion') },
    { value: 'sport', label: t('onboarding.industrySport') },
    { value: 'jewelry', label: t('onboarding.industryJewelry') },
    { value: 'electronics', label: t('onboarding.industryElectronics') },
    { value: 'beauty', label: t('onboarding.industryBeauty') },
    { value: 'food', label: t('onboarding.industryFood') },
    { value: 'health', label: t('onboarding.industryHealth') },
    { value: 'home', label: t('onboarding.industryHome') },
    { value: 'kids', label: t('onboarding.industryKids') },
    { value: 'other', label: t('onboarding.industryOther') },
  ];

  const CONTRACT_TYPES = [
    { value: 'standard', label: t('onboarding.contractStandard') },
    { value: 'premium', label: t('onboarding.contractPremium') },
    { value: 'enterprise', label: t('onboarding.contractEnterprise') },
    { value: 'pilot', label: t('onboarding.contractPilot') },
  ];

  // Automatische Farbextraktion, wenn Domain eingegeben wird (debounced)
  useEffect(() => {
    if (data.domain && data.domain.length > 3 && !data.primaryColor) {
      const timer = setTimeout(async () => {
        try {
          const { data: result, error } = await supabase.functions.invoke('extract-brand-colors', {
            body: { domain: data.domain }
          });

          if (!error && result?.primary_color) {
            updateData({
              primaryColor: result.primary_color,
              accentColor: result.accent_color || data.accentColor,
            });
            console.log(`✅ ${t('onboarding.colorsExtracted')}: ${result.primary_color}`);
          }
        } catch (error) {
          console.error('Automatic color extraction error:', error);
          // Silent fail - user can manually extract in branding step
        }
      }, 1500); // 1.5 Sekunden Debounce

      return () => clearTimeout(timer);
    }
  }, [data.domain, data.primaryColor, updateData, t]);

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {t('onboarding.companyName')} *
          </Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
            placeholder={t('onboarding.companyNamePlaceholder')}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="id">{t('onboarding.customerId')}</Label>
          <Input
            id="id"
            value={data.id || data.name.toUpperCase().substring(0, 5).replace(/\s/g, '')}
            onChange={(e) => updateData({ id: e.target.value.toUpperCase() })}
            placeholder={t('onboarding.customerIdPlaceholder')}
            className="uppercase"
          />
          <p className="text-xs text-muted-foreground">{t('onboarding.customerIdHint')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="domain" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('onboarding.websiteDomain')}
          </Label>
          <Input
            id="domain"
            value={data.domain}
            onChange={(e) => updateData({ domain: e.target.value })}
            placeholder={t('onboarding.websiteDomainPlaceholder')}
          />
          <p className="text-xs text-muted-foreground">{t('onboarding.websiteDomainHint')}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="industry">{t('onboarding.industry')}</Label>
          <Select value={data.industry} onValueChange={(value) => updateData({ industry: value })}>
            <SelectTrigger>
              <SelectValue placeholder={t('onboarding.industryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map(ind => (
                <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contact Person */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">{t('onboarding.contactPerson')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {t('common.name')}
            </Label>
            <Input
              id="contactName"
              value={data.contactName}
              onChange={(e) => updateData({ contactName: e.target.value })}
              placeholder={t('onboarding.contactNamePlaceholder')}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contactEmail" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('common.email')}
            </Label>
            <Input
              id="contactEmail"
              type="email"
              value={data.contactEmail}
              onChange={(e) => updateData({ contactEmail: e.target.value })}
              placeholder={t('onboarding.contactEmailPlaceholder')}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contactPhone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {t('common.phone')}
            </Label>
            <Input
              id="contactPhone"
              type="tel"
              value={data.contactPhone}
              onChange={(e) => updateData({ contactPhone: e.target.value })}
              placeholder={t('onboarding.contactPhonePlaceholder')}
            />
          </div>
        </div>
      </div>

      {/* Contract */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t('onboarding.contractData')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contractType">{t('onboarding.contractType')}</Label>
            <Select value={data.contractType} onValueChange={(value) => updateData({ contractType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map(ct => (
                  <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contractStartDate">{t('onboarding.contractStart')}</Label>
            <Input
              id="contractStartDate"
              type="date"
              value={data.contractStartDate}
              onChange={(e) => updateData({ contractStartDate: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t('onboarding.notes')}</Label>
        <Textarea
          id="notes"
          value={data.notes}
          onChange={(e) => updateData({ notes: e.target.value })}
          placeholder={t('onboarding.notesPlaceholder')}
          rows={3}
        />
      </div>
    </div>
  );
}
