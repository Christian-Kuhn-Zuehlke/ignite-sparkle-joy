import { useState } from 'react';
import { Package, AlertTriangle, Lightbulb, TrendingUp, Truck } from '@/components/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PackagingOverview } from '@/components/packaging/PackagingOverview';
import { ShippingAnomaliesList } from '@/components/packaging/ShippingAnomaliesList';
import { PackagingRecommendations } from '@/components/packaging/PackagingRecommendations';
import { FillRateChart } from '@/components/packaging/FillRateChart';
import { CarrierAnalysis } from '@/components/packaging/CarrierAnalysis';
import { useLanguage } from '@/contexts/LanguageContext';
import { MainLayout } from '@/components/layout/MainLayout';

export default function Packaging() {
  const { t } = useLanguage();
  const [days, setDays] = useState(30);

  return (
    <MainLayout title={t('packaging.title')} subtitle={t('packaging.subtitle')} breadcrumbs={[{ label: t('packaging.title') }]}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            {t('packaging.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('packaging.subtitle')}
          </p>
        </div>
        <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t('common.last7Days')}</SelectItem>
            <SelectItem value="14">{t('common.last14Days')}</SelectItem>
            <SelectItem value="30">{t('common.last30Days')}</SelectItem>
            <SelectItem value="90">{t('common.last90Days')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Overview */}
      <PackagingOverview days={days} />

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('packaging.tabOverview')}
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t('packaging.tabAnomalies')}
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            {t('packaging.tabRecommendations')}
          </TabsTrigger>
          <TabsTrigger value="carriers" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t('packaging.tabCarriers')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FillRateChart days={days} />
            <CarrierAnalysis />
          </div>
          <PackagingRecommendations />
        </TabsContent>

        <TabsContent value="anomalies">
          <ShippingAnomaliesList />
        </TabsContent>

        <TabsContent value="recommendations">
          <PackagingRecommendations />
        </TabsContent>

        <TabsContent value="carriers">
          <CarrierAnalysis />
        </TabsContent>
      </Tabs>
      </div>
    </MainLayout>
  );
}
