import { useState, useEffect } from 'react';
import { Users, Building2, Plus, Settings2, Bell, Search, Edit2, Loader2, LayoutDashboard, Wrench, User } from '@/components/icons';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection';
import { ChangePasswordSection } from '@/components/settings/ChangePasswordSection';
import { SettingsOverviewTab } from '@/components/settings/SettingsOverviewTab';
import { UsersTab } from '@/components/settings/UsersTab';
import { ConfigurationTab } from '@/components/settings/ConfigurationTab';
import { SystemTab } from '@/components/settings/SystemTab';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';


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
}

interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  brand_keywords: string[] | null;
  primary_color: string | null;
  accent_color: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  status?: 'pending' | 'onboarding' | 'live' | 'paused' | 'churned' | null;
  go_live_date?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
}

export default function Settings() {
  const { role: currentUserRole, profile } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companySearch, setCompanySearch] = useState('');
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  // Company management state - simplified (wizard only)
  const [selectedCompanyForApps, setSelectedCompanyForApps] = useState<string>('');
  const [onboardingWizardOpen, setOnboardingWizardOpen] = useState(false);
  const [editingCompanyForOnboarding, setEditingCompanyForOnboarding] = useState<string | undefined>(undefined);

  // Role-based access
  const isSystemAdmin = currentUserRole === 'system_admin';
  const isCustomerAdmin = currentUserRole === 'admin';
  const isMsdStaff = currentUserRole === 'msd_csm' || currentUserRole === 'msd_ma';
  const isViewer = currentUserRole === 'viewer';
  const canManageUsers = isSystemAdmin || isCustomerAdmin;

  // Tab visibility based on role - NEW STRUCTURE: 5 tabs
  const visibleTabs = {
    overview: isSystemAdmin || isCustomerAdmin,
    users: isSystemAdmin || isCustomerAdmin,
    companies: isSystemAdmin,
    configuration: isSystemAdmin || isCustomerAdmin,
    system: isSystemAdmin || isMsdStaff || isCustomerAdmin,
    notifications: true,
    account: true,
  };

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
      if (isSystemAdmin) {
        fetchCompanies();
      } else {
        setCompaniesLoading(false);
      }
    } else {
      setLoading(false);
      setCompaniesLoading(false);
    }
  }, [canManageUsers, isSystemAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map((userProfile) => {
        const userRole = roles?.find((r) => r.user_id === userProfile.user_id);
        return {
          ...userProfile,
          role: (userRole?.role as AppRole) || 'viewer',
          role_id: userRole?.id || '',
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(t('common.errorLoadingUsers'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      setCompaniesLoading(true);
      
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error(t('common.errorLoadingCompanies'));
    } finally {
      setCompaniesLoading(false);
    }
  };

  // Companies are now edited through the Onboarding Wizard only
  const handleEditCompany = (companyId: string) => {
    setEditingCompanyForOnboarding(companyId);
    setOnboardingWizardOpen(true);
  };

  const handleNewCompany = () => {
    setEditingCompanyForOnboarding(undefined);
    setOnboardingWizardOpen(true);
  };

  const filteredCompanies = companies.filter(
    (company) =>
      company.id.toLowerCase().includes(companySearch.toLowerCase()) ||
      company.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const handleUserUpdated = (updatedUser: UserWithRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.user_id === updatedUser.user_id ? updatedUser : u))
    );
  };

  // Determine page title based on role
  const getPageTitle = () => {
    if (isSystemAdmin) return t('settings.systemAdmin');
    if (isCustomerAdmin) return t('settings.teamManagement');
    if (isMsdStaff) return t('settings.mySettings');
    return t('settings.title');
  };

  const getPageSubtitle = () => {
    if (isSystemAdmin) return t('settings.systemAdminDesc');
    if (isCustomerAdmin) return `${profile?.company_name || t('settings.yourCompany')} ${t('settings.manage')}`;
    if (isMsdStaff) return t('settings.personalSettings');
    return t('settings.accountSettings');
  };

  const getDefaultTab = () => {
    if (visibleTabs.overview) return 'overview';
    if (visibleTabs.notifications) return 'notifications';
    return 'account';
  };

  // Handle tab navigation from stat cards
  const handleNavigateToTab = (tab: string) => {
    setActiveTab(tab);
  };

  // For non-admin users, show only notifications and account
  const showSimpleView = !canManageUsers && !isMsdStaff;

  return (
    <MainLayout title={getPageTitle()} subtitle={getPageSubtitle()}>
      {/* Company Info for Customer Admins */}
      {isCustomerAdmin && profile?.company_name && (
        <div className="mb-6 rounded-xl border border-accent/20 bg-accent/5 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
              <Building2 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-foreground">
                {profile.company_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('settings.manageYourCompany')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info for Viewer/MSD Staff */}
      {(isViewer || isMsdStaff) && (
        <div className="mb-6 rounded-xl border border-border bg-secondary/30 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-foreground">
                {t('settings.personalSettings')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('settings.manageNotifications')}
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} defaultValue={getDefaultTab()} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        {/* Admin/Manager Tabs - Scrollable on mobile */}
        {(canManageUsers || isMsdStaff) && (
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex min-w-max md:grid md:w-full md:max-w-3xl md:grid-cols-5 gap-1">
              {visibleTabs.overview && (
                <TabsTrigger value="overview" className="gap-1.5 sm:gap-2 px-3 sm:px-4">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">{t('settings.overview')}</span>
                </TabsTrigger>
              )}
              {visibleTabs.users && (
                <TabsTrigger value="users" className="gap-1.5 sm:gap-2 px-3 sm:px-4">
                  <Users className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">{t('settings.users')}</span>
                </TabsTrigger>
              )}
              {visibleTabs.companies && (
                <TabsTrigger value="companies" className="gap-1.5 sm:gap-2 px-3 sm:px-4">
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">{t('settings.company')}</span>
                </TabsTrigger>
              )}
              {visibleTabs.configuration && (
                <TabsTrigger value="configuration" className="gap-1.5 sm:gap-2 px-3 sm:px-4">
                  <Settings2 className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">{t('settings.configuration')}</span>
                </TabsTrigger>
              )}
              {visibleTabs.system && (
                <TabsTrigger value="system" className="gap-1.5 sm:gap-2 px-3 sm:px-4">
                  <Wrench className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">{t('settings.system')}</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>
        )}

        {/* Simple view tabs for Viewer */}
        {showSimpleView && (
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="notifications" className="gap-1.5 sm:gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-xs sm:text-sm">{t('settings.notifications')}</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-1.5 sm:gap-2">
              <User className="h-4 w-4" />
              <span className="text-xs sm:text-sm">{t('settings.account')}</span>
            </TabsTrigger>
          </TabsList>
        )}

        {/* Overview Tab */}
        {visibleTabs.overview && (
          <TabsContent value="overview" className="space-y-6">
            <SettingsOverviewTab
              userCount={users.length}
              companyCount={companies.length}
              adminCount={users.filter((u) => ['admin', 'msd_csm', 'msd_ma', 'system_admin'].includes(u.role)).length}
              recentUsers={users.slice(0, 8)}
              isSystemAdmin={isSystemAdmin}
              onNavigateToTab={handleNavigateToTab}
            />
          </TabsContent>
        )}

        {/* Users Tab */}
        {visibleTabs.users && (
          <TabsContent value="users" className="space-y-6">
            <UsersTab
              users={users}
              companies={companies}
              loading={loading}
              isSystemAdmin={isSystemAdmin}
              isCustomerAdmin={isCustomerAdmin}
              currentUserCompanyId={profile?.company_id || null}
              onUserUpdated={handleUserUpdated}
              onUserDeleted={(userId) => {
                setUsers(users.filter(u => u.user_id !== userId));
              }}
            />
          </TabsContent>
        )}

        {/* Companies Tab */}
        {visibleTabs.companies && (
          <TabsContent value="companies" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('settings.searchCompanies')}
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleNewCompany} className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.newCompany')}</span>
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              <div className="border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-accent" />
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {t('settings.allCompanies')}
                  </h3>
                  <Badge variant="outline" className="ml-2">
                    {filteredCompanies.length}
                  </Badge>
                </div>
              </div>

              {companiesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="font-semibold">ID</TableHead>
                      <TableHead className="font-semibold">{t('common.name')}</TableHead>
                      <TableHead className="font-semibold">{t('common.status')}</TableHead>
                      <TableHead className="font-semibold">Domain</TableHead>
                      <TableHead className="font-semibold">{t('settings.users')}</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <p className="text-muted-foreground">{t('settings.noCompaniesFound')}</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCompanies.map((company, index) => {
                        const getStatusBadge = (status?: string | null) => {
                          switch (status) {
                            case 'live':
                              return <Badge className="bg-green-500 hover:bg-green-600">{t('settings.statusLive')}</Badge>;
                            case 'onboarding':
                              return <Badge variant="default">{t('settings.statusOnboarding')}</Badge>;
                            case 'pending':
                              return <Badge variant="secondary">{t('settings.statusPending')}</Badge>;
                            case 'paused':
                              return <Badge variant="outline">{t('settings.statusPaused')}</Badge>;
                            case 'churned':
                              return <Badge variant="destructive">{t('settings.statusInactive')}</Badge>;
                            default:
                              return <Badge variant="secondary">{t('common.new')}</Badge>;
                          }
                        };

                        return (
                          <TableRow
                            key={company.id}
                            className="animate-fade-in hover:bg-secondary/50 transition-colors cursor-pointer"
                            style={{ animationDelay: `${index * 30}ms` }}
                            onClick={() => handleEditCompany(company.id)}
                          >
                            <TableCell>
                              {company.logo_url ? (
                                <img 
                                  src={company.logo_url} 
                                  alt={company.name} 
                                  loading="lazy"
                                  decoding="async"
                                  className="h-8 w-8 rounded object-contain bg-white border border-border"
                                />
                              ) : (
                                <div 
                                  className="h-8 w-8 rounded flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: company.primary_color || '#6366f1' }}
                                >
                                  {company.id.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <code className="rounded bg-secondary px-2 py-0.5 text-xs">
                                {company.id}
                              </code>
                            </TableCell>
                            <TableCell className="font-medium">
                              {company.name}
                            </TableCell>
                            <TableCell>{getStatusBadge(company.status)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {company.domain || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {users.filter((u) => u.company_id === company.id).length}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditCompany(company.id);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        )}

        {/* Configuration Tab */}
        {visibleTabs.configuration && (
          <TabsContent value="configuration" className="space-y-6">
            <ConfigurationTab
              isSystemAdmin={isSystemAdmin}
              isCustomerAdmin={isCustomerAdmin}
              companies={companies}
              selectedCompanyId={selectedCompanyForApps}
              onCompanyChange={setSelectedCompanyForApps}
              currentUserCompanyId={profile?.company_id || null}
              currentUserCompanyName={profile?.company_name || null}
            />
          </TabsContent>
        )}

        {/* System Tab */}
        {visibleTabs.system && (
          <TabsContent value="system" className="space-y-6">
            <SystemTab
              isSystemAdmin={isSystemAdmin}
              canViewAuditLog={isSystemAdmin || isMsdStaff || isCustomerAdmin}
            />
          </TabsContent>
        )}

        {/* Notifications Tab - Available to everyone */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>

        {/* Account Tab - Available to everyone */}
        <TabsContent value="account" className="space-y-6">
          <ChangePasswordSection />
          <DeleteAccountSection />
        </TabsContent>
      </Tabs>

      {/* Onboarding Wizard Dialog */}
      <OnboardingWizard
        open={onboardingWizardOpen}
        onOpenChange={(open) => {
          setOnboardingWizardOpen(open);
          if (!open) {
            setEditingCompanyForOnboarding(undefined);
            fetchCompanies();
          }
        }}
        companyId={editingCompanyForOnboarding}
        onComplete={() => fetchCompanies()}
      />

    </MainLayout>
  );
}
