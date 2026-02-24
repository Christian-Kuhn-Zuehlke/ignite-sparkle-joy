import { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SyncInventoryButtonProps {
  companyId: string;
  onSuccess?: () => void;
}

interface SyncResult {
  totalItems: number;
  insertedItems: number;
  updatedItems: number;
  errors: number;
  errorMessage?: string;
}

export function SyncInventoryButton({ companyId, onSuccess }: SyncInventoryButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    if (!companyId || companyId === 'ALL') {
      toast.error('Bitte wählen Sie eine Firma aus');
      return;
    }

    setIsSyncing(true);
    setShowDialog(true);
    setProgress(0);
    setSyncResult(null);
    
    // Simulate progress while waiting for API
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 12;
      });
    }, 800);
    
    // Set a timeout to prevent endless spinning
    const timeoutId = setTimeout(() => {
      clearInterval(progressInterval);
      setIsSyncing(false);
      setProgress(0);
      setSyncResult({ 
        totalItems: 0, 
        insertedItems: 0, 
        updatedItems: 0, 
        errors: 1,
        errorMessage: 'Zeitüberschreitung - bitte später erneut versuchen'
      });
    }, 30000);
    
    try {
      const { data, error } = await supabase.functions.invoke('ms-product-stock', {
        body: { companyId, syncToDatabase: true }
      });

      clearInterval(progressInterval);
      clearTimeout(timeoutId);

      if (error) {
        throw error;
      }

      if (data?.error) {
        setProgress(100);
        setSyncResult({ 
          totalItems: 0, 
          insertedItems: 0, 
          updatedItems: 0, 
          errors: 1,
          errorMessage: data.errorMessage || data.error
        });
        return;
      }

      const { syncResult: result, count } = data;
      
      setProgress(100);
      setSyncResult({ 
        totalItems: count || 0, 
        insertedItems: result?.inserted || 0, 
        updatedItems: result?.updated || 0, 
        errors: 0 
      });
      
      const totalChanges = (result?.inserted || 0) + (result?.updated || 0);
      if (totalChanges > 0) {
        toast.success(
          `${count} Artikel synchronisiert: ${result?.inserted || 0} neu, ${result?.updated || 0} aktualisiert`
        );
      } else if (count > 0) {
        toast.info('Alle Bestände sind bereits aktuell');
      } else {
        toast.info('Keine Artikel zum Synchronisieren gefunden');
      }
      
      onSuccess?.();
    } catch (error: any) {
      clearInterval(progressInterval);
      clearTimeout(timeoutId);
      console.error('Inventory sync error:', error);
      
      setProgress(100);
      setSyncResult({ 
        totalItems: 0, 
        insertedItems: 0, 
        updatedItems: 0, 
        errors: 1,
        errorMessage: error.message || 'Synchronisierung fehlgeschlagen'
      });
    } finally {
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
          {isSyncing ? 'Synchronisiere...' : 'Bestände synchronisieren'}
        </span>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isSyncing ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  Synchronisiere Bestände...
                </>
              ) : syncResult?.errors === 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Synchronisierung abgeschlossen
                </>
              ) : syncResult ? (
                <>
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Synchronisierung fehlgeschlagen
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
                  {syncResult.errors > 0 && syncResult.errorMessage ? (
                    <div className="p-4 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      <p className="font-medium mb-1">Fehler bei der Synchronisierung</p>
                      <p className="text-xs">{syncResult.errorMessage}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-foreground">{syncResult.totalItems}</div>
                        <div className="text-xs text-muted-foreground">Artikel</div>
                      </div>
                      <div className="p-3 rounded-lg bg-green-500/10">
                        <div className="text-2xl font-bold text-green-600">{syncResult.insertedItems}</div>
                        <div className="text-xs text-muted-foreground">Neu</div>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-500/10">
                        <div className="text-2xl font-bold text-blue-600">{syncResult.updatedItems}</div>
                        <div className="text-xs text-muted-foreground">Aktualisiert</div>
                      </div>
                    </div>
                  )}
                  
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
