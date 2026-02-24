import { useState } from 'react';
import { Users, Search, Loader2, Clock } from 'lucide-react';
import { formatDistanceToNow, Locale } from 'date-fns';
import { de, enUS, fr, it, es } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { UserDetailDialog } from './UserDetailDialog';

type AppRole = 'viewer' | 'admin' | 'msd_csm' | 'msd_ma' | 'msd_ops' | 'msd_management' | 'system_admin';

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
  membership_count?: number;
}

interface Company {
  id: string;
  name: string;
}

interface UsersTabProps {
  users: UserWithRole[];
  companies: Company[];
  loading: boolean;
  isSystemAdmin: boolean;
  isCustomerAdmin: boolean;
  currentUserCompanyId: string | null;
  onUserUpdated: (user: UserWithRole) => void;
  onUserDeleted?: (userId: string) => void;
}

const getRoleOptions = (t: (key: string) => string): { value: AppRole; label: string }[] => [
  { value: 'viewer', label: t('roles.viewer') },
  { value: 'admin', label: t('roles.admin') },
  { value: 'msd_csm', label: t('roles.msd_csm') },
  { value: 'msd_ma', label: t('roles.msd_ma') },
  { value: 'msd_ops', label: t('roles.msd_ops') },
  { value: 'msd_management', label: t('roles.msd_management') },
  { value: 'system_admin', label: t('roles.system_admin') },
];

const getDateLocale = (lang: string) => {
  const locales: Record<string, Locale> = { de, en: enUS, fr, it, es };
  return locales[lang] || de;
};

const getRoleBadgeVariant = (role: AppRole) => {
  switch (role) {
    case 'system_admin':
      return 'destructive';
    case 'msd_csm':
    case 'msd_ma':
      return 'default';
    case 'admin':
      return 'secondary';
    default:
      return 'outline';
  }
};

export function UsersTab({
  users,
  companies,
  loading,
  isSystemAdmin,
  isCustomerAdmin,
  currentUserCompanyId,
  onUserUpdated,
  onUserDeleted,
}: UsersTabProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const roleOptions = getRoleOptions(t);

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const canEditUser = (user: UserWithRole) => {
    if (isSystemAdmin) return true;
    if (isCustomerAdmin) {
      return user.company_id === currentUserCompanyId && ['viewer', 'admin'].includes(user.role);
    }
    return false;
  };

  const handleUserClick = (user: UserWithRole) => {
    if (canEditUser(user)) {
      setSelectedUser(user);
      setDialogOpen(true);
    }
  };

  const handleUserUpdated = (updatedUser: UserWithRole) => {
    onUserUpdated(updatedUser);
    setSelectedUser(updatedUser);
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t('usersTab.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            <h3 className="font-heading text-base font-semibold text-foreground">
              {isSystemAdmin ? t('usersTab.title') : t('usersTab.teamUsers')}
            </h3>
            <Badge variant="outline" className="ml-2">
              {filteredUsers.length}
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="font-semibold">{t('common.name')}</TableHead>
                <TableHead className="font-semibold">{t('common.email')}</TableHead>
                {isSystemAdmin && <TableHead className="font-semibold">{t('settings.company')}</TableHead>}
                <TableHead className="font-semibold">{t('memberships.role')}</TableHead>
                <TableHead className="font-semibold">{t('usersTab.lastLogin')}</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSystemAdmin ? 6 : 5} className="text-center py-8">
                    <p className="text-muted-foreground">{t('usersTab.noUsers')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user, index) => {
                  const canEdit = canEditUser(user);
                  
                  return (
                    <TableRow
                      key={user.user_id}
                      className={cn(
                        "animate-fade-in",
                        canEdit && "cursor-pointer hover:bg-secondary/50 transition-colors"
                      )}
                      style={{ animationDelay: `${index * 30}ms` }}
                      onClick={() => handleUserClick(user)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {user.full_name || '—'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{user.email}</span>
                      </TableCell>
                      {isSystemAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {user.company_name || '—'}
                            </span>
                            {user.membership_count && user.membership_count > 1 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.membership_count - 1}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role) as any}>
                          {roleOptions.find((r) => r.value === user.role)?.label || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.last_login_at ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(user.last_login_at), {
                                addSuffix: true,
                                locale: getDateLocale(language),
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">{t('deletedUsers.none')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUserClick(user);
                            }}
                          >
                            {t('common.details')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* User Detail Dialog */}
      <UserDetailDialog
        user={selectedUser}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        companies={companies}
        isSystemAdmin={isSystemAdmin}
        isCustomerAdmin={isCustomerAdmin}
        onUserUpdated={handleUserUpdated}
        onUserDeleted={(userId) => {
          onUserDeleted?.(userId);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
