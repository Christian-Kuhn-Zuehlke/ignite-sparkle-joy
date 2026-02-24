import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecordReceivingCount, useCompleteReceiving } from '@/hooks/usePurchaseOrders';
import { 
  Loader2, 
  ScanLine, 
  Package, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

interface ReceivingDialogProps {
  po: {
    id: string;
    po_number: string;
    lines?: Array<{
      id: string;
      sku: string;
      product_name: string | null;
      qty_expected: number;
      qty_received: number;
    }>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceivingDialog({ po, open, onOpenChange }: ReceivingDialogProps) {
  const { t } = useLanguage();
  const [scannedSku, setScannedSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [receivedCounts, setReceivedCounts] = useState<Record<string, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const recordCount = useRecordReceivingCount();
  const completeReceiving = useCompleteReceiving();

  const lines = po.lines || [];
  const currentLine = lines[currentLineIndex];

  // Calculate progress
  const totalExpected = lines.reduce((sum, line) => sum + line.qty_expected, 0);
  const totalReceived = lines.reduce((sum, line) => sum + (receivedCounts[line.id] || line.qty_received), 0);
  const progress = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open, currentLineIndex]);

  const handleScan = async () => {
    if (!scannedSku.trim()) return;

    // Find matching line
    const matchingLine = lines.find(line => 
      line.sku.toLowerCase() === scannedSku.toLowerCase().trim()
    );

    if (!matchingLine) {
      toast.error(`Unknown SKU: ${scannedSku}`);
      setScannedSku('');
      return;
    }

    try {
      await recordCount.mutateAsync({
        session_id: po.id, // This should be the actual session ID
        po_line_id: matchingLine.id,
        sku: matchingLine.sku,
        qty_received: quantity,
      });

      setReceivedCounts(prev => ({
        ...prev,
        [matchingLine.id]: (prev[matchingLine.id] || matchingLine.qty_received) + quantity,
      }));

      toast.success(`Scanned ${quantity}x ${matchingLine.sku}`);
      setScannedSku('');
      setQuantity(1);

      // Move to next line if current is complete
      const newReceived = (receivedCounts[matchingLine.id] || matchingLine.qty_received) + quantity;
      if (newReceived >= matchingLine.qty_expected) {
        const nextIndex = lines.findIndex((line, idx) => {
          if (idx <= currentLineIndex) return false;
          const received = receivedCounts[line.id] || line.qty_received;
          return received < line.qty_expected;
        });
        if (nextIndex >= 0) {
          setCurrentLineIndex(nextIndex);
        }
      }
    } catch (error) {
      toast.error(t('inbound.receiving.error'));
    }
  };

  const handleComplete = async () => {
    try {
      await completeReceiving.mutateAsync(po.id);
      toast.success(t('inbound.receiving.completed'));
      onOpenChange(false);
    } catch (error) {
      toast.error(t('inbound.receiving.completeError'));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            {t('inbound.receiving.title')} - {po.po_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('inbound.receiving.progress')}</span>
              <span className="font-medium">{totalReceived} / {totalExpected}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Current Task */}
          {currentLine && (
            <Card className="border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  {t('inbound.receiving.currentTask')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-lg font-bold">{currentLine.sku}</p>
                    <p className="text-sm text-muted-foreground">{currentLine.product_name || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {receivedCounts[currentLine.id] || currentLine.qty_received}
                      <span className="text-muted-foreground"> / {currentLine.qty_expected}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{t('inbound.receiving.units')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scan Input */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={scannedSku}
              onChange={(e) => setScannedSku(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('inbound.receiving.scanPlaceholder')}
              className="flex-1 font-mono"
              autoComplete="off"
            />
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-20"
              min={1}
            />
            <Button onClick={handleScan} disabled={recordCount.isPending}>
              {recordCount.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Line Summary */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">{t('inbound.receiving.allLines')}</h4>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {lines.map((line, index) => {
                const received = receivedCounts[line.id] || line.qty_received;
                const isComplete = received >= line.qty_expected;
                const hasDiscrepancy = received > line.qty_expected;
                
                return (
                  <div 
                    key={line.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      index === currentLineIndex ? 'bg-primary/10 border border-primary' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isComplete ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : hasDiscrepancy ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <span className="font-mono">{line.sku}</span>
                    </div>
                    <Badge variant={isComplete ? 'default' : 'secondary'}>
                      {received} / {line.qty_expected}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleComplete} 
            disabled={completeReceiving.isPending}
            variant={progress >= 100 ? 'default' : 'secondary'}
          >
            {completeReceiving.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('inbound.receiving.complete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
