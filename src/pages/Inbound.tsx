import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { InboundDashboard } from '@/components/inbound/InboundDashboard';
import { POList } from '@/components/inbound/POList';
import { CreatePODialog } from '@/components/inbound/CreatePODialog';
import { Button } from '@/components/ui/button';
import { Plus } from '@/components/icons';
import { useAuth } from '@/contexts/AuthContext';

export default function Inbound() {
  const { t } = useLanguage();
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const canCreate = hasRole('admin') || hasRole('msd_ops') || hasRole('system_admin');

  return (
    <MainLayout title={t('inbound.title')} subtitle={t('inbound.subtitle')} breadcrumbs={[{ label: t('inbound.title') }]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('inbound.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('inbound.subtitle')}</p>
          </div>
          {canCreate && (
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('inbound.createPO')}
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="dashboard">{t('inbound.tabs.dashboard')}</TabsTrigger>
            <TabsTrigger value="list">{t('inbound.tabs.poList')}</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard" className="mt-6">
            <InboundDashboard />
          </TabsContent>
          <TabsContent value="list" className="mt-6">
            <POList />
          </TabsContent>
        </Tabs>

        <CreatePODialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </div>
    </MainLayout>
  );
}
