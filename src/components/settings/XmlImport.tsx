import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImportResult {
  success: boolean;
  message: string;
  results?: {
    imported: number;
    updated: number;
    linesInserted: number;
    errors: { orderNo: string; error: string }[];
  };
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function XmlImport() {
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [results, setResults] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Accept .xml files OR files that contain XML content (for files without extension)
    const isXmlExtension = file.name.toLowerCase().endsWith('.xml');
    const isLikelyXmlByName = file.name.toLowerCase().includes('orderstate') || 
                              file.name.toLowerCase().includes('productstock') ||
                              file.name.toLowerCase().includes('_order') ||
                              file.type === 'text/xml' ||
                              file.type === 'application/xml';
    
    if (!isXmlExtension && !isLikelyXmlByName) {
      toast.error(t('xmlImport.onlyXml'));
      return;
    }

    setIsUploading(true);
    setResults(null);

    try {
      const xmlContent = await file.text();
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/xml-import-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: xmlContent,
      });

      const result: ImportResult = await response.json();
      setResults(result);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message || t('xmlImport.importFailed'));
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(t('xmlImport.importError'));
      setResults({
        success: false,
        message: error instanceof Error ? error.message : t('chatbot.unknownError'),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearResults = () => setResults(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {t('xmlImport.title')}
        </CardTitle>
        <CardDescription>
          {t('xmlImport.desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Zone */}
        <div
          className={cn(
            'relative rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
            dragActive
              ? 'border-accent bg-accent/5'
              : 'border-border hover:border-accent/50 hover:bg-muted/50',
            isUploading && 'pointer-events-none opacity-50'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            {isUploading ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-accent" />
                <p className="font-medium text-foreground">{t('xmlImport.importing')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('xmlImport.pleaseWait')}
                </p>
              </>
            ) : (
              <>
                <FileText className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium text-foreground">
                  {t('xmlImport.dropzone')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('xmlImport.supportedFormat')}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Results */}
        {results && (
          <div
            className={cn(
              'rounded-lg border p-4',
              results.success
                ? 'border-status-shipped/30 bg-status-shipped/5'
                : 'border-destructive/30 bg-destructive/5'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {results.success ? (
                  <CheckCircle className="h-5 w-5 text-status-shipped mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-medium text-foreground">{results.message}</p>
                  {results.results && (
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <p>• {results.results.imported} {t('xmlImport.newOrders')}</p>
                      <p>• {results.results.updated} {t('xmlImport.updatedOrders')}</p>
                      <p>• {results.results.linesInserted} {t('xmlImport.orderLines')}</p>
                      {results.results.errors.length > 0 && (
                        <p className="text-destructive">
                          • {results.results.errors.length} {t('common.error')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={clearResults}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-2">{t('xmlImport.supportedFormatsTitle')}:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{t('xmlImport.format1')}</li>
            <li>{t('xmlImport.format2')}</li>
            <li>{t('xmlImport.format3')}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}