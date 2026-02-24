import { useState, useEffect } from 'react';
import { Save, AlertTriangle, Bell, Loader2 } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InventoryItem } from '@/services/dataService';

interface EditThresholdDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditThresholdDialog({ 
  item, 
  open, 
  onClose,
  onSaved 
}: EditThresholdDialogProps) {
  const { t } = useLanguage();
  const [threshold, setThreshold] = useState<string>('');
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setThreshold(item.low_stock_threshold?.toString() || '');
      setNotifyEnabled(true);
    }
  }, [item]);
  
  if (!item) return null;
  
  const isLowStock = item.low_stock_threshold && item.available <= item.low_stock_threshold;
  const newThreshold = parseInt(threshold, 10);
  const willTriggerAlert = !isNaN(newThreshold) && item.available <= newThreshold;
  
  const handleSave = async () => {
    setSaving(true);
    
    try {
      const thresholdValue = threshold === '' ? null : parseInt(threshold, 10);
      
      if (threshold !== '' && (isNaN(thresholdValue!) || thresholdValue! < 0)) {
        toast.error(t('inventory.invalidThreshold'));
        setSaving(false);
        return;
      }
      
      const { error } = await supabase
        .from('inventory')
        .update({ 
          low_stock_threshold: thresholdValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
        
      if (error) throw error;
      
      toast.success(t('inventory.thresholdUpdated'));
      
      // If notification enabled and threshold is being set below current stock, send immediate notification
      if (notifyEnabled && thresholdValue && item.available <= thresholdValue) {
        try {
          await supabase.functions.invoke('send-low-stock-alert', {
            body: {
              inventoryId: item.id,
              sku: item.sku,
              name: item.name,
              available: item.available,
              threshold: thresholdValue,
              companyId: item.company_id
            }
          });
        } catch (notifyError) {
          console.error('Failed to send notification:', notifyError);
        }
      }
      
      onSaved?.();
      onClose();
    } catch (error) {
      console.error('Failed to update threshold:', error);
      toast.error(t('inventory.thresholdError'));
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-status-warning" />
            {t('inventory.editThreshold')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Item Info */}
          <div className="rounded-lg border border-border bg-secondary/30 p-4">
            <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono text-foreground">
              {item.sku}
            </code>
            <p className="mt-2 font-medium text-foreground">{item.name}</p>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('inventory.available')}:</span>
                <span className={cn(
                  "ml-1 font-semibold tabular-nums",
                  isLowStock ? "text-status-exception" : "text-status-shipped"
                )}>
                  {item.available}
                </span>
              </div>
              {item.low_stock_threshold && (
                <div>
                  <span className="text-muted-foreground">{t('inventory.currentThreshold')}:</span>
                  <span className="ml-1 font-semibold tabular-nums text-foreground">
                    {item.low_stock_threshold}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Threshold Input */}
          <div className="space-y-2">
            <Label htmlFor="threshold" className="text-foreground">
              {t('inventory.minimumStock')}
            </Label>
            <div className="relative">
              <Input
                id="threshold"
                type="number"
                min="0"
                placeholder={t('inventory.thresholdPlaceholder')}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className={cn(
                  "pr-16",
                  willTriggerAlert && "border-status-warning focus-visible:ring-status-warning"
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {t('inventory.pieces')}
              </span>
            </div>
            
            {/* Warning Preview */}
            {willTriggerAlert && (
              <div className="flex items-center gap-2 rounded-lg bg-status-warning/10 border border-status-warning/30 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-status-warning shrink-0" />
                <span className="text-status-warning">
                  {t('inventory.willTriggerAlert')}
                </span>
              </div>
            )}
          </div>
          
          {/* Notification Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                <Bell className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">{t('inventory.notifyOnLowStock')}</p>
                <p className="text-sm text-muted-foreground">{t('inventory.notifyDescription')}</p>
              </div>
            </div>
            <Switch
              checked={notifyEnabled}
              onCheckedChange={setNotifyEnabled}
            />
          </div>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
