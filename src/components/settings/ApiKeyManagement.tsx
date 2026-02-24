import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, Loader2 } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { de, enUS, fr, it, es } from 'date-fns/locale';

interface ApiKey {
  id: string;
  company_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface ApiKeyManagementProps {
  companyId: string;
  companyName: string;
}

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'msd_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function ApiKeyManagement({ companyId, companyName }: ApiKeyManagementProps) {
  const { t, language } = useLanguage();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);

  const getDateLocale = () => {
    const locales = { de, en: enUS, fr, it, es };
    return locales[language as keyof typeof locales] || de;
  };

  useEffect(() => {
    fetchApiKeys();
  }, [companyId]);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys((data || []) as any as ApiKey[]);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error(t('apiKeys.load.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error(t('apiKeys.enterName'));
      return;
    }

    try {
      setSaving(true);
      const newKey = generateApiKey();
      const keyHash = await hashKey(newKey);
      const keyPrefix = newKey.substring(0, 8);

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          company_id: companyId,
          name: newKeyName,
          key_hash: keyHash,
          key_prefix: keyPrefix,
        })
        .select()
        .single();

      if (error) throw error;

      setApiKeys((prev) => [data as any as ApiKey, ...prev]);
      setGeneratedKey(newKey);
      toast.success(t('apiKeys.created.success'));
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error(t('apiKeys.created.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      toast.success(t('apiKeys.copied'));
    }
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewKeyName('');
    setGeneratedKey(null);
    setShowKey(false);
  };

  const handleDeleteKey = async () => {
    if (!keyToDelete) return;

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyToDelete.id);

      if (error) throw error;

      setApiKeys((prev) => prev.filter((k) => k.id !== keyToDelete.id));
      toast.success(t('apiKeys.deleted.success'));
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error(t('apiKeys.deleted.error'));
    } finally {
      setDeleteDialogOpen(false);
      setKeyToDelete(null);
    }
  };

  const handleToggleActive = async (apiKey: ApiKey) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !apiKey.is_active })
        .eq('id', apiKey.id);

      if (error) throw error;

      setApiKeys((prev) =>
        prev.map((k) => (k.id === apiKey.id ? { ...k, is_active: !k.is_active } : k))
      );
      toast.success(apiKey.is_active ? t('apiKeys.deactivated') : t('apiKeys.activated'));
    } catch (error) {
      console.error('Error toggling API key:', error);
      toast.error(t('apiKeys.update.error'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-semibold text-foreground">{t('apiKeys.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('apiKeys.manage').replace('{company}', companyName)}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('apiKeys.new')}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Key className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{t('apiKeys.noKeys')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="font-semibold">{t('common.name')}</TableHead>
                <TableHead className="font-semibold">Key</TableHead>
                <TableHead className="font-semibold">{t('common.status')}</TableHead>
                <TableHead className="font-semibold">{t('apiKeys.lastUsed')}</TableHead>
                <TableHead className="font-semibold">{t('apiKeys.created')}</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey, index) => (
                <TableRow
                  key={apiKey.id}
                  className={cn('animate-fade-in')}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <span className="font-medium text-foreground">{apiKey.name}</span>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm text-muted-foreground">
                      {apiKey.key_prefix}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={apiKey.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => handleToggleActive(apiKey)}
                    >
                      {apiKey.is_active ? t('apiKeys.active') : t('apiKeys.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {apiKey.last_used_at
                        ? formatDistanceToNow(new Date(apiKey.last_used_at), { addSuffix: true, locale: getDateLocale() })
                        : t('apiKeys.never')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(apiKey.created_at), { addSuffix: true, locale: getDateLocale() })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setKeyToDelete(apiKey);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create API Key Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={handleCloseCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('apiKeys.createTitle')}</DialogTitle>
            <DialogDescription>
              {t('apiKeys.createDesc').replace('{company}', companyName)}
            </DialogDescription>
          </DialogHeader>

          {!generatedKey ? (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">{t('common.name')}</Label>
                  <Input
                    id="key-name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder={t('apiKeys.namePlaceholder')}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseCreateDialog}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreateKey} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('settingsCommon.creating')}
                    </>
                  ) : (
                    t('settings.create')
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="rounded-lg border border-status-processing/30 bg-status-processing/10 p-4">
                  <p className="text-sm font-medium text-status-processing mb-2">
                    {t('apiKeys.importantSave')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('apiKeys.onlyShownOnce')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{t('apiKeys.yourKey')}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      value={generatedKey}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleCopyKey}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseCreateDialog}>{t('apiKeys.done')}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('apiKeys.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('apiKeys.deleteConfirm').replace('{name}', keyToDelete?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteKey}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
