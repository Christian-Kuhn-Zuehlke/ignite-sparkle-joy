import { useState } from 'react';
import { Check, X, Clock, User, Building2, Mail, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
import { 
  useAllMemberships, 
  useApproveMembership, 
  useRejectMembership,
  usePendingMembershipsCount 
} from '@/hooks/useMemberships';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { formatDistanceToNow, Locale } from 'date-fns';
import { de, enUS, fr, it, es } from 'date-fns/locale';

const dateFnsLocales: Record<Language, Locale> = {
  de: de,
  en: enUS,
  fr: fr,
  it: it,
  es: es,
};

export function PendingRegistrations() {
  const { data: pendingMemberships, isLoading } = useAllMemberships('pending');
  const { data: pendingCount } = usePendingMembershipsCount();
  const approveMutation = useApproveMembership();
  const rejectMutation = useRejectMembership();
  const { t, language } = useLanguage();
  
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject';
    membershipId: string;
    userName: string;
    userEmail?: string;
    companyName?: string;
  } | null>(null);

  const handleApprove = (id: string, userName: string, userEmail?: string, companyName?: string) => {
    setConfirmDialog({
      open: true,
      action: 'approve',
      membershipId: id,
      userName,
      userEmail,
      companyName
    });
  };

  const handleReject = (id: string, userName: string, userEmail?: string) => {
    setConfirmDialog({
      open: true,
      action: 'reject',
      membershipId: id,
      userName,
      userEmail
    });
  };

  const confirmAction = async () => {
    if (!confirmDialog) return;
    
    if (confirmDialog.action === 'approve') {
      await approveMutation.mutateAsync({
        id: confirmDialog.membershipId,
        userEmail: confirmDialog.userEmail,
        userName: confirmDialog.userName,
        companyName: confirmDialog.companyName
      });
    } else {
      await rejectMutation.mutateAsync({
        id: confirmDialog.membershipId,
        userEmail: confirmDialog.userEmail,
        userName: confirmDialog.userName
      });
    }
    
    setConfirmDialog(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('registration.pendingRegistrations')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('registration.pendingRegistrations')}
                {pendingCount && pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingCount}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t('registration.waitingForApproval')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!pendingMemberships || pendingMemberships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Check className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p className="font-medium">{t('registration.noPending')}</p>
              <p className="text-sm">{t('registration.allProcessed')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.users')}</TableHead>
                  <TableHead>{t('settings.company')}</TableHead>
                  <TableHead>{t('registration.requested')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingMemberships.map((membership) => (
                  <TableRow key={membership.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {membership.user_name || t('registration.unknown')}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {membership.user_email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {membership.company_name || (
                              <span className="text-amber-600">
                                {membership.requested_company_name || t('registration.unknown')}
                              </span>
                            )}
                          </p>
                          {!membership.company_name && membership.requested_company_name && (
                            <p className="text-xs text-amber-600">
                              {t('registration.unknownCompany')}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(membership.created_at), {
                          addSuffix: true,
                          locale: dateFnsLocales[language]
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleReject(
                            membership.id, 
                            membership.user_name || t('registration.unknown'),
                            membership.user_email
                          )}
                          disabled={rejectMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(
                            membership.id, 
                            membership.user_name || t('registration.unknown'),
                            membership.user_email,
                            membership.company_name || membership.requested_company_name
                          )}
                          disabled={approveMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          {t('registration.approve')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.action === 'approve' 
                ? t('registration.confirmApprove')
                : t('registration.confirmReject')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.action === 'approve' 
                ? `${confirmDialog.userName} ${t('registration.willGetAccess')}`
                : `${confirmDialog?.userName} ${t('registration.willNotGetAccess')}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={confirmDialog?.action === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {confirmDialog?.action === 'approve' ? t('registration.approve') : t('registration.reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
