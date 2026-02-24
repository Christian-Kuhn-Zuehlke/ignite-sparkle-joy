import { useState } from 'react';
import { Users, Plus, Trash2, Search, Building2, UserCheck } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useAllMemberships,
  useCompanyMemberships,
  useAddMembership,
  useUpdateMembership,
  useRemoveMembership,
  useAllCSMAssignments,
  useAddCSMAssignment,
  useRemoveCSMAssignment,
  type Membership,
} from '@/hooks/useMemberships';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de, enGB, fr, it, es } from 'date-fns/locale';

interface Company {
  id: string;
  name: string;
}

interface MSDStaffUser {
  user_id: string;
  email: string;
  full_name: string | null;
}

interface MembershipsManagementProps {
  companies: Company[];
}

const getDateLocale = (lang: string) => {
  switch (lang) {
    case 'de': return de;
    case 'fr': return fr;
    case 'it': return it;
    case 'es': return es;
    default: return enGB;
  }
};

const getRoleBadgeVariant = (role: string) => {
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

export function MembershipsManagement({ companies }: MembershipsManagementProps) {
  const { role: currentUserRole, profile } = useAuth();
  const { t, language } = useLanguage();
  const isSystemAdmin = currentUserRole === 'system_admin';
  const isCustomerAdmin = currentUserRole === 'admin';

  const [search, setSearch] = useState('');
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false);
  const [csmDialogOpen, setCsmDialogOpen] = useState(false);
  const [msdUsers, setMsdUsers] = useState<MSDStaffUser[]>([]);
  const [, setLoadingMsdUsers] = useState(false);
  
  const [newMembership, setNewMembership] = useState({
    user_email: '',
    company_id: '',
    role: 'viewer' as 'viewer' | 'admin',
    is_primary: false,
  });

  const [newCsmAssignment, setNewCsmAssignment] = useState({
    csm_user_id: '',
    company_id: '',
  });

  // Hooks based on role
  const { data: allMemberships = [], isLoading: loadingMemberships } = useAllMemberships();
  const { data: companyMemberships = [] } = useCompanyMemberships(
    isCustomerAdmin ? profile?.company_id || null : null
  );
  const { data: csmAssignments = [], isLoading: loadingAssignments } = useAllCSMAssignments();

  const addMembership = useAddMembership();
  const updateMembership = useUpdateMembership();
  const removeMembership = useRemoveMembership();
  const addCsmAssignment = useAddCSMAssignment();
  const removeCsmAssignment = useRemoveCSMAssignment();

  // Use appropriate memberships list based on role
  const memberships = isSystemAdmin ? allMemberships : companyMemberships;

  const filteredMemberships = memberships.filter(m =>
    m.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    m.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAssignments = csmAssignments.filter(a =>
    a.csm_email?.toLowerCase().includes(search.toLowerCase()) ||
    a.csm_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      viewer: 'Viewer',
      admin: 'Admin',
      msd_csm: 'CSM',
      msd_ma: 'MA',
      system_admin: 'Sys-Admin',
    };
    return labels[role] || role;
  };

  const fetchMsdUsers = async () => {
    setLoadingMsdUsers(true);
    try {
      // Get all profiles with MSD roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['msd_ops', 'csm'] as any[]);

      if (rolesError) throw rolesError;

      if (roles && roles.length > 0) {
        const userIds = roles.map(r => r.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;
        setMsdUsers((profiles || []) as any);
      }
    } catch (error) {
      console.error('Error fetching MSD users:', error);
      toast.error(t('memberships.msdStaffLoadError'));
    } finally {
      setLoadingMsdUsers(false);
    }
  };

  const handleOpenCsmDialog = () => {
    fetchMsdUsers();
    setCsmDialogOpen(true);
  };

  const handleAddMembership = async () => {
    if (!newMembership.user_email || !newMembership.company_id) {
      toast.error(t('memberships.fillRequired'));
      return;
    }

    try {
      // Find user by email
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', newMembership.user_email)
        .single();

      if (error || !profile) {
        toast.error(t('memberships.userNotFound'));
        return;
      }

      await addMembership.mutateAsync({
        user_id: profile.user_id,
        company_id: newMembership.company_id,
        role: newMembership.role,
        is_primary: newMembership.is_primary,
      });

      setMembershipDialogOpen(false);
      setNewMembership({ user_email: '', company_id: '', role: 'viewer', is_primary: false });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleAddCsmAssignment = async () => {
    if (!newCsmAssignment.csm_user_id || !newCsmAssignment.company_id) {
      toast.error(t('memberships.selectCsmAndCompany'));
      return;
    }

    try {
      await addCsmAssignment.mutateAsync({
        csm_user_id: newCsmAssignment.csm_user_id,
        company_id: newCsmAssignment.company_id,
      });

      setCsmDialogOpen(false);
      setNewCsmAssignment({ csm_user_id: '', company_id: '' });
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleTogglePrimary = async (membership: Membership) => {
    await updateMembership.mutateAsync({
      id: membership.id,
      is_primary: !membership.is_primary,
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="memberships">
        <TabsList>
          <TabsTrigger value="memberships" className="gap-2">
            <Users className="h-4 w-4" />
            {t('memberships.title')}
          </TabsTrigger>
          {isSystemAdmin && (
            <TabsTrigger value="csm-assignments" className="gap-2">
              <UserCheck className="h-4 w-4" />
              {t('memberships.csmAssignments')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="memberships" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t('memberships.userMemberships')}
                  </CardTitle>
                  <CardDescription>
                    {t('memberships.manageAccess')}
                  </CardDescription>
                </div>
                <Button onClick={() => setMembershipDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('memberships.addMembership')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('memberships.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('memberships.user')}</TableHead>
                      <TableHead>{t('settingsCommon.company')}</TableHead>
                      <TableHead>{t('memberships.role')}</TableHead>
                      <TableHead className="text-center">{t('memberships.primary')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMemberships ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {t('common.loading')}
                        </TableCell>
                      </TableRow>
                    ) : filteredMemberships.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {t('memberships.noMemberships')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMemberships.map((membership) => (
                        <TableRow key={membership.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{membership.user_name || t('memberships.unknown')}</div>
                              <div className="text-sm text-muted-foreground">{membership.user_email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {membership.company_name || membership.company_id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(membership.role)}>
                              {getRoleLabel(membership.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={membership.is_primary}
                              onCheckedChange={() => handleTogglePrimary(membership)}
                              disabled={updateMembership.isPending}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMembership.mutate(membership.id)}
                              disabled={removeMembership.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isSystemAdmin && (
          <TabsContent value="csm-assignments" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5" />
                      {t('memberships.csmAssignments')}
                    </CardTitle>
                    <CardDescription>
                      {t('memberships.assignMsdStaff')}
                    </CardDescription>
                  </div>
                  <Button onClick={handleOpenCsmDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('memberships.assignCsm')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CSM</TableHead>
                        <TableHead>{t('settingsCommon.company')}</TableHead>
                        <TableHead>{t('memberships.assignedAt')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingAssignments ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {t('common.loading')}
                          </TableCell>
                        </TableRow>
                      ) : filteredAssignments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {t('memberships.noAssignments')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAssignments.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{assignment.csm_name || t('memberships.unknown')}</div>
                                <div className="text-sm text-muted-foreground">{assignment.csm_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {assignment.company_name || assignment.company_id}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(assignment.created_at), 'dd.MM.yyyy', { locale: getDateLocale(language) })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeCsmAssignment.mutate(assignment.id)}
                                disabled={removeCsmAssignment.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Membership Dialog */}
      <Dialog open={membershipDialogOpen} onOpenChange={setMembershipDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('memberships.addTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('memberships.userEmail')}</Label>
              <Input
                placeholder="user@example.com"
                value={newMembership.user_email}
                onChange={(e) => setNewMembership({ ...newMembership, user_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('settingsCommon.company')}</Label>
              <Select
                value={newMembership.company_id}
                onValueChange={(value) => setNewMembership({ ...newMembership, company_id: value })}
              >
                <SelectTrigger>
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
            <div className="space-y-2">
              <Label>{t('memberships.role')}</Label>
              <Select
                value={newMembership.role}
                onValueChange={(value) => setNewMembership({ ...newMembership, role: value as 'viewer' | 'admin' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>{t('memberships.primary')}</Label>
              <Switch
                checked={newMembership.is_primary}
                onCheckedChange={(checked) => setNewMembership({ ...newMembership, is_primary: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMembershipDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddMembership} disabled={addMembership.isPending}>
              {addMembership.isPending ? t('settingsCommon.creating') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add CSM Assignment Dialog */}
      <Dialog open={csmDialogOpen} onOpenChange={setCsmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('memberships.assignCsm')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>CSM</Label>
              <Select
                value={newCsmAssignment.csm_user_id}
                onValueChange={(value) => setNewCsmAssignment({ ...newCsmAssignment, csm_user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('memberships.selectCsm')} />
                </SelectTrigger>
                <SelectContent>
                  {msdUsers.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('settingsCommon.company')}</Label>
              <Select
                value={newCsmAssignment.company_id}
                onValueChange={(value) => setNewCsmAssignment({ ...newCsmAssignment, company_id: value })}
              >
                <SelectTrigger>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsmDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddCsmAssignment} disabled={addCsmAssignment.isPending}>
              {addCsmAssignment.isPending ? t('settingsCommon.creating') : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}