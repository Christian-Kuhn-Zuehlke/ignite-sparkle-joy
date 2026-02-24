import { useState, useEffect } from 'react';
import { Shield, Plus, X, Loader2, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

type AppRole = 'viewer' | 'admin' | 'msd_csm' | 'msd_ma' | 'msd_ops' | 'msd_management' | 'system_admin';

interface UserRole {
  id: string;
  role: AppRole;
}

interface UserRolesManagerProps {
  userId: string;
  onRolesChanged?: () => void;
}

const ROLE_KEYS: AppRole[] = ['viewer', 'admin', 'msd_csm', 'msd_ma', 'msd_ops', 'msd_management', 'system_admin'];

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

export function UserRolesManager({ userId, onRolesChanged }: UserRolesManagerProps) {
  const { t } = useLanguage();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<AppRole | ''>('');

  useEffect(() => {
    fetchUserRoles();
  }, [userId]);

  const fetchUserRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, role')
        .eq('user_id', userId);

      if (error) throw error;
      setUserRoles((data || []).map(r => ({ id: r.id, role: r.role as AppRole })));
    } catch (error) {
      console.error('Error fetching user roles:', error);
      toast.error(t('roles.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedNewRole) return;

    // Check if role already exists
    if (userRoles.some(r => r.role === selectedNewRole)) {
      toast.error(t('roles.alreadyAssigned'));
      return;
    }

    try {
      setAdding(true);
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: selectedNewRole })
        .select('id, role')
        .single();

      if (error) throw error;

      setUserRoles(prev => [...prev, { id: data.id, role: data.role as AppRole }]);
      setSelectedNewRole('');
      toast.success(t('roles.added'));
      onRolesChanged?.();
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error(t('roles.addError'));
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    // Prevent removing the last role
    if (userRoles.length <= 1) {
      toast.error(t('roles.minOneRole'));
      return;
    }

    try {
      setRemoving(roleId);
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      setUserRoles(prev => prev.filter(r => r.id !== roleId));
      toast.success(t('roles.removed'));
      onRolesChanged?.();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error(t('roles.removeError'));
    } finally {
      setRemoving(null);
    }
  };

  // Available roles to add (exclude already assigned)
  const availableRoles = ROLE_KEYS.filter(
    role => !userRoles.some(ur => ur.role === role)
  );

  if (loading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          {t('roles.management')}
          <Badge variant="outline" className="ml-auto">
            {userRoles.length} {userRoles.length === 1 ? t('roles.role') : t('roles.rolesPlural')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Roles */}
        <div className="space-y-2">
          {userRoles.map((userRole) => {
            return (
              <div
                key={userRole.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-3"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={getRoleBadgeVariant(userRole.role) as any}>
                    {t(`roles.${userRole.role}`)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {t(`roles.${userRole.role}Desc`)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemoveRole(userRole.id)}
                  disabled={removing === userRole.id || userRoles.length <= 1}
                >
                  {removing === userRole.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Add Role */}
        {availableRoles.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Select
              value={selectedNewRole}
              onValueChange={(value) => setSelectedNewRole(value as AppRole)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t('roles.addRole')} />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex flex-col">
                      <span>{t(`roles.${role}`)}</span>
                      <span className="text-xs text-muted-foreground">
                        {t(`roles.${role}Desc`)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleAddRole}
              disabled={!selectedNewRole || adding}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {availableRoles.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
            <Check className="h-3 w-3 inline mr-1" />
            {t('roles.allAssigned')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}