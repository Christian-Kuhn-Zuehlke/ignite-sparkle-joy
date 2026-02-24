import { useState, useEffect } from 'react';
import { Globe, Loader2 } from '@/components/icons';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage, Language, languageNames, languageFlags } from '@/contexts/LanguageContext';

interface CompanyLanguageSettingsProps {
  companyId: string;
}

const languages: Language[] = ['de', 'en', 'fr', 'it', 'es'];

export function CompanyLanguageSettings({ companyId }: CompanyLanguageSettingsProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [defaultLanguage, setDefaultLanguage] = useState<Language>('de');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCompanyLanguage = async () => {
      if (!companyId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('default_language')
          .eq('id', companyId)
          .single();

        if (error) throw error;
        
        if (data?.default_language && languages.includes(data.default_language as Language)) {
          setDefaultLanguage(data.default_language as Language);
        }
      } catch (error) {
        console.error('Error fetching company language:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyLanguage();
  }, [companyId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ default_language: defaultLanguage })
        .eq('id', companyId);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('companyLanguage.saved'),
      });
    } catch (error) {
      console.error('Error saving company language:', error);
      toast({
        title: t('common.error'),
        description: t('companyLanguage.saveError'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="h-5 w-5 text-primary" />
        <h3 className="font-heading text-lg font-semibold">{t('companyLanguage.title')}</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {t('companyLanguage.description')}
      </p>

      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-xs">
          <Label htmlFor="company-language" className="mb-2 block">
            {t('companyLanguage.defaultLanguage')}
          </Label>
          <Select value={defaultLanguage} onValueChange={(value) => setDefaultLanguage(value as Language)}>
            <SelectTrigger id="company-language">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span>{languageFlags[defaultLanguage]}</span>
                  <span>{languageNames[defaultLanguage]}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  <span className="flex items-center gap-2">
                    <span>{languageFlags[lang]}</span>
                    <span>{languageNames[lang]}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-6">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('common.saving')}
              </>
            ) : (
              t('common.save')
            )}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        {t('companyLanguage.hint')}
      </p>
    </div>
  );
}
