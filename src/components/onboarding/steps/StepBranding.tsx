import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OnboardingData } from '../OnboardingWizard';
import { Upload, Wand2, X, Plus, Palette, Sparkles, Lightbulb, Loader2, Pipette } from '@/components/icons';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { getTaglineSuggestions, getIconTheme } from '@/contexts/BrandingContext';

interface StepBrandingProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepBranding({ data, updateData }: StepBrandingProps) {
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [hasAutoExtracted, setHasAutoExtracted] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const SUGGESTED_KEYWORDS = [
    'Premium', 'Sport', 'Elegant', t('onboarding.keywordSustainable'), t('onboarding.keywordModern'), t('onboarding.keywordClassic'),
    'Outdoor', 'Fashion', 'Luxury', 'Minimalist', 'Playful', 'Professional',
  ];

  // Determine icon theme based on keywords
  const iconTheme = useMemo(() => {
    return getIconTheme(data.brandKeywords, data.industry || null);
  }, [data.brandKeywords, data.industry]);

  // Get tagline suggestions based on keywords/industry
  const taglineSuggestions = useMemo(() => {
    return getTaglineSuggestions(data.industry, data.brandKeywords, iconTheme);
  }, [data.industry, data.brandKeywords, iconTheme]);

  // Automatische Farbextraktion beim Öffnen des Steps, wenn Domain vorhanden aber keine Farben
  useEffect(() => {
    if (data.domain && data.domain.length > 3 && !data.primaryColor && !hasAutoExtracted) {
      // Automatisch extrahieren nach kurzer Verzögerung
      const timer = setTimeout(() => {
        extractColorsFromDomain(true); // true = automatisch
        setHasAutoExtracted(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [data.domain, data.primaryColor, hasAutoExtracted]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!data.id) {
      toast.error(t('onboarding.saveCompanyFirst'));
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${data.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      updateData({ logoUrl: urlData.publicUrl });
      toast.success(t('onboarding.logoUploaded'));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('onboarding.uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to check if color is light
  const isLightColor = (color: string): boolean => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  // Validate and auto-swap colors when they change
  const handleColorChange = (type: 'primary' | 'accent', color: string) => {
    if (type === 'primary') {
      const primaryIsLight = isLightColor(color);
      const accentIsLight = isLightColor(data.accentColor);
      
      // If setting a light primary and accent is dark, swap them
      if (primaryIsLight && !accentIsLight) {
        toast.info(t('brandColors.colorsSwapped'));
        updateData({ primaryColor: data.accentColor, accentColor: color });
        return;
      }
      updateData({ primaryColor: color });
    } else {
      const primaryIsLight = isLightColor(data.primaryColor);
      const accentIsLight = isLightColor(color);
      
      // If accent is dark and primary is light, swap them
      if (primaryIsLight && !accentIsLight) {
        toast.info(t('brandColors.colorsSwapped'));
        updateData({ primaryColor: color, accentColor: data.primaryColor });
        return;
      }
      updateData({ accentColor: color });
    }
  };

  const extractColorsFromDomain = async (isAutomatic = false) => {
    if (!data.domain) {
      if (!isAutomatic) {
        toast.error(t('onboarding.enterDomainFirst'));
      }
      return;
    }

    setIsExtracting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('extract-brand-colors', {
        body: { domain: data.domain }
      });

      if (error) throw error;

      if (result?.primary_color) {
        // Validate extracted colors
        const primaryIsLight = isLightColor(result.primary_color);
        const accentIsLight = isLightColor(result.accent_color || data.accentColor);
        
        if (primaryIsLight && !accentIsLight) {
          // Swap if primary is light and accent is dark
          updateData({
            primaryColor: result.accent_color || data.accentColor,
            accentColor: result.primary_color,
          });
          if (!isAutomatic) {
            toast.success(t('onboarding.colorsExtractedSwapped'));
          }
        } else {
          updateData({
            primaryColor: result.primary_color,
            accentColor: result.accent_color || data.accentColor,
          });
          if (!isAutomatic) {
            toast.success(t('onboarding.colorsExtractedSuccess'));
          }
        }
      } else {
        if (!isAutomatic) {
          toast.info(t('onboarding.noColorsFound'));
        }
      }
    } catch (error) {
      console.error('Color extraction error:', error);
      if (!isAutomatic) {
        toast.error(t('onboarding.colorExtractionError'));
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const generateAiTaglines = async () => {
    if (!data.name) {
      toast.error(t('onboarding.saveCompanyFirst'));
      return;
    }

    setIsGeneratingAi(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('generate-taglines', {
        body: {
          companyName: data.name,
          industry: data.industry,
          keywords: data.brandKeywords,
          domain: data.domain, // Pass domain for website content extraction
        }
      });

      if (error) throw error;

      if (result?.taglines && Array.isArray(result.taglines)) {
        setAiSuggestions(result.taglines);
        toast.success(t('brandColors.aiGenerated'));
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error(t('brandColors.aiGenerateError'));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const addKeyword = (keyword: string) => {
    if (keyword && !data.brandKeywords.includes(keyword)) {
      updateData({ brandKeywords: [...data.brandKeywords, keyword] });
    }
    setNewKeyword('');
  };

  const removeKeyword = (keyword: string) => {
    updateData({ brandKeywords: data.brandKeywords.filter(k => k !== keyword) });
  };

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <div className="space-y-3">
        <Label>{t('onboarding.companyLogo')}</Label>
        <div className="flex items-start gap-4">
          <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
            {data.logoUrl ? (
              <img src={data.logoUrl} alt="Logo" loading="lazy" decoding="async" className="w-full h-full object-contain p-2" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input
              type="file"
              id="logo-upload"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('logo-upload')?.click()}
              disabled={isUploading || !data.id}
            >
              {isUploading ? t('common.loading') : t('onboarding.uploadLogo')}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t('onboarding.logoFormats')}
            </p>
            {!data.id && (
              <p className="text-xs text-amber-600">
                {t('onboarding.saveCompanyDataFirst')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Color Extraction */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            {t('onboarding.brandColors')}
          </h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => extractColorsFromDomain(false)}
            disabled={isExtracting || !data.domain}
            className="gap-1.5"
          >
            {isExtracting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pipette className="h-4 w-4" />
            )}
            {isExtracting ? t('onboarding.extracting') : hasAutoExtracted ? t('onboarding.extractAgain') : t('onboarding.extractFromWebsite')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">{t('onboarding.primaryColor')}</Label>
            <div className="flex gap-2">
              <div 
                className="w-12 h-10 rounded border cursor-pointer"
                style={{ backgroundColor: data.primaryColor }}
                onClick={() => document.getElementById('primaryColorPicker')?.click()}
              />
              <input
                type="color"
                id="primaryColorPicker"
                value={data.primaryColor}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="hidden"
              />
              <Input
                id="primaryColor"
                value={data.primaryColor}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                placeholder="#1e3a5f"
                className="font-mono"
              />
            </div>
            {isLightColor(data.primaryColor) && (
              <p className="text-xs text-amber-600">
                {t('brandColors.colorTooLight')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accentColor">{t('onboarding.accentColor')}</Label>
            <div className="flex gap-2">
              <div 
                className="w-12 h-10 rounded border cursor-pointer"
                style={{ backgroundColor: data.accentColor }}
                onClick={() => document.getElementById('accentColorPicker')?.click()}
              />
              <input
                type="color"
                id="accentColorPicker"
                value={data.accentColor}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="hidden"
              />
              <Input
                id="accentColor"
                value={data.accentColor}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                placeholder="#2f9e8f"
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* Color Preview */}
        <div 
          className="mt-4 p-4 rounded-lg text-white"
          style={{ 
            background: `linear-gradient(135deg, ${data.primaryColor} 0%, ${data.accentColor} 100%)` 
          }}
        >
          <p className="font-medium">{t('onboarding.colorPreview')}</p>
          <p className="text-sm opacity-80">{t('onboarding.colorPreviewDesc')}</p>
        </div>
      </div>

      {/* Brand Keywords */}
      <div className="border-t pt-4">
        <Label className="mb-2 block">{t('onboarding.brandKeywords')}</Label>
        <p className="text-sm text-muted-foreground mb-3">
          {t('onboarding.brandKeywordsDesc')}
        </p>

        {/* Current keywords */}
        <div className="flex flex-wrap gap-2 mb-3">
          {data.brandKeywords.map(keyword => (
            <Badge key={keyword} variant="secondary" className="gap-1">
              {keyword}
              <button onClick={() => removeKeyword(keyword)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        {/* Add keyword */}
        <div className="flex gap-2 mb-3">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder={t('onboarding.addKeyword')}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword(newKeyword)}
          />
          <Button variant="outline" onClick={() => addKeyword(newKeyword)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap gap-1">
          {SUGGESTED_KEYWORDS.filter(k => !data.brandKeywords.includes(k)).map(keyword => (
            <button
              key={keyword}
              onClick={() => addKeyword(keyword)}
              className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              + {keyword}
            </button>
          ))}
        </div>
      </div>

      {/* Tagline Section */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Label className="mb-1 block flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {t('brandColors.tagline')}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t('brandColors.taglineHint')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateAiTaglines}
            disabled={isGeneratingAi || !data.name}
          >
            {isGeneratingAi ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4 mr-1" />
            )}
            {t('brandColors.aiGenerate')}
          </Button>
        </div>
        
        <Input
          value={data.tagline}
          onChange={(e) => updateData({ tagline: e.target.value })}
          placeholder="Excellence in Every Delivery"
        />

        {/* AI-Generated Suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Wand2 className="h-3 w-3" />
              {t('brandColors.aiSuggestions')}
            </p>
            <div className="flex flex-wrap gap-1">
              {aiSuggestions.map((suggestion, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => updateData({ tagline: suggestion })}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Template Suggestions */}
        {taglineSuggestions.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              {t('brandColors.taglineSuggestionsLabel')}
            </p>
            <div className="flex flex-wrap gap-1">
              {taglineSuggestions.slice(0, 6).map((suggestion, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => updateData({ tagline: suggestion })}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
