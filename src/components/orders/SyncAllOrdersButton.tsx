import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SyncAllOrdersButtonProps {
  onSuccess?: () => void;
}

interface SyncResult {
  totalOrders: number;
  updatedOrders: number;
  errors: number;
}

export function SyncAllOrdersButton({ onSuccess }: SyncAllOrdersButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const { t } = useLanguage();

  const handleSync = async () => {
    setIsSyncing(true);
    setShowDialog(true);
    setProgress(0);
    setSyncResult(null);
    
    // Simulate progress while waiting for API (max 10 orders, ~10s timeout)
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 1000);
    
    // Set a timeout to prevent endless spinning
    const timeoutId = setTimeout(() => {
      clearInterval(progressInterval);
      setIsSyncing(false);
      setProgress(0);
      setSyncResult({ totalOrders: 0, updatedOrders: 0, errors: 1 });
      toast.error('Sync Timeout - bitte später erneut versuchen');
    }, 30000);
    
    try {
      const { data, error } = await supabase.functions.invoke('ms-order-state-sync', {
        method: 'POST',
      });

      clearInterval(progressInterval);
      clearTimeout(timeoutId);

      if (error) {
        throw error;
      }

      if (data?.success) {
        const { totalOrders, updatedOrders, errors } = data;
        
        setProgress(100);
        setSyncResult({ totalOrders, updatedOrders, errors });
        
        if (updatedOrders > 0) {
          toast.success(
            t('orders.syncSuccess') || `${updatedOrders} von ${totalOrders} Aufträgen aktualisiert`
          );
        } else if (totalOrders === 0) {
          toast.info(t('orders.noOrdersToSync') || 'Keine Aufträge zum Synchronisieren gefunden');
        } else {
          toast.info(t('orders.noUpdatesNeeded') || 'Alle Aufträge sind bereits aktuell');
        }
        
        if (errors > 0) {
          toast.warning(`${errors} Fehler bei der Synchronisierung`);
        }
        
        onSuccess?.();
      } else {
        setSyncResult({ totalOrders: 0, updatedOrders: 0, errors: 1 });
        toast.error(data?.error || t('orders.syncError') || 'Synchronisierung fehlgeschlagen');
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('Sync error:', error);
      setSyncResult({ totalOrders: 0, updatedOrders: 0, errors: 1 });
      toast.error(error.message || t('orders.syncError') || 'Synchronisierung fehlgeschlagen');
    } finally {
      clearTimeout(timeoutId);
      setIsSyncing(false);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setProgress(0);
    setSyncResult(null);
  };

  return (
    <>
      <Button
        variant="outline"
        className="gap-2 shrink-0"
        onClick={handleSync}
        disabled={isSyncing}
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">
          {isSyncing ? (t('orders.syncing') || 'Synchronisiere...') : (t('orders.syncAll') || 'Alle synchronisieren')}
        </span>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isSyncing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  Synchronisiere Bestellungen...
                </>
              ) : syncResult?.errors === 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Synchronisierung abgeschlossen
                </>
              ) : syncResult ? (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Synchronisierung abgeschlossen
                </>
              ) : null}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Progress value={progress} className="h-2" />
            
            <div className="text-sm text-muted-foreground text-center">
              {isSyncing ? (
                <span>Bitte warten... ({Math.round(progress)}%)</span>
              ) : syncResult ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-foreground">{syncResult.totalOrders}</div>
                      <div className="text-xs text-muted-foreground">Geprüft</div>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <div className="text-2xl font-bold text-green-600">{syncResult.updatedOrders}</div>
                      <div className="text-xs text-muted-foreground">Aktualisiert</div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10">
                      <div className="text-2xl font-bold text-amber-600">{syncResult.errors}</div>
                      <div className="text-xs text-muted-foreground">Fehler</div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={handleCloseDialog}
                  >
                    Schließen
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}