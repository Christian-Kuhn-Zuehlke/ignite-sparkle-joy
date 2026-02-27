import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, MessageSquare, TrendingUp, AlertTriangle, Sparkles, Lightbulb, Package, RotateCcw, BarChart3, Search, Bot, Gauge, Timer } from '@/components/icons';
import { MainLayout } from '@/components/layout/MainLayout';
import { EmbeddedChatbot } from '@/components/ai/EmbeddedChatbot';
import { AgentDashboardWidget } from '@/components/dashboard/AgentDashboardWidget';
import { PredictionsWidget } from '@/components/ai/PredictionsWidget';
import { ReturnsAnalyticsDashboard } from '@/components/ai/ReturnsAnalyticsDashboard';
import { ProactiveAlertsWidget } from '@/components/ai/ProactiveAlertsWidget';
import { OrderPerformanceAnalytics } from '@/components/ai/OrderPerformanceAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanyFilterDropdown } from '@/components/filters/CompanyFilterDropdown';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';

export default function AIHub() {
  const { t } = useLanguage();
  const { activeCompanyId } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  const effectiveCompanyId = activeCompanyId === 'ALL' ? undefined : activeCompanyId || undefined;
  
  const dateTo = new Date();
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 7);
  
  const { data: metrics } = useDashboardMetrics({ dateFrom, dateTo, companyId: effectiveCompanyId });

  const aiQuickActions = [
    {
      icon: Package,
      titleKey: 'ai.openOrders',
      descriptionKey: 'ai.ordersInProgress',
      count: metrics?.ordersPending || 0,
      action: () => navigate('/orders?status=pending'),
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: AlertTriangle,
      titleKey: 'ai.criticalItems',
      descriptionKey: 'ai.lowStockItems',
      action: () => navigate('/inventory?filter=low-stock'),
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      icon: RotateCcw,
      titleKey: 'ai.openReturns',
      descriptionKey: 'ai.returnsToProcess',
      count: metrics?.returnsOpen || 0,
      action: () => navigate('/returns?status=open'),
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      icon: TrendingUp,
      titleKey: 'ai.slaAnalysis',
      descriptionKey: 'ai.last7DaysPerformance',
      action: () => navigate('/kpis'),
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];

  const aiFeatures = [
    {
      icon: Search,
      titleKey: 'ai.intelligentSearch',
      descriptionKey: 'ai.intelligentSearchDesc',
      exampleKeys: ['ai.exampleOrdersLastWeek', 'ai.exampleOrdersZurich', 'ai.exampleLowStock'],
      status: 'active',
      action: () => setActiveTab('chat'),
    },
    {
      icon: BarChart3,
      titleKey: 'ai.forecastsTrends',
      descriptionKey: 'ai.forecastsTrendsDesc',
      exampleKeys: ['ai.exampleOrderVolume', 'ai.exampleItemsRunningOut', 'ai.exampleReturnRate'],
      status: 'active',
      action: () => setActiveTab('predictions'),
    },
    {
      icon: AlertTriangle,
      titleKey: 'ai.proactiveAlerts',
      descriptionKey: 'ai.proactiveAlertsDesc',
      exampleKeys: ['ai.exampleSlaBreaches', 'ai.exampleDeliveryDelays', 'ai.exampleUnusualPatterns'],
      status: 'active',
      action: () => setActiveTab('overview'),
    },
    {
      icon: Lightbulb,
      titleKey: 'ai.optimizationSuggestions',
      descriptionKey: 'ai.optimizationSuggestionsDesc',
      exampleKeys: ['ai.exampleReorderRecommendations', 'ai.exampleProcessOptimization', 'ai.exampleCapacityPlanning'],
      status: 'active',
      action: () => setActiveTab('chat'),
    },
  ];

  return (
    <MainLayout 
      title={t('nav.aiHub')} 
      subtitle={t('ai.subtitle')}
      breadcrumbs={[{ label: t('nav.aiHub') }]}
    >
      {/* Company Filter */}
      <div className="mb-4 md:mb-6">
        <CompanyFilterDropdown />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-6 h-auto p-1">
          <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm py-2">
            <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden md:inline truncate">{t('ai.overview')}</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1 text-xs sm:text-sm py-2">
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden md:inline truncate">{t('ai.assistant')}</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1 text-xs sm:text-sm py-2">
            <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden md:inline truncate">{t('ai.performance')}</span>
          </TabsTrigger>
          <TabsTrigger value="predictions" className="gap-1 text-xs sm:text-sm py-2">
            <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden md:inline truncate">{t('ai.predictions')}</span>
          </TabsTrigger>
          <TabsTrigger value="returns" className="gap-1 text-xs sm:text-sm py-2">
            <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden md:inline truncate">{t('ai.returns')}</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1 text-xs sm:text-sm py-2">
            <Bot className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden md:inline truncate">{t('ai.agents')}</span>
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB - New Dashboard View */}
        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          {/* Hero Section */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 overflow-hidden relative">
            <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-primary/10 blur-2xl" />
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <Brain className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">{t('ai.intelligentFulfillment')}</CardTitle>
                  <CardDescription>{t('ai.aiPoweredInsights')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" /> {t('ai.predictiveAnalytics')}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> {t('ai.proactiveAlerts')}
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Search className="h-3 w-3" /> {t('ai.naturalLanguage')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {aiQuickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-all hover:shadow-md hover:scale-[1.02] text-left group"
              >
                <div className={`h-10 w-10 rounded-lg ${action.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{t(action.titleKey)}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.count !== undefined 
                      ? `${action.count} ${t(action.descriptionKey)}`
                      : t(action.descriptionKey)
                    }
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
            <PredictionsWidget />
            <ProactiveAlertsWidget />
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {aiFeatures.map((feature, index) => (
              <Card 
                key={index} 
                className="relative overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover:shadow-md group"
                onClick={feature.action}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium truncate">{t(feature.titleKey)}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{t(feature.descriptionKey)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* CHAT TAB */}
        <TabsContent value="chat" className="space-y-4 md:space-y-6">
          <EmbeddedChatbot />
        </TabsContent>

        {/* PERFORMANCE TAB */}
        <TabsContent value="performance" className="space-y-4 md:space-y-6">
          <OrderPerformanceAnalytics />
        </TabsContent>

        {/* PREDICTIONS TAB */}
        <TabsContent value="predictions" className="space-y-4 md:space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <PredictionsWidget />
            <ProactiveAlertsWidget />
          </div>
        </TabsContent>

        {/* RETURNS TAB */}
        <TabsContent value="returns" className="space-y-4 md:space-y-6">
          <ReturnsAnalyticsDashboard />
        </TabsContent>

        {/* AGENTS TAB */}
        <TabsContent value="agents" className="space-y-4 md:space-y-6">
          <AgentDashboardWidget />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('agent.whatDoesAgentDo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <p><strong>{t('agent.observe')}:</strong> {t('agent.observeDesc')}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <p><strong>{t('agent.think')}:</strong> {t('agent.thinkDesc')}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <p><strong>{t('agent.act')}:</strong> {t('agent.actDesc')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
