import { useMemo } from 'react';
import { Locale } from 'date-fns';
import { de, enUS, fr, it, es } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

const locales: Record<string, Locale> = { 
  de, 
  en: enUS, 
  fr, 
  it, 
  es 
};

/**
 * Returns the date-fns locale based on the current language setting.
 * Defaults to German (de) if language is not found.
 */
export function useDateLocale(): Locale {
  const { language } = useLanguage();
  
  return useMemo(() => {
    return locales[language] || de;
  }, [language]);
}
