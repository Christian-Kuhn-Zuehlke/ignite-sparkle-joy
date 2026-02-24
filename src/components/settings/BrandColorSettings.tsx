import { useState, useEffect, useMemo, useCallback } from 'react';
import { Palette, Save, RotateCcw, Loader2, Sparkles, Lightbulb, Wand2, Pipette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBranding, getTaglineSuggestions, IconTheme } from '@/contexts/BrandingContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BrandColorSettingsProps {
  companyId?: string;
  companyName?: string;
}

export function BrandColorSettings({ companyId: propCompanyId }: BrandColorSettingsProps = {}) {
  const { brand, refetchBranding } = useBranding();
  const { profile, role } = useAuth();
  const { t } = useLanguage();
  const [primaryColor, setPrimaryColor] = useState(brand.primaryColor);
  const [accentColor, setAccentColor] = useState(brand.accentColor);
  const [domain, setDomain] = useState(brand.domain || '');
  const [industry, setIndustry] = useState(brand.industry || '');
  const [keywords, setKeywords] = useState(brand.keywords.join(', '));
  const [tagline, setTagline] = useState(brand.tagline || '');
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const isAdmin = role === 'admin' || role === 'system_admin';
  // Use prop companyId if provided (for system admin), otherwise use profile's company
  const companyId = propCompanyId || profile?.company_id;

  // Load colors for the selected company (for system admin use case)
  useEffect(() => {
    if (propCompanyId) {
      loadCompanyBranding();
    }
  }, [propCompanyId]);

  const loadCompanyBranding = async () => {
    if (!propCompanyId) return;
    
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('primary_color, accent_color, domain, industry, brand_keywords, tagline')
        .eq('id', propCompanyId)
        .single();

      if (error) throw error;
      
      setPrimaryColor(data.primary_color || '#6366f1');
      setAccentColor(data.accent_color || '#22c55e');
      setDomain(data.domain || '');
      setIndustry(data.industry || '');
      setKeywords(data.brand_keywords?.join(', ') || '');
      setTagline(data.tagline || '');
    } catch (error) {
      console.error('Error loading company branding:', error);
    }
  };

  // Sync state when brand data changes
  useEffect(() => {
    if (!propCompanyId) {
      setPrimaryColor(brand.primaryColor);
      setAccentColor(brand.accentColor);
      setDomain(brand.domain || '');
      setIndustry(brand.industry || '');
      setKeywords(brand.keywords.join(', '));
      setTagline(brand.tagline || '');
    }
  }, [brand.primaryColor, brand.accentColor, brand.domain, brand.industry, brand.keywords, brand.tagline, propCompanyId]);

  // Track changes
  useEffect(() => {
    const primaryChanged = primaryColor !== brand.primaryColor;
    const accentChanged = accentColor !== brand.accentColor;
    const domainChanged = domain !== (brand.domain || '');
    const industryChanged = industry !== (brand.industry || '');
    const keywordsChanged = keywords !== brand.keywords.join(', ');
    const taglineChanged = tagline !== (brand.tagline || '');
    setHasChanges(primaryChanged || accentChanged || domainChanged || industryChanged || keywordsChanged || taglineChanged);
  }, [primaryColor, accentColor, domain, industry, keywords, tagline, brand]);

  // Validate and potentially swap colors before saving
  const validateAndNormalizeColors = (primary: string, accent: string): { primary: string; accent: string; wasSwapped: boolean } => {
    const primaryIsLight = isLightColor(primary);
    const accentIsLight = isLightColor(accent);
    
    // If primary is light and accent is dark, swap them
    if (primaryIsLight && !accentIsLight) {
      return { primary: accent, accent: primary, wasSwapped: true };
    }
    
    return { primary, accent, wasSwapped: false };
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error(t('brandColors.noCompany'));
      return;
    }

    setSaving(true);
    try {
      // Parse keywords from comma-separated string
      const keywordsArray = keywords
        .split(',')
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 0);

      // Validate and normalize colors
      const { primary: normalizedPrimary, accent: normalizedAccent, wasSwapped } = validateAndNormalizeColors(primaryColor, accentColor);
      
      if (wasSwapped) {
        toast.info(t('brandColors.colorsSwapped'));
        setPrimaryColor(normalizedPrimary);
        setAccentColor(normalizedAccent);
      }

      const { error } = await supabase
        .from('companies')
        .update({
          primary_color: normalizedPrimary,
          accent_color: normalizedAccent,
          domain: domain || null,
          industry: industry || null,
          brand_keywords: keywordsArray.length > 0 ? keywordsArray : null,
          tagline: tagline || null,
        })
        .eq('id', companyId);

      if (error) throw error;

      await refetchBranding();
      toast.success(t('brandColors.saved'));
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error(t('brandColors.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPrimaryColor(brand.primaryColor);
    setAccentColor(brand.accentColor);
    setDomain(brand.domain || '');
    setIndustry(brand.industry || '');
    setKeywords(brand.keywords.join(', '));
    setTagline(brand.tagline || '');
  };

  const extractColorsFromDomain = async () => {
    if (!domain) {
      toast.error(t('onboarding.enterDomainFirst'));
      return;
    }

    setExtracting(true);
    try {
      // Add timestamp to force fresh extraction
      const { data: result, error } = await supabase.functions.invoke('extract-brand-colors', {
        body: { domain, forceRefresh: Date.now() }
      });

      if (error) throw error;

      if (result?.primary_color) {
        // Always update colors when extraction succeeds
        setPrimaryColor(result.primary_color);
        setAccentColor(result.accent_color || '#22c55e');
        setHasChanges(true); // Mark as changed to enable save button
        toast.success(t('onboarding.colorsExtractedSuccess'));
      } else {
        toast.info(t('onboarding.noColorsFound'));
      }
    } catch (error) {
      console.error('Color extraction error:', error);
      toast.error(t('onboarding.colorExtractionError'));
    } finally {
      setExtracting(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t('brandColors.title')}
          </CardTitle>
          <CardDescription>
            {t('brandColors.adminOnly')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-md border shadow-sm"
                style={{ backgroundColor: brand.primaryColor }}
              />
              <span className="text-sm text-muted-foreground">{t('brandColors.primaryColor')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-md border shadow-sm"
                style={{ backgroundColor: brand.accentColor }}
              />
              <span className="text-sm text-muted-foreground">{t('brandColors.accentColor')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              {t('brandColors.customize')}
            </CardTitle>
            <CardDescription>
              {t('brandColors.description')}
            </CardDescription>
          </div>
          {domain && (
            <Button
              variant="outline"
              size="sm"
              onClick={extractColorsFromDomain}
              disabled={extracting}
              className="gap-1.5"
            >
              {extracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pipette className="h-4 w-4" />
              )}
              {extracting ? t('onboarding.extracting') : t('brandColors.extractFromWebsite')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Color */}
          <div className="space-y-3">
            <Label htmlFor="primary-color" className="text-sm font-medium">
              {t('brandColors.primaryColor')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('brandColors.primaryDesc')}
            </p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  id="primary-color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-12 cursor-pointer rounded-md border-2 border-border bg-transparent p-1"
                />
              </div>
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#1e3a5f"
                className="w-28 font-mono text-sm"
              />
              <div 
                className="w-12 h-12 rounded-md border shadow-inner flex items-center justify-center text-xs font-medium"
                style={{ 
                  backgroundColor: primaryColor,
                  color: isLightColor(primaryColor) ? '#000' : '#fff'
                }}
              >
                Aa
              </div>
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-3">
            <Label htmlFor="accent-color" className="text-sm font-medium">
              {t('brandColors.accentColor')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('brandColors.accentDesc')}
            </p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  id="accent-color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-16 h-12 cursor-pointer rounded-md border-2 border-border bg-transparent p-1"
                />
              </div>
              <Input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#2f9e8f"
                className="w-28 font-mono text-sm"
              />
              <div 
                className="w-12 h-12 rounded-md border shadow-inner flex items-center justify-center text-xs font-medium"
                style={{ 
                  backgroundColor: accentColor,
                  color: isLightColor(accentColor) ? '#000' : '#fff'
                }}
              >
                Aa
              </div>
            </div>
          </div>
        </div>

        {/* Branding Details */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="text-sm font-semibold">{t('brandColors.brandingDetails')}</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Domain */}
            <div className="space-y-2">
              <Label htmlFor="domain">{t('settings.domain')}</Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
              />
              <p className="text-xs text-muted-foreground">{t('settings.domainHint')}</p>
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <Label htmlFor="industry">{t('settings.industry')}</Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder={t('settings.industryPlaceholder')}
              />
            </div>
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label htmlFor="keywords">{t('settings.brandKeywords')}</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder={t('settings.brandKeywordsPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">{t('settings.brandKeywordsHint')}</p>
          </div>

          {/* Tagline / Slogan with Suggestions */}
          <TaglineSectionWithSuggestions 
            tagline={tagline}
            setTagline={setTagline}
            industry={industry}
            keywords={keywords}
            iconTheme={brand.iconTheme}
            companyName={brand.name}
            domain={domain}
            t={t}
          />
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-4 space-y-3">
          <Label className="text-sm font-medium">{t('brandColors.preview')}</Label>
          <div className="flex flex-wrap gap-3">
            <button
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{ 
                backgroundColor: accentColor,
                color: isLightColor(accentColor) ? '#000' : '#fff'
              }}
            >
              {t('brandColors.primaryButton')}
            </button>
            <button
              className="px-4 py-2 rounded-md text-sm font-medium border-2 transition-colors"
              style={{ 
                borderColor: accentColor,
                color: accentColor
              }}
            >
              {t('brandColors.secondaryButton')}
            </button>
            <span 
              className="text-sm underline cursor-pointer"
              style={{ color: accentColor }}
            >
              {t('brandColors.linkText')}
            </span>
          </div>
          {/* Welcome Screen Preview */}
          <div 
            className="rounded-md p-4 flex flex-col items-center justify-center text-white"
            style={{ 
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`
            }}
          >
            <span className="font-bold text-lg">{brand.name}</span>
            <span className="text-sm opacity-80">{tagline || t('brandColors.taglinePlaceholder')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('common.save')}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            {t('brandColors.reset')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Tagline Section with AI-style Suggestions
function TaglineSectionWithSuggestions({
  tagline,
  setTagline,
  industry,
  keywords,
  iconTheme,
  companyName,
  domain,
  t,
}: {
  tagline: string;
  setTagline: (value: string) => void;
  industry: string;
  keywords: string;
  iconTheme: IconTheme;
  companyName: string;
  domain: string;
  t: (key: string) => string;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get suggestions based on current industry/keywords
  const suggestions = useMemo(() => {
    const keywordsArray = keywords
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);
    return getTaglineSuggestions(industry, keywordsArray, iconTheme);
  }, [industry, keywords, iconTheme]);
  
  // Generate AI taglines
  const generateAiTaglines = useCallback(async () => {
    setIsGenerating(true);
    try {
      const keywordsArray = keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
      
      const { data, error } = await supabase.functions.invoke('generate-taglines', {
        body: {
          companyName,
          industry,
          keywords: keywordsArray,
          domain, // Pass domain for website content extraction
        },
      });
      
      if (error) throw error;
      
      if (data?.taglines && Array.isArray(data.taglines)) {
        setAiSuggestions(data.taglines);
        toast.success(t('brandColors.aiGenerated'));
      }
    } catch (error) {
      console.error('Error generating AI taglines:', error);
      toast.error(t('brandColors.aiError'));
    } finally {
      setIsGenerating(false);
    }
  }, [companyName, industry, keywords, domain, t]);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Label htmlFor="tagline" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {t('brandColors.tagline')}
        </Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateAiTaglines}
            disabled={isGenerating}
            className="h-7 gap-1.5 text-xs bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:border-primary/40"
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            {t('brandColors.generateAi')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="h-7 gap-1 text-xs"
          >
            <Lightbulb className="h-3.5 w-3.5" />
            {showSuggestions ? t('brandColors.hideSuggestions') : t('brandColors.showSuggestions')}
          </Button>
        </div>
      </div>
      
      <Input
        id="tagline"
        value={tagline}
        onChange={(e) => setTagline(e.target.value)}
        placeholder={t('brandColors.taglinePlaceholder')}
        className="font-medium"
      />
      
      {/* AI Generated Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-medium text-primary flex items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            {t('brandColors.aiSuggestionsTitle')}
          </p>
          <div className="flex flex-wrap gap-2">
            {aiSuggestions.map((suggestion, index) => (
              <Badge
                key={`ai-${index}`}
                variant={tagline === suggestion ? 'default' : 'secondary'}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200 text-xs py-1.5 px-3 bg-background/80"
                onClick={() => setTagline(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Creative Suggestions */}
      {showSuggestions && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t('brandColors.suggestionsTitle')}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 8).map((suggestion, index) => (
              <Badge
                key={index}
                variant={tagline === suggestion ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200 text-xs py-1.5 px-3"
                onClick={() => setTagline(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
          {suggestions.length > 8 && (
            <p className="text-xs text-muted-foreground">
              +{suggestions.length - 8} {t('brandColors.moreSuggestions')}
            </p>
          )}
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">{t('brandColors.taglineHint')}</p>
    </div>
  );
}

// Helper to determine if a color is light or dark
function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
