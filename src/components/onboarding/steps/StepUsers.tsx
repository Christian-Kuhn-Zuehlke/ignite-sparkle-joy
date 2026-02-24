import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OnboardingData } from '../OnboardingWizard';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Mail, 
  Trash2, 
  Shield, 
  Eye,
  Users,
  AlertCircle
} from '@/components/icons';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

interface StepUsersProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  companyId: string;
}

export function StepUsers({ data, updateData }: StepUsersProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');

  const addUser = () => {
    if (!email) {
      toast.error(t('onboarding.enterEmail'));
      return;
    }

    if (!email.includes('@')) {
      toast.error(t('onboarding.invalidEmail'));
      return;
    }

    if (data.invitedUsers.some(u => u.email === email)) {
      toast.error(t('onboarding.userAlreadyAdded'));
      return;
    }

    updateData({
      invitedUsers: [...data.invitedUsers, { email, role }]
    });
    setEmail('');
    toast.success(t('onboarding.userAdded'));
  };

  const removeUser = (emailToRemove: string) => {
    updateData({
      invitedUsers: data.invitedUsers.filter(u => u.email !== emailToRemove)
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('onboarding.usersDesc')}
      </p>

      {/* Add User Form */}
      <div className="border rounded-lg p-4 bg-muted/20">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          {t('onboarding.addUser')}
        </h4>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label htmlFor="userEmail" className="sr-only">{t('common.email')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="userEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('onboarding.userEmailPlaceholder')}
                className="pl-10"
                onKeyDown={(e) => e.key === 'Enter' && addUser()}
              />
            </div>
          </div>
          
          <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'viewer')}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {t('roles.admin')}
                </div>
              </SelectItem>
              <SelectItem value="viewer">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {t('roles.viewer')}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={addUser}>
            <UserPlus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{t('common.add')}</span>
          </Button>
        </div>
      </div>

      {/* User List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('onboarding.usersToInvite')} ({data.invitedUsers.length})
          </Label>
        </div>

        {data.invitedUsers.length > 0 ? (
          <div className="border rounded-lg divide-y">
            {data.invitedUsers.map((user) => (
              <div key={user.email} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.email}</p>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                      {user.role === 'admin' ? (
                        <><Shield className="h-3 w-3 mr-1" />{t('roles.admin')}</>
                      ) : (
                        <><Eye className="h-3 w-3 mr-1" />{t('roles.viewer')}</>
                      )}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeUser(user.email)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border rounded-lg p-8 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('onboarding.noUsersAdded')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('onboarding.canInviteLater')}
            </p>
          </div>
        )}
      </div>

      {/* Role Explanation */}
      <div className="bg-muted/50 rounded-lg p-4 border">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          {t('onboarding.roleExplanation')}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="flex items-center gap-2 font-medium mb-1">
              <Shield className="h-4 w-4" />
              {t('roles.admin')}
            </div>
            <p className="text-muted-foreground text-xs">
              {t('roles.adminDesc')}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 font-medium mb-1">
              <Eye className="h-4 w-4" />
              {t('roles.viewer')}
            </div>
            <p className="text-muted-foreground text-xs">
              {t('roles.viewerDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
