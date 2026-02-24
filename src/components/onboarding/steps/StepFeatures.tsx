import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { 
  Package, 
  PackageOpen, 
  Warehouse, 
  RotateCcw, 
  AlertTriangle, 
  ShieldCheck, 
  PackageCheck, 
  Users, 
  Brain, 
  Lightbulb,
  CheckCircle2,
  Loader2
} from '@/components/icons';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StepFeaturesProps {
  companyId: string;
  companyName: string;
}

interface NavigationFeature {
  key: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

// Predefined templates
const TEMPLATES = {
  orders_focused: {
    name: 'Auftrags-fokussiert',
    description: 'Ideal für Kunden, die primär Bestellungen verfolgen möchten',
    features: ['nav_orders', 'nav_returns', 'nav_customers'],
  },
  inventory_focused: {
    name: 'Lager-fokussiert',
    description: 'Für Kunden mit Fokus auf Lagerbestände und Wareneingang',
    features: ['nav_orders', 'nav_inbound', 'nav_inventory', 'nav_returns'],
  },
  full_access: {
    name: 'Vollzugriff',
    description: 'Alle Funktionen aktiviert',
    features: ['nav_orders', 'nav_inbound', 'nav_inventory', 'nav_returns', 'nav_clarification', 'nav_quality', 'nav_packaging', 'nav_customers', 'nav_ai_hub', 'nav_intelligence'],
  },
  minimal: {
    name: 'Minimal',
    description: 'Nur die wichtigsten Grundfunktionen',
    features: ['nav_orders', 'nav_returns'],
  },
};

const DEFAULT_NAV_FEATURES: NavigationFeature[] = [
  { key: 'nav_orders', name: 'Aufträge', description: 'Auftragsübersicht und -details', icon: Package, enabled: true },
  { key: 'nav_inbound', name: 'Wareneingang', description: 'Wareneingang und Bestellungen', icon: PackageOpen, enabled: false },
  { key: 'nav_inventory', name: 'Lager', description: 'Lagerbestände und Artikel', icon: Warehouse, enabled: false },
  { key: 'nav_returns', name: 'Retouren', description: 'Retouren verwalten', icon: RotateCcw, enabled: true },
  { key: 'nav_clarification', name: 'Klärfälle', description: 'Problemfälle mit KI lösen', icon: AlertTriangle, enabled: false },
  { key: 'nav_quality', name: 'Qualität', description: 'Qualitätsanalysen', icon: ShieldCheck, enabled: false },
  { key: 'nav_packaging', name: 'Verpackung', description: 'Verpackungsoptimierung', icon: PackageCheck, enabled: false },
  { key: 'nav_customers', name: 'Kunden', description: 'Kundendaten einsehen', icon: Users, enabled: false },
  { key: 'nav_ai_hub', name: 'AI Hub', description: 'KI-gestützte Analysen', icon: Brain, enabled: false },
  { key: 'nav_intelligence', name: 'Intelligence', description: 'ABC-Analyse, Aging, Prognosen', icon: Lightbulb, enabled: false },
];

export function StepFeatures({ companyId }: StepFeaturesProps) {
  const [features, setFeatures] = useState<NavigationFeature[]>(DEFAULT_NAV_FEATURES);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing features for this company
  useEffect(() => {
    if (companyId) {
      loadFeatures();
    } else {
      setIsLoading(false);
    }
  }, [companyId]);

  const loadFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_toggles')
        .select('feature_key, is_enabled')
        .eq('company_id', companyId)
        .like('feature_key', 'nav_%');

      if (error) throw error;

      if (data && data.length > 0) {
        // Update features with DB values
        setFeatures(prev => prev.map(f => {
          const dbFeature = data.find(d => d.feature_key === f.key);
          return dbFeature ? { ...f, enabled: dbFeature.is_enabled } : f;
        }));
      }
    } catch (error) {
      console.error('Error loading features:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTemplate = (templateKey: string) => {
    const template = TEMPLATES[templateKey as keyof typeof TEMPLATES];
    if (template) {
      setFeatures(prev => prev.map(f => ({
        ...f,
        enabled: template.features.includes(f.key),
      })));
      setSelectedTemplate(templateKey);
    }
  };

  const toggleFeature = (key: string) => {
    setFeatures(prev => prev.map(f => 
      f.key === key ? { ...f, enabled: !f.enabled } : f
    ));
    setSelectedTemplate(null); // Clear template selection when manually changing
  };

  const saveFeatures = async () => {
    if (!companyId) {
      toast.error('Bitte zuerst die Firmendaten speichern');
      return;
    }

    setIsSaving(true);
    try {
      // Prepare all navigation features for upsert
      const featuresToUpsert = features.map(f => ({
        company_id: companyId,
        feature_key: f.key,
        feature_name: f.name,
        description: f.description,
        is_enabled: f.enabled,
      }));

      // Delete existing nav features first, then insert new ones
      await supabase
        .from('feature_toggles')
        .delete()
        .eq('company_id', companyId)
        .like('feature_key', 'nav_%');

      const { error } = await supabase
        .from('feature_toggles')
        .insert(featuresToUpsert);

      if (error) throw error;

      toast.success('Navigation-Features gespeichert');
    } catch (error) {
      console.error('Error saving features:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const enabledCount = features.filter(f => f.enabled).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Templates */}
      <div>
        <h4 className="font-medium mb-3">Schnellauswahl (Vorlagen)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(TEMPLATES).map(([key, template]) => (
            <button
              key={key}
              onClick={() => applyTemplate(key)}
              className={cn(
                'p-3 rounded-lg border text-left transition-all hover:border-primary/50',
                selectedTemplate === key 
                  ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                  : 'border-border'
              )}
            >
              <div className="font-medium text-sm">{template.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
              <Badge variant="secondary" className="mt-2 text-xs">
                {template.features.length} Features
              </Badge>
            </button>
          ))}
        </div>
      </div>

      {/* Individual Features */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">Navigation-Menüpunkte</h4>
          <Badge variant="outline">
            {enabledCount} / {features.length} aktiv
          </Badge>
        </div>
        
        <div className="grid gap-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.key}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors',
                  feature.enabled ? 'border-primary/30 bg-primary/5' : 'border-border'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    feature.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{feature.name}</span>
                      {feature.enabled && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{feature.description}</span>
                  </div>
                </div>
                <Switch
                  checked={feature.enabled}
                  onCheckedChange={() => toggleFeature(feature.key)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      {companyId && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={saveFeatures} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Speichern...
              </>
            ) : (
              'Features speichern'
            )}
          </Button>
        </div>
      )}

      {!companyId && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          Speichere zuerst die Firmendaten im ersten Schritt, um die Features zu aktivieren.
        </div>
      )}
    </div>
  );
}
