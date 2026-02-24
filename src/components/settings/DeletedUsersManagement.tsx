import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RotateCcw, Trash2, User, Calendar, MessageSquare } from '@/components/icons';
import { format } from 'date-fns';
import { de, enUS, fr, it, es } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

interface DeletedUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  deleted_at: string;
  deletion_reason: string | null;
}

export function DeletedUsersManagement() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<DeletedUser | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const getDateLocale = () => {
    const locales = { de, en: enUS, fr, it, es };
    return locales[language as keyof typeof locales] || de;
  };

  const { data: deletedUsers, isLoading } = useQuery({
    queryKey: ['deleted-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name, company_name, deleted_at, deletion_reason')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (error) throw error;
      return data as DeletedUser[];
    }
  });

  const restoreMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('restore_user_account', {
        p_user_id: userId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('deletedUsers.restoreSuccess'), {
        description: t('deletedUsers.restoreSuccessDesc')
      });
      queryClient.invalidateQueries({ queryKey: ['deleted-users'] });
      setShowRestoreDialog(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(t('deletedUsers.restoreError'), {
        description: error.message
      });
    }
  });

  const handleRestore = (user: DeletedUser) => {
    setSelectedUser(user);
    setShowRestoreDialog(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            {t('deletedUsers.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            {t('deletedUsers.title')}
          </CardTitle>
          <CardDescription>
            {t('deletedUsers.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deletedUsers && deletedUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.users')}</TableHead>
                  <TableHead>{t('settingsCommon.company')}</TableHead>
                  <TableHead>{t('deletedUsers.deletedAt')}</TableHead>
                  <TableHead>{t('deletedUsers.reason')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{user.full_name || t('memberships.unknown')}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.company_name || t('deletedUsers.none')}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(user.deleted_at), 'dd.MM.yyyy HH:mm', { locale: getDateLocale() })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.deletion_reason ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-[200px] truncate">
                          <MessageSquare className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{user.deletion_reason}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(user)}
                          disabled={restoreMutation.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          {t('deletedUsers.restore')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>{t('deletedUsers.noDeletedUsers')}</p>
              </div>
            )}
        </CardContent>
      </Card>

      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deletedUsers.restoreTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deletedUsers.restoreDesc').replace('{name}', selectedUser?.full_name || selectedUser?.email || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedUser && restoreMutation.mutate(selectedUser.user_id)}
              disabled={restoreMutation.isPending}
            >
              {restoreMutation.isPending ? t('deletedUsers.restoring') : t('deletedUsers.restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
