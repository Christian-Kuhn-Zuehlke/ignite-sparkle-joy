import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Sparkles, Download, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function AIReportWidget() {
  const { t, language } = useLanguage();
  const effectiveCompanyId = useEffectiveCompanyId();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: report, refetch, isFetching } = useQuery({
    queryKey: ['ai-weekly-report', effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-weekly-report', {
        body: { companyId: effectiveCompanyId, language }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      return data;
    },
    enabled: false, // Don't auto-fetch, user triggers it
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await refetch();
      toast.success(t('aiReport.generated'));
    } catch (error: any) {
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast.error(t('aiReport.rateLimitError'));
      } else if (error.message?.includes('402') || error.message?.includes('Payment')) {
        toast.error(t('aiReport.paymentError'));
      } else {
        toast.error(t('aiReport.error'));
      }
      console.error('Report generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!report?.report) return;
    
    const blob = new Blob([report.report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('aiReport.downloaded'));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(language === 'de' ? 'de-CH' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <Card className="shadow-card border-border overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base font-semibold">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20">
              <Sparkles className="h-4 w-4 text-violet-500" />
            </div>
            {t('aiReport.title')}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-violet-500/10 text-violet-500">
              AI
            </Badge>
          </div>
          {report && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!report ? (
          <div className="text-center py-6">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-4">
              {t('aiReport.noReport')}
            </p>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || isFetching}
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
            >
              {isGenerating || isFetching ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {t('aiReport.generating')}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t('aiReport.generate')}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Quick stats from metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-semibold">{report.metrics.ordersThisWeek}</div>
                <div className="text-[10px] text-muted-foreground">{t('aiReport.orders')}</div>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <div className="text-lg font-semibold">{report.metrics.shipmentsThisWeek}</div>
                <div className="text-[10px] text-muted-foreground">{t('aiReport.shipped')}</div>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <div className={cn(
                  "text-lg font-semibold",
                  report.metrics.slaCompliance >= 90 ? "text-status-shipped" : 
                  report.metrics.slaCompliance >= 70 ? "text-status-warning" : "text-destructive"
                )}>
                  {report.metrics.slaCompliance.toFixed(0)}%
                </div>
                <div className="text-[10px] text-muted-foreground">SLA</div>
              </div>
            </div>

            {/* Expandable report content */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div 
                    className="text-sm text-foreground whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ 
                      __html: report.report
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
                        .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
                        .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
                        .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
                        .replace(/\n/g, '<br />')
                    }}
                  />
                </div>
              </div>
            )}

            {/* Footer with actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {t('aiReport.generatedAt')}: {formatDate(report.generatedAt)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-7 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {t('common.export')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating || isFetching}
                  className="h-7 text-xs"
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", (isGenerating || isFetching) && "animate-spin")} />
                  {t('aiReport.refresh')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
