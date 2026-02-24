import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fetchWithTimeout } from '@/lib/apiClient';

interface ImportResult {
  success: boolean;
  message: string;
  results?: {
    imported: number;
    updated: number;
    lowStockAlerts: number;
    errors: { sku: string; error: string }[];
  };
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function MobileInventoryUpload() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xml')) {
      toast.error(t('inventoryImport.xmlOnly'));
      return;
    }

    setIsUploading(true);
    setResults(null);

    try {
      const xmlContent = await file.text();
      
      const response = await fetchWithTimeout(
        `${SUPABASE_URL}/functions/v1/inventory-import-bulk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml',
          },
          body: xmlContent,
        },
        60000 // 60 second timeout for larger files
      );

      const result: ImportResult = await response.json();
      setResults(result);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || t('inventoryImport.importFailed'));
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(t('inventoryImport.importError'));
      setResults({
        success: false,
        message: error instanceof Error ? error.message : t('common.error'),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearResults = () => setResults(null);

  const handleClose = () => {
    setIsOpen(false);
    // Reset state when closing
    setTimeout(() => {
      setResults(null);
    }, 300);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">{t('inventoryImport.upload')}</span>
          <span className="sm:hidden">{t('inventoryImport.uploadShort')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent" />
            {t('inventoryImport.title')}
          </SheetTitle>
          <SheetDescription>
            {t('inventoryImport.description')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Upload Button */}
          <div className="flex flex-col items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              onChange={handleChange}
              className="hidden"
              id="mobile-inventory-upload"
            />
            
            <Button
              size="lg"
              className="w-full h-16 text-lg gap-3"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  {t('inventoryImport.importing')}
                </>
              ) : (
                <>
                  <FileText className="h-6 w-6" />
                  {t('inventoryImport.selectFile')}
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              {t('inventoryImport.supported')}
            </p>
          </div>

          {/* Results */}
          {results && (
            <div
              className={cn(
                'rounded-lg border p-4 animate-fade-in',
                results.success
                  ? 'border-status-shipped/30 bg-status-shipped/5'
                  : 'border-destructive/30 bg-destructive/5'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {results.success ? (
                    <CheckCircle className="h-5 w-5 text-status-shipped mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{results.message}</p>
                    {results.results && (
                      <div className="text-sm text-muted-foreground space-y-0.5">
                        <p>• {results.results.imported} {t('inventoryImport.newImported')}</p>
                        <p>• {results.results.updated} {t('inventoryImport.existingUpdated')}</p>
                        {results.results.lowStockAlerts > 0 && (
                          <p className="text-amber-600">
                            • {results.results.lowStockAlerts} {t('inventoryImport.lowStockWarnings')}
                          </p>
                        )}
                        {results.results.errors.length > 0 && (
                          <p className="text-destructive">
                            • {results.results.errors.length} {t('inventoryImport.errors')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={clearResults}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Quick Info */}
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">{t('inventoryImport.supportedFormats')}</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>{t('inventoryImport.bcInventory')}</li>
              <li>{t('inventoryImport.autoDetect')}</li>
            </ul>
          </div>

          {/* Close Button */}
          <Button variant="outline" className="w-full" onClick={handleClose}>
            {t('common.close')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
