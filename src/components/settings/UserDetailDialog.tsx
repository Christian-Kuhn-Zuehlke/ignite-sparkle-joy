import { useState, useEffect } from 'react';
import { User, Building2, Shield, Calendar, Mail, Users, Star, Loader2, Check, X, Trash2 } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, Locale } from 'date-fns';
import { de, enUS, fr, it, es } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';
import { UserRolesManager } from './UserRolesManager';

type AppRole = 'viewer' | 'admin' | 'msd_csm' | 'msd_ma' | 'msd_ops' | 'msd_management' | 'system_admin';

interface Membership {
  id: string;
  company_id: string;
  company_name: string;
  role: AppRole;
  is_primary: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  company_id: string | null;
  company_name: string | null;
  created_at: string;
  last_login_at: string | null;
  role: AppRole;
  role_id: string;
}

interface Company {
  id: string;
  name: string;
}

interface UserDetailDialogProps {
  user: UserWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Company[];
  isSystemAdmin: boolean;
  isCustomerAdmin: boolean;
  onUserUpdated: (user: UserWithRole) => void;
  onUserDeleted?: (userId: string) => void;
}

const getRoleOptions = (t: (key: string) => string): { value: AppRole; label: string }[] => [
  { value: 'viewer', label: t('usersTab.role.viewer') || 'Viewer' },
  { value: 'admin', label: t('usersTab.role.admin') || 'Admin' },
  { value: 'msd_csm', label: t('usersTab.role.msdCsm') || 'CSM' },
  { value: 'msd_ma', label: t('usersTab.role.msdMa') || 'MA' },
  { value: 'msd_ops', label: 'MSD-OPS' },
  { value: 'msd_management', label: 'MSD-Management' },
  { value: 'system_admin', label: t('usersTab.role.systemAdmin') || 'System Admin' },
];

const getCustomerRoleOptions = (_t: (key: string) => string): { value: AppRole; label: string }[] => [
  { value: 'viewer', label: 'Viewer' },
  { value: 'admin', label: 'Admin' },
];

const getDateLocale = (lang: string) => {
  const locales: Record<string, Locale> = { de, en: enUS, fr, it, es };
  return locales[lang] || de;
};

const getRoleBadgeVariant = (role: AppRole) => {
  switch (role) {
    case 'system_admin':
      return 'destructive';
    case 'msd_management':
      return 'default';
    case 'msd_csm':
    case 'msd_ma':
    case 'msd_ops':
      return 'secondary';
    case 'admin':
      return 'outline';
    default:
      return 'outline';
  }
};

export function UserDetailDialog({
  user,
  open,
  onOpenChange,
  companies,
  isSystemAdmin,
  isCustomerAdmin,
  onUserUpdated,
  onUserDeleted,
}: UserDetailDialogProps) {
  const { t, language } = useLanguage();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loadingMemberships, setLoadingMemberships] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    company_id: '',
    role: 'viewer' as AppRole,
  });

  const allRoleOptions = getRoleOptions(t);
  const roleOptions = isSystemAdmin ? allRoleOptions : getCustomerRoleOptions(t);

  useEffect(() => {
    if (user && open) {
      setEditForm({
        full_name: user.full_name || '',
        company_id: user.company_id || '',
        role: user.role,
      });
      fetchMemberships();
    } else {
      setMemberships([]);
      setIsEditing(false);
    }
  }, [user, open]);

  const fetchMemberships = async () => {
    if (!user) return;
    
    setLoadingMemberships(true);
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          id,
          company_id,
          role,
          is_primary,
          status,
          created_at,
          companies:company_id (name)
        `)
        .eq('user_id', user.user_id);

      if (error) throw error;

      const formattedMemberships: Membership[] = (data || []).map((m: any) => ({
        id: m.id,
        company_id: m.company_id,
        company_name: m.companies?.name || m.company_id,
        role: m.role,
        is_primary: m.is_primary,
        status: m.status,
        created_at: m.created_at,
      }));

      setMemberships(formattedMemberships);
    } catch (error) {
      console.error('Error fetching memberships:', error);
    } finally {
      setLoadingMemberships(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (isCustomerAdmin && !['viewer', 'admin'].includes(editForm.role)) {
      toast.error(t('memberships.roleAssignError') || 'Sie können nur Viewer oder Admin Rollen zuweisen');
      return;
    }

    try {
      setSaving(true);

      const selectedCompany = companies.find(c => c.id === editForm.company_id);
      const companyChanged = editForm.company_id !== user.company_id;

      if (isSystemAdmin) {
        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: editForm.full_name || null,
            company_id: editForm.company_id || null,
            company_name: selectedCompany?.name || null,
          })
          .eq('user_id', user.user_id);

        if (profileError) throw profileError;

        // If company changed, also update/create the membership
        if (companyChanged && editForm.company_id) {
          // First, check if user has any memberships
          const { data: existingMemberships } = await supabase
            .from('memberships')
            .select('id, company_id')
            .eq('user_id', user.user_id);

          if (existingMemberships && existingMemberships.length > 0) {
            // Update the primary membership to the new company
            const primaryMembership = existingMemberships.find(m => m.company_id === user.company_id || m.company_id === 'PENDING');
            
            if (primaryMembership) {
              const { error: membershipError } = await supabase
                .from('memberships')
                .update({
                  company_id: editForm.company_id,
                  status: 'approved',
                  is_primary: true,
                  role: editForm.role === 'viewer' || editForm.role === 'admin' ? editForm.role : 'viewer',
                })
                .eq('id', primaryMembership.id);

              if (membershipError) throw membershipError;
            } else {
              // Create new membership for the company
              const { error: createError } = await supabase
                .from('memberships')
                .insert({
                  user_id: user.user_id,
                  company_id: editForm.company_id,
                  role: editForm.role === 'viewer' || editForm.role === 'admin' ? editForm.role : 'viewer',
                  is_primary: true,
                  status: 'approved',
                });

              if (createError) throw createError;
            }
          } else {
            // No memberships exist, create one
            const { error: createError } = await supabase
              .from('memberships')
              .insert({
                user_id: user.user_id,
                company_id: editForm.company_id,
                role: editForm.role === 'viewer' || editForm.role === 'admin' ? editForm.role : 'viewer',
                is_primary: true,
                status: 'approved',
              });

            if (createError) throw createError;
          }
        }
      }

      if (editForm.role !== user.role) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: editForm.role })
          .eq('user_id', user.user_id);

        if (roleError) throw roleError;
      }

      // Refresh memberships after changes
      await fetchMemberships();

      onUserUpdated({
        ...user,
        full_name: editForm.full_name || null,
        company_id: editForm.company_id || null,
        company_name: selectedCompany?.name || null,
        role: editForm.role,
      });

      toast.success(t('common.success'));
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      setDeleting(true);

      // Soft delete the user using the database function
      const { error } = await supabase.rpc('soft_delete_user_account', {
        p_user_id: user.user_id,
        p_reason: 'Deleted by administrator',
      });

      if (error) throw error;

      toast.success(t('usersTab.userDeleted') || 'Benutzer wurde gelöscht');
      onUserDeleted?.(user.user_id);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(t('common.error'));
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('common.details')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="full_name">{t('common.name')}</Label>
                  <Input
                    id="full_name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    placeholder={t('auth.fullName')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('common.email')}</Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="bg-secondary/50"
                  />
                </div>

                {isSystemAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="company">{t('settings.company')}</Label>
                    <Select
                      value={editForm.company_id}
                      onValueChange={(value) => setEditForm({ ...editForm, company_id: value })}
                    >
                      <SelectTrigger id="company">
                        <SelectValue placeholder={t('memberships.selectCompany')} />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="role">{t('memberships.role')}</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(value) => setEditForm({ ...editForm, role: value as AppRole })}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                    <User className="h-8 w-8 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-heading text-xl font-semibold text-foreground">
                      {user.full_name || t('memberships.unknown')}
                    </h3>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('settings.company')}:</span>
                    <span className="font-medium">{user.company_name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('memberships.role')}:</span>
                    <Badge variant={getRoleBadgeVariant(user.role) as any}>
                      {allRoleOptions.find((r) => r.value === user.role)?.label || user.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('settingsOverview.registered')}:</span>
                    <span className="font-medium">
                      {format(new Date(user.created_at), 'dd. MMMM yyyy', { locale: getDateLocale(language) })}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Multi-Role Management - Only for System Admins */}
          {isSystemAdmin && !isEditing && (
            <>
              <Separator />
              <UserRolesManager 
                userId={user.user_id} 
                onRolesChanged={fetchMemberships}
              />
            </>
          )}

          {/* Memberships Section - Only show if user has multiple */}
          {memberships.length > 0 && (
            <>
              <Separator />
              
              <Card className="border-accent/20 bg-accent/5">
                <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-accent" />
                    {t('memberships.title')}
                    <Badge variant="outline" className="ml-auto">
                      {memberships.length} {t('settings.company')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {loadingMemberships ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    </div>
                  ) : (
                    memberships.map((membership) => (
                      <div 
                        key={membership.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{membership.company_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {allRoleOptions.find((r) => r.value === membership.role)?.label || membership.role}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {membership.is_primary && (
                            <Badge variant="default" className="gap-1">
                              <Star className="h-3 w-3" />
                              {t('memberships.primary')}
                            </Badge>
                          )}
                          <Badge 
                            variant={
                              membership.status === 'approved' ? 'outline' : 
                              membership.status === 'pending' ? 'secondary' : 'destructive'
                            }
                          >
                            {membership.status === 'approved' ? t('kpis.active') : 
                             membership.status === 'pending' ? t('settings.statusPending') : t('registration.reject')}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <DialogFooter>
          {isEditing ? (
            <div className="flex gap-2 w-full justify-end">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {t('common.save')}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full justify-between">
              {isSystemAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting}>
                      {deleting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      {t('common.delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('usersTab.deleteUser') || 'Benutzer löschen?'}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('usersTab.deleteUserConfirm') || `Möchten Sie "${user.full_name || user.email}" wirklich löschen? Der Benutzer kann sich danach nicht mehr einloggen.`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {t('common.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t('common.close')}
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  {t('common.edit')}
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
