import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, AlertTriangle } from '@/components/icons';
import { useLanguage } from '@/contexts/LanguageContext';

export function DeleteAccountSection() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const deleteConfirmWord = t('deleteAccount.confirmWord');

  const handleDeleteAccount = async () => {
    if (!user || confirmText !== deleteConfirmWord) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('soft_delete_user_account', {
        p_user_id: user.id,
        p_reason: reason || undefined
      });

      if (error) throw error;

      toast.success(t('deleteAccount.success'), {
        description: t('deleteAccount.successDesc')
      });
      
      // Sign out after deletion
      setTimeout(() => {
        signOut();
      }, 2000);
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(t('deleteAccount.error'), {
        description: error.message
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          {t('deleteAccount.title')}
        </CardTitle>
        <CardDescription>
          {t('deleteAccount.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">{t('deleteAccount.warning')}</p>
              <p className="text-muted-foreground">
                {t('deleteAccount.warningDesc')}
              </p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('deleteAccount.title')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteAccount.confirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteAccount.confirmDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">{t('deleteAccount.reason')}</Label>
                  <Textarea
                    id="reason"
                    placeholder={t('deleteAccount.reasonPlaceholder')}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm">
                    {t('deleteAccount.typeToConfirm')} <span className="font-bold">{deleteConfirmWord}</span>
                  </Label>
                  <input
                    id="confirm"
                    type="text"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder={deleteConfirmWord}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setReason('');
                  setConfirmText('');
                }}>
                  {t('common.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={confirmText !== deleteConfirmWord || isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? t('deleteAccount.deleting') : t('deleteAccount.title')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
