import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X, Package, ShoppingCart, RotateCcw, Layers, Clock, SkipForward, Play, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Component to show elapsed time in real-time
function ElapsedTime({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  if (minutes > 0) {
    return <span className="tabular-nums">{minutes}m {seconds}s</span>;
  }
  return <span className="tabular-nums">{seconds}s</span>;
}

interface ImportResult {
  success: boolean;
  message: string;
  detectedType: 'orders' | 'inventory' | 'returns' | 'mixed' | 'unknown';
  counts?: {
    orders: number;
    inventory: number;
    returns: number;
  };
  results?: {
    orders: { imported: number; updated: number; errors: { id: string; error: string }[] };
    inventory: { imported: number; updated: number; lowStockAlerts: number; errors: { sku: string; error: string }[] };
    returns: { imported: number; updated: number; errors: { id: string; error: string }[] };
  };
}

interface ProgressUpdate {
  phase: 'detecting' | 'parsing' | 'importing' | 'complete';
  progress: number;
  current: number;
  total: number;
  message: string;
}

interface QueueItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  progress: number;
  result?: ImportResult;
  error?: string;
  currentPhase?: string;
  phaseMessage?: string;
  startedAt?: number;
  recordsProcessed?: number;
  recordsTotal?: number;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB

const dataTypeConfig = {
  orders: { icon: ShoppingCart, label: 'universalImport.orders', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  inventory: { icon: Package, label: 'universalImport.inventory', color: 'text-green-500', bg: 'bg-green-500/10' },
  returns: { icon: RotateCcw, label: 'universalImport.returns', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  mixed: { icon: Layers, label: 'universalImport.mixed', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  unknown: { icon: FileText, label: 'universalImport.unknown', color: 'text-muted-foreground', bg: 'bg-muted' },
};

interface UniversalDataImportProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function UniversalDataImport({ variant = 'default', className }: UniversalDataImportProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const shouldCancelRef = useRef(false);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [showScrollToCurrentButton, setShowScrollToCurrentButton] = useState(false);

  const handleStreamingUpload = useCallback(async (
    content: string, 
    contentType: string,
    onProgress: (progress: ProgressUpdate) => void
  ) => {
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/universal-import`, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'Accept': 'text/event-stream',
        },
        body: content,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        try {
          const errorResult = await response.json();
          return errorResult as ImportResult;
        } catch {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.complete) {
                return data as ImportResult;
              }
              
              if (data.phase) {
                onProgress(data as ProgressUpdate);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }

      throw new Error('Die Datei ist zu gross für eine einzelne Verarbeitung. Bitte teilen Sie die Datei in kleinere Teile auf (max. ~3000 Orders pro Datei).');
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw error;
        }
        if (error.message === 'Load failed' || error.message.includes('network')) {
          throw new Error('Netzwerkfehler: Die Verbindung zum Server wurde unterbrochen. Bitte versuchen Sie es erneut.');
        }
        if (error.message.includes('Stream ended') || error.message.includes('zu gross')) {
          throw error;
        }
      }
      throw error;
    }
  }, []);

  const handleStandardUpload = useCallback(async (
    content: string, 
    contentType: string,
    onProgress: (progress: ProgressUpdate) => void
  ) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    
    try {
      onProgress({
        phase: 'parsing',
        progress: 40,
        current: 0,
        total: 0,
        message: t('universalImport.sendingToServer') || 'Sende an Server...',
      });

      const response = await fetch(`${SUPABASE_URL}/functions/v1/universal-import`, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
        },
        body: content,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      const result = await response.json() as ImportResult;
      
      if (!response.ok && !result.message) {
        result.message = `Server error: ${response.status}`;
        result.success = false;
      }
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Timeout: Die Verarbeitung hat zu lange gedauert.');
        }
        if (error.message === 'Load failed' || error.message.includes('network')) {
          throw new Error('Netzwerkfehler: Die Verbindung zum Server wurde unterbrochen.');
        }
      }
      throw error;
    }
  }, [t]);

  const detectContentType = async (file: File): Promise<string | null> => {
    const isXmlByName = file.name.endsWith('.xml');
    const isJsonByName = file.name.endsWith('.json');
    
    if (isJsonByName) return 'application/json';
    if (isXmlByName) return 'application/xml';
    
    const firstBytes = await file.slice(0, 500).text();
    const trimmedBytes = firstBytes.trim();
    const isXmlByContent = 
      trimmedBytes.startsWith('<?xml') || 
      trimmedBytes.includes('<WSIFOrdRespEshop>') || 
      trimmedBytes.includes('<soap:') || 
      trimmedBytes.includes('<Soap:') ||
      trimmedBytes.includes('<soap:Envelope') ||
      trimmedBytes.includes('<Soap:Envelope') ||
      trimmedBytes.includes('xmlns:soap') ||
      trimmedBytes.includes('xmlns:Soap') ||
      trimmedBytes.includes('<ReadMultiple_Result>');
    const isJsonByContent = trimmedBytes.startsWith('{') || trimmedBytes.startsWith('[');
    
    if (isJsonByContent) return 'application/json';
    if (isXmlByContent) return 'application/xml';
    
    return null;
  };

  const getPhaseLabel = (phase: string): string => {
    switch (phase) {
      case 'detecting': return 'Erkennung...';
      case 'parsing': return 'Parsing...';
      case 'importing': return 'Importiere...';
      case 'complete': return 'Fertig';
      default: return phase;
    }
  };

  const processFile = async (queueItem: QueueItem, index: number): Promise<ImportResult> => {
    const updateQueueItem = (updates: Partial<QueueItem>) => {
      setQueue(prev => prev.map((item, i) => 
        i === index ? { ...item, ...updates } : item
      ));
    };

    updateQueueItem({ 
      status: 'processing', 
      progress: 5, 
      currentPhase: 'detecting',
      phaseMessage: 'Dateityp erkennen...',
      startedAt: Date.now(),
      recordsProcessed: 0,
      recordsTotal: 0
    });

    const contentType = await detectContentType(queueItem.file);
    if (!contentType) {
      throw new Error('Nur XML oder JSON Dateien werden unterstützt');
    }

    updateQueueItem({ 
      progress: 15, 
      currentPhase: 'parsing',
      phaseMessage: 'Datei wird gelesen...'
    });

    const fileContent = await queueItem.file.text();
    const isLargeFile = fileContent.length > LARGE_FILE_THRESHOLD;
    const fileSizeMB = (fileContent.length / (1024 * 1024)).toFixed(2);

    updateQueueItem({ 
      progress: 25, 
      phaseMessage: `Datei gelesen (${fileSizeMB} MB)...`
    });

    const onProgress = (progress: ProgressUpdate) => {
      updateQueueItem({ 
        progress: Math.min(25 + progress.progress * 0.65, 90),
        currentPhase: progress.phase,
        phaseMessage: progress.message || getPhaseLabel(progress.phase),
        recordsProcessed: progress.current,
        recordsTotal: progress.total
      });
    };

    updateQueueItem({ 
      progress: 30, 
      currentPhase: 'importing',
      phaseMessage: 'Sende an Server...'
    });

    let result: ImportResult;
    
    if (isLargeFile) {
      result = await handleStreamingUpload(fileContent, contentType, onProgress);
    } else {
      result = await handleStandardUpload(fileContent, contentType, onProgress);
    }

    return result;
  };

  const processQueue = async () => {
    if (queue.length === 0) return;

    setIsProcessing(true);
    shouldCancelRef.current = false;

    let completedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < queue.length; i++) {
      if (shouldCancelRef.current) {
        // Mark remaining as skipped
        setQueue(prev => prev.map((item, idx) => 
          idx >= i ? { ...item, status: 'skipped' } : item
        ));
        skippedCount = queue.length - i;
        break;
      }

      setCurrentFileIndex(i);

      try {
        const result = await processFile(queue[i], i);
        
        setQueue(prev => prev.map((item, idx) => 
          idx === i ? { 
            ...item, 
            status: result.success ? 'completed' : 'failed',
            progress: 100,
            result,
            error: result.success ? undefined : result.message
          } : item
        ));

        if (result.success) {
          completedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        
        setQueue(prev => prev.map((item, idx) => 
          idx === i ? { 
            ...item, 
            status: 'failed',
            progress: 100,
            error: errorMessage
          } : item
        ));
        
        failedCount++;
      }

      // Small delay between files
      if (i < queue.length - 1 && !shouldCancelRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setIsProcessing(false);
    setCurrentFileIndex(-1);
    abortControllerRef.current = null;

    // Show summary toast
    if (completedCount > 0 || failedCount > 0) {
      if (failedCount === 0 && skippedCount === 0) {
        toast.success(`${completedCount} Dateien erfolgreich importiert`);
      } else {
        toast.info(`Import abgeschlossen: ${completedCount} erfolgreich, ${failedCount} fehlgeschlagen, ${skippedCount} übersprungen`);
      }
    }
  };

  const handleFilesSelected = (files: FileList) => {
    const newItems: QueueItem[] = Array.from(files).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      status: 'pending' as const,
      progress: 0,
    }));

    setQueue(prev => [...prev, ...newItems]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const clearQueue = () => {
    if (!isProcessing) {
      setQueue([]);
    }
  };

  const cancelProcessing = () => {
    shouldCancelRef.current = true;
    abortControllerRef.current?.abort();
  };

  const handleClose = () => {
    setIsOpen(false);
    if (!isProcessing) {
      setTimeout(() => {
        setQueue([]);
        setCurrentFileIndex(-1);
      }, 300);
    }
  };

  const pendingCount = queue.filter(q => q.status === 'pending').length;
  const completedCount = queue.filter(q => q.status === 'completed').length;
  const failedCount = queue.filter(q => q.status === 'failed').length;

  // Auto-scroll to current processing item
  useEffect(() => {
    if (isAutoScrollEnabled && currentFileIndex >= 0 && queue[currentFileIndex]) {
      const currentItem = queue[currentFileIndex];
      const element = itemRefs.current.get(currentItem.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentFileIndex, isAutoScrollEnabled, queue]);

  // Detect if user has scrolled away from current item
  const handleScroll = useCallback(() => {
    if (!isProcessing || currentFileIndex < 0) {
      setShowScrollToCurrentButton(false);
      return;
    }
    
    const currentItem = queue[currentFileIndex];
    if (!currentItem) return;
    
    const element = itemRefs.current.get(currentItem.id);
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    
    if (element && scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      // Check if element is visible in the viewport
      const isVisible = elementRect.top >= containerRect.top && 
                       elementRect.bottom <= containerRect.bottom;
      
      setShowScrollToCurrentButton(!isVisible);
      if (!isVisible) {
        setIsAutoScrollEnabled(false);
      }
    }
  }, [isProcessing, currentFileIndex, queue]);

  const scrollToCurrentItem = useCallback(() => {
    if (currentFileIndex >= 0 && queue[currentFileIndex]) {
      const currentItem = queue[currentFileIndex];
      const element = itemRefs.current.get(currentItem.id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setShowScrollToCurrentButton(false);
        setIsAutoScrollEnabled(true);
      }
    }
  }, [currentFileIndex, queue]);

  const getStatusIcon = (status: QueueItem['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-accent animate-spin" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-status-shipped" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'skipped': return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };

  const getResultSummary = (result?: ImportResult): string | null => {
    if (!result?.results) return null;
    
    const parts: string[] = [];
    const { orders, inventory, returns } = result.results;
    
    if (orders.imported + orders.updated > 0) {
      parts.push(`${orders.imported + orders.updated} Orders`);
    }
    if (inventory.imported + inventory.updated > 0) {
      parts.push(`${inventory.imported + inventory.updated} Artikel`);
    }
    if (returns.imported + returns.updated > 0) {
      parts.push(`${returns.imported + returns.updated} Retouren`);
    }
    
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {variant === 'compact' ? (
          <Button variant="outline" size="icon" className={className} title={t('universalImport.title')}>
            <Upload className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className={cn("gap-2", className)}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">{t('universalImport.import')}</span>
            <span className="sm:hidden">{t('universalImport.importShort')}</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-2xl overflow-hidden flex flex-col">
        <SheetHeader className="text-left shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent" />
            {t('universalImport.title')}
            {queue.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {queue.length} {queue.length === 1 ? 'Datei' : 'Dateien'}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {queue.length === 0 
              ? t('universalImport.description') 
              : 'Wählen Sie weitere Dateien aus oder starten Sie den Import'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 flex-1 flex flex-col min-h-0">
          {/* Data Types Preview - only show when queue is empty */}
          {queue.length === 0 && (
            <div className="grid grid-cols-3 gap-2 shrink-0">
              {(['orders', 'inventory', 'returns'] as const).map((type) => {
                const config = dataTypeConfig[type];
                const Icon = config.icon;
                return (
                  <div key={type} className={cn("flex flex-col items-center gap-1 p-3 rounded-lg", config.bg)}>
                    <Icon className={cn("h-5 w-5", config.color)} />
                    <span className="text-xs text-center font-medium">{t(config.label)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* File Selection */}
          <div className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleChange}
              className="hidden"
              id="universal-data-upload"
              multiple
            />
            
            <Button
              variant={queue.length > 0 ? "outline" : "default"}
              size={queue.length > 0 ? "default" : "lg"}
              className={cn(
                queue.length > 0 ? "w-full" : "w-full h-16 text-lg gap-3"
              )}
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <FileText className={queue.length > 0 ? "h-4 w-4" : "h-6 w-6"} />
              {queue.length > 0 ? 'Weitere Dateien hinzufügen' : t('universalImport.selectFile')}
            </Button>

            {queue.length === 0 && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Sie können mehrere Dateien gleichzeitig auswählen
              </p>
            )}
          </div>

          {/* Queue List */}
          {queue.length > 0 && (
            <div className="flex-1 min-h-0 flex flex-col relative">
              {/* Queue Header */}
              <div className="flex items-center justify-between mb-2 shrink-0">
                <div className="flex items-center gap-3 text-sm">
                  {completedCount > 0 && (
                    <span className="text-status-shipped">✓ {completedCount}</span>
                  )}
                  {failedCount > 0 && (
                    <span className="text-destructive">✗ {failedCount}</span>
                  )}
                  {pendingCount > 0 && (
                    <span className="text-muted-foreground">⏳ {pendingCount}</span>
                  )}
                </div>
                {!isProcessing && queue.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearQueue}>
                    Alle entfernen
                  </Button>
                )}
              </div>

              {/* Scrollable Queue */}
              <ScrollArea 
                ref={scrollAreaRef} 
                className="flex-1 -mx-6 px-6"
                onScrollCapture={handleScroll}
              >
                <div className="space-y-2 pb-2">
                  {queue.map((item, index) => (
                    <div 
                      key={item.id}
                      ref={(el) => {
                        if (el) {
                          itemRefs.current.set(item.id, el);
                        } else {
                          itemRefs.current.delete(item.id);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all duration-300",
                        item.status === 'processing' && "bg-accent/10 border-accent ring-2 ring-accent/30 shadow-md",
                        item.status === 'completed' && "bg-status-shipped/5 border-status-shipped/30",
                        item.status === 'failed' && "bg-destructive/5 border-destructive/30",
                        item.status === 'pending' && "bg-muted/50 border-border",
                        item.status === 'skipped' && "bg-muted/30 opacity-60"
                      )}
                    >
                      {/* Status Icon */}
                      <div className="shrink-0">
                        {getStatusIcon(item.status)}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-sm font-medium truncate",
                            item.status === 'processing' && "text-accent-foreground font-semibold"
                          )}>
                            {item.file.name}
                          </span>
                          {item.status === 'processing' && currentFileIndex === index && (
                            <Badge variant="default" className="text-xs shrink-0 bg-accent text-accent-foreground">
                              {index + 1}/{queue.length}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Progress Details for processing */}
                        {item.status === 'processing' && (
                          <div className="mt-1.5 space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-accent animate-pulse" />
                                {item.phaseMessage || 'Verarbeite...'}
                              </span>
                              <span className="text-muted-foreground tabular-nums">
                                {item.progress.toFixed(0)}%
                              </span>
                            </div>
                            <Progress value={item.progress} className="h-1.5" />
                            {item.recordsTotal !== undefined && item.recordsTotal > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {item.recordsProcessed || 0} / {item.recordsTotal} Datensätze
                              </div>
                            )}
                            {item.startedAt && (
                              <div className="text-xs text-muted-foreground">
                                Laufzeit: <ElapsedTime startedAt={item.startedAt} />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Result Summary */}
                        {item.status === 'completed' && item.result && (
                          <p className="text-xs text-status-shipped mt-1">
                            {getResultSummary(item.result) || 'Erfolgreich'}
                          </p>
                        )}

                        {/* Error Message */}
                        {item.status === 'failed' && item.error && (
                          <p className="text-xs text-destructive mt-1 truncate">
                            {item.error}
                          </p>
                        )}

                        {/* Skipped Message */}
                        {item.status === 'skipped' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Übersprungen
                          </p>
                        )}
                      </div>

                      {/* Remove Button - only for pending items */}
                      {item.status === 'pending' && !isProcessing && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => removeFromQueue(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Scroll to current button */}
              {showScrollToCurrentButton && isProcessing && currentFileIndex >= 0 && (
                <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shadow-lg gap-2 animate-in fade-in slide-in-from-bottom-2"
                    onClick={scrollToCurrentItem}
                  >
                    <ChevronDown className="h-4 w-4" />
                    Zur aktuellen Datei ({currentFileIndex + 1}/{queue.length})
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4 shrink-0">
                {!isProcessing ? (
                  <>
                    {pendingCount > 0 && (
                      <Button 
                        className="flex-1 gap-2" 
                        onClick={processQueue}
                      >
                        <Play className="h-4 w-4" />
                        {pendingCount === 1 
                          ? 'Import starten' 
                          : `${pendingCount} Dateien importieren`
                        }
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleClose}>
                      {t('common.close')}
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="destructive" 
                    className="w-full gap-2"
                    onClick={cancelProcessing}
                  >
                    <X className="h-4 w-4" />
                    Import abbrechen
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Info - only show when queue is empty */}
          {queue.length === 0 && (
            <>
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground shrink-0">
                <p className="font-medium text-foreground mb-2">{t('universalImport.supportedFormats')}</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>{t('universalImport.bcOrders')}</li>
                  <li>{t('universalImport.bcInventory')}</li>
                  <li>{t('universalImport.mixedFiles')}</li>
                </ul>
              </div>

              <Button variant="outline" className="w-full shrink-0" onClick={handleClose}>
                {t('common.close')}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
