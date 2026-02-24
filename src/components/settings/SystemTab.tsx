import { Upload, Trash2, History } from '@/components/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuditLogViewer } from './AuditLogViewer';
import { XmlImport } from './XmlImport';
import { InventoryImport } from './InventoryImport';
import { DeletedUsersManagement } from './DeletedUsersManagement';
import { useLanguage } from '@/contexts/LanguageContext';

interface SystemTabProps {
  isSystemAdmin: boolean;
  canViewAuditLog: boolean;
}

export function SystemTab({ isSystemAdmin, canViewAuditLog }: SystemTabProps) {
  const { t } = useLanguage();
  const getDefaultTab = () => {
    if (canViewAuditLog) return 'audit';
    if (isSystemAdmin) return 'import';
    return 'audit';
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue={getDefaultTab()} className="space-y-4">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          {canViewAuditLog && (
            <TabsTrigger value="audit" className="gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.auditLog')}</span>
            </TabsTrigger>
          )}
          {isSystemAdmin && (
            <>
              <TabsTrigger value="import" className="gap-2">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">{t('common.import')}</span>
              </TabsTrigger>
              <TabsTrigger value="deleted-users" className="gap-2">
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t('deletedUsers.title')}</span>
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {canViewAuditLog && (
          <TabsContent value="audit">
            <AuditLogViewer />
          </TabsContent>
        )}

        {isSystemAdmin && (
          <>
            <TabsContent value="import" className="space-y-6">
              <XmlImport />
              <InventoryImport />
            </TabsContent>

            <TabsContent value="deleted-users">
              <DeletedUsersManagement />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
