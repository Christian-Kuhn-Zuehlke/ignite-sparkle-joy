import { useState } from 'react';
import { 
  FileText, 
  Download, 
  User, 
  Activity,
  LogIn,
  LogOut,
  Eye,
  Plus,
  Edit,
  Trash2,
  Upload,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2
} from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuditLogs, useAuditLogStats, AuditAction, AuditResource, AuditLogEntry } from '@/hooks/useAuditLog';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies } from '@/hooks/useCompanies';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, formatDistanceToNow, Locale } from 'date-fns';
import { de, enUS, fr, it, es } from 'date-fns/locale';

const getDateLocale = (lang: string): Locale => {
  const locales: Record<string, Locale> = { de, en: enUS, fr, it, es };
  return locales[lang] || de;
};

const actionIcons: Record<string, React.ReactNode> = {
  login: <LogIn className="h-4 w-4" />,
  logout: <LogOut className="h-4 w-4" />,
  view: <Eye className="h-4 w-4" />,
  create: <Plus className="h-4 w-4" />,
  update: <Edit className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  export: <Download className="h-4 w-4" />,
  import: <Upload className="h-4 w-4" />,
  approve: <CheckCircle className="h-4 w-4" />,
  reject: <XCircle className="h-4 w-4" />,
  status_change: <RefreshCw className="h-4 w-4" />,
  role_change: <RefreshCw className="h-4 w-4" />,
  settings_change: <Edit className="h-4 w-4" />,
  bulk_action: <Activity className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  login: 'bg-green-100 text-green-700',
  logout: 'bg-gray-100 text-gray-700',
  view: 'bg-blue-100 text-blue-700',
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-amber-100 text-amber-700',
  delete: 'bg-red-100 text-red-700',
  export: 'bg-purple-100 text-purple-700',
  import: 'bg-indigo-100 text-indigo-700',
  approve: 'bg-green-100 text-green-700',
  reject: 'bg-red-100 text-red-700',
  status_change: 'bg-blue-100 text-blue-700',
  role_change: 'bg-blue-100 text-blue-700',
  settings_change: 'bg-amber-100 text-amber-700',
  bulk_action: 'bg-purple-100 text-purple-700',
};

function AuditLogRow({ log, t, dateLocale }: { log: AuditLogEntry; t: (key: string) => string; dateLocale: Locale }) {
  const [showDetails, setShowDetails] = useState(false);

  const actionLabels: Record<string, string> = {
    login: t('auditLog.actions.login'),
    logout: t('auditLog.actions.logout'),
    create: t('auditLog.actions.create'),
    update: t('auditLog.actions.update'),
    delete: t('auditLog.actions.delete'),
    export: t('auditLog.actions.export'),
    import: t('auditLog.actions.import'),
    role_change: t('auditLog.actions.statusChange'),
    settings_change: t('auditLog.actions.statusChange'),
    bulk_action: t('auditLog.actions.statusChange'),
  };

  return (
    <>
      <TableRow 
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setShowDetails(!showDetails)}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <span className={`p-1.5 rounded ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
              {actionIcons[log.action] || <Activity className="h-4 w-4" />}
            </span>
            <span className="font-medium">{actionLabels[log.action] || log.action}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">
            {(log as any).entity_type || '-'}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{(log as any).user_name || t('auditLog.system')}</p>
              <p className="text-xs text-muted-foreground">{(log as any).user_email}</p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-sm text-muted-foreground" title={format(new Date(log.created_at), 'PPpp', { locale: dateLocale })}>
            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: dateLocale })}
          </span>
        </TableCell>
      </TableRow>
      {showDetails && Object.keys(log.details).length > 0 && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={4}>
            <div className="p-2 text-sm">
              <p className="font-medium mb-1">{t('common.details')}:</p>
              <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                {JSON.stringify(log.details, null, 2)}
              </pre>
              {(log as any).entity_id && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('auditLog.resourceId')}: {(log as any).entity_id}
                </p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export function AuditLogViewer() {
  const { canViewAllCompanies } = useAuth();
  const { data: companies } = useCompanies();
  const { t, language } = useLanguage();
  const dateLocale = getDateLocale(language);
  
  // Filters
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const companyId = selectedCompany === 'all' ? undefined : selectedCompany;
  const action = selectedAction === 'all' ? undefined : selectedAction as AuditAction;
  const resourceType = selectedResource === 'all' ? undefined : selectedResource as AuditResource;

  const { data: logs, isLoading, refetch } = useAuditLogs({
    companyId,
    action,
    resourceType,
    limit: 200,
  });

  const { data: stats } = useAuditLogStats(companyId);

  const actionLabels: Record<string, string> = {
    login: t('auditLog.actions.login'),
    logout: t('auditLog.actions.logout'),
    create: t('auditLog.actions.create'),
    update: t('auditLog.actions.update'),
    delete: t('auditLog.actions.delete'),
    export: t('auditLog.actions.export'),
    import: t('auditLog.actions.import'),
    role_change: t('auditLog.actions.statusChange'),
    settings_change: t('auditLog.actions.statusChange'),
    bulk_action: t('auditLog.actions.statusChange'),
  };

  // Filter logs by search query
  const filteredLogs = logs?.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (log as any).user_email?.toLowerCase().includes(query) ||
      (log as any).user_name?.toLowerCase().includes(query) ||
      (log as any).entity_id?.toLowerCase().includes(query) ||
      JSON.stringify(log.details).toLowerCase().includes(query)
    );
  });

  const handleExport = () => {
    if (!filteredLogs) return;
    
    const csv = [
      [t('auditLog.timestamp'), t('auditLog.action'), t('auditLog.resource'), t('auditLog.user'), t('common.email'), t('settings.company'), t('auditLog.resourceId'), t('common.details')].join(','),
      ...filteredLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        actionLabels[log.action] || log.action,
        (log as any).entity_type || '',
        (log as any).user_name || '',
        (log as any).user_email || '',
        log.company_id || '',
        (log as any).entity_id || '',
        JSON.stringify(log.details).replace(/"/g, '""'),
      ].map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('common.today')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.totalToday || 0}</p>
            <p className="text-xs text-muted-foreground">{t('auditLog.actionsLogged')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('auditLog.last7Days')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.totalWeek || 0}</p>
            <p className="text-xs text-muted-foreground">{t('auditLog.actionsLogged')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('auditLog.topActivity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.byAction && Object.keys(stats.byAction).length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {Object.entries(stats.byAction)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
                  .map(([actionKey, count]) => (
                    <Badge key={actionKey} variant="secondary" className="text-xs">
                      {actionLabels[actionKey as AuditAction]}: {count}
                    </Badge>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Audit Log Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('auditLog.title')}
              </CardTitle>
              <CardDescription>
                {t('auditLog.description')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                {t('common.refresh')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!filteredLogs?.length}>
                <Download className="h-4 w-4 mr-1" />
                {t('auditLog.exportCsv')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">{t('common.search')}</Label>
              <Input
                placeholder={t('auditLog.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
            
            {canViewAllCompanies() && (
              <div className="w-[180px]">
                <Label className="text-xs text-muted-foreground">{t('settings.company')}</Label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    {companies?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="w-[150px]">
              <Label className="text-xs text-muted-foreground">{t('auditLog.action')}</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-[150px]">
              <Label className="text-xs text-muted-foreground">{t('auditLog.resource')}</Label>
              <Select value={selectedResource} onValueChange={setSelectedResource}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="order">{t('auditLog.resources.order')}</SelectItem>
                  <SelectItem value="inventory">{t('auditLog.resources.inventory')}</SelectItem>
                  <SelectItem value="user">{t('auditLog.resources.user')}</SelectItem>
                  <SelectItem value="settings">{t('auditLog.resources.settings')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Log Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredLogs?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mb-3" />
              <p className="font-medium">{t('auditLog.noEntries')}</p>
              <p className="text-sm">{t('auditLog.noEntriesDesc')}</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('auditLog.action')}</TableHead>
                    <TableHead>{t('auditLog.resource')}</TableHead>
                    <TableHead>{t('auditLog.user')}</TableHead>
                    <TableHead>{t('auditLog.timestamp')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => (
                    <AuditLogRow key={log.id} log={log} t={t} dateLocale={dateLocale} />
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          
          {filteredLogs && filteredLogs.length > 0 && (
            <p className="text-xs text-muted-foreground text-right">
              {filteredLogs.length} {t('auditLog.entriesShown')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
