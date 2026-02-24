import { useState } from 'react';
import { Bot, Play, CheckCircle, AlertTriangle, XCircle, Clock, RefreshCw, Activity, TrendingUp } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';

interface AgentRunResult {
  agentName: string;
  companyId: string;
  startedAt: string;
  completedAt: string;
  observations: number;
  thoughts: number;
  actionsExecuted: number;
  actionsSucceeded: number;
  errors: string[];
}

interface RiskOrder {
  id: string;
  source_no: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  slaRisk: number;
  riskFactors: string[];
  hoursInCurrentStatus: number;
}

export function AgentDashboardWidget() {
  const { activeCompanyId } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<AgentRunResult | null>(null);
  const [detectedRisks, setDetectedRisks] = useState<RiskOrder[]>([]);
  const [runHistory, setRunHistory] = useState<AgentRunResult[]>([]);

  const effectiveCompanyId = activeCompanyId === 'ALL' ? 'MSD' : activeCompanyId;

  const runAgent = async () => {
    if (!effectiveCompanyId) {
      toast({
        title: t('common.error'),
        description: t('agent.selectCompanyFirst'),
        variant: 'destructive',
      });
      return;
    }

    setIsRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('order-agent', {
        body: { companyId: effectiveCompanyId },
      });

      if (error) throw error;

      const result = data as AgentRunResult;
      setLastResult(result);
      setRunHistory(prev => [result, ...prev].slice(0, 10));

      // Extract risks from observations if available
      if (data.observations && Array.isArray(data.observations)) {
        const risks = data.observations
          .filter((obs: any) => obs.type === 'critical_order' || obs.type === 'high_risk_orders')
          .flatMap((obs: any) => {
            if (obs.type === 'critical_order') {
              return [obs.data];
            }
            return obs.data?.orders || [];
          });
        setDetectedRisks(risks);
      }

      toast({
        title: t('agent.runSuccess'),
        description: `${result.actionsSucceeded}/${result.actionsExecuted} ${t('agent.actionsSuccessful')}`,
      });
    } catch (error) {
      console.error('Agent error:', error);
      toast({
        title: t('agent.runError'),
        description: error instanceof Error ? error.message : t('common.unknownError'),
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive">{t('agent.priorityCritical')}</Badge>;
      case 'high': return <Badge className="bg-orange-500">{t('agent.priorityHigh')}</Badge>;
      case 'medium': return <Badge className="bg-yellow-500 text-black">{t('agent.priorityMedium')}</Badge>;
      default: return <Badge variant="secondary">{t('agent.priorityLow')}</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const formatDuration = (startedAt: string, completedAt: string) => {
    const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t('agent.orderManagementAgent')}</CardTitle>
              <CardDescription>
                {t('agent.orderManagementAgentDesc')}
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={runAgent} 
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                {t('agent.running')}
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {t('agent.startAgent')}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last Run Summary */}
        {lastResult ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4" />
                {t('agent.observations')}
              </div>
              <p className="text-2xl font-bold">{lastResult.observations}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                {t('agent.thoughts')}
              </div>
              <p className="text-2xl font-bold">{lastResult.thoughts}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {t('agent.successfulActions')}
              </div>
              <p className="text-2xl font-bold text-green-600">{lastResult.actionsSucceeded}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {t('agent.duration')}
              </div>
              <p className="text-2xl font-bold">
                {formatDuration(lastResult.startedAt, lastResult.completedAt)}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t('agent.notRunYet')}</p>
            <p className="text-sm">{t('agent.clickToStart')}</p>
          </div>
        )}

        {/* Detected Risks */}
        {detectedRisks.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t('agent.detectedRisks')} ({detectedRisks.length})
            </h4>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {detectedRisks.map((risk, index) => (
                  <div 
                    key={risk.id || index}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${getPriorityColor(risk.priority)}`} />
                      <div>
                        <p className="font-medium text-sm">{risk.source_no}</p>
                        <p className="text-xs text-muted-foreground">
                          {risk.hoursInCurrentStatus?.toFixed(1)}h {t('agent.inCurrentStatus')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {t('agent.risk')}: {Math.round(risk.slaRisk * 100)}%
                      </span>
                      {getPriorityBadge(risk.priority)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Errors */}
        {lastResult?.errors && lastResult.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2 text-red-500">
              <XCircle className="h-4 w-4" />
              {t('agent.errors')} ({lastResult.errors.length})
            </h4>
            <div className="space-y-1">
              {lastResult.errors.map((error, index) => (
                <div 
                  key={index}
                  className="p-2 rounded bg-red-500/10 text-red-700 dark:text-red-400 text-sm"
                >
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Run History */}
        {runHistory.length > 1 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">{t('agent.lastRuns')}</h4>
            <div className="flex gap-2 flex-wrap">
              {runHistory.slice(1, 6).map((run, index) => (
                <div 
                  key={index}
                  className="text-xs px-2 py-1 rounded bg-muted flex items-center gap-1.5"
                >
                  {run.errors.length > 0 ? (
                    <XCircle className="h-3 w-3 text-red-500" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  )}
                  {formatDuration(run.startedAt, run.completedAt)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
