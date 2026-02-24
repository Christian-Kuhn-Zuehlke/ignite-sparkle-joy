import { Users, Building2, Shield, Clock, UserPlus, UserCheck, Activity } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PendingRegistrations } from './PendingRegistrations';
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

interface SettingsOverviewTabProps {
  userCount: number;
  companyCount: number;
  adminCount: number;
  recentUsers: Array<{
    id: string;
    full_name: string | null;
    email: string;
    company_name: string | null;
    created_at: string;
  }>;
  isSystemAdmin: boolean;
  onNavigateToTab?: (tab: string) => void;
}

export function SettingsOverviewTab({
  userCount,
  companyCount,
  adminCount,
  recentUsers,
  isSystemAdmin,
  onNavigateToTab,
}: SettingsOverviewTabProps) {
  const { t, language } = useLanguage();
  
  return (
    <div className="space-y-6">
      {/* Pending Registrations - Only for System Admins */}
      {isSystemAdmin && <PendingRegistrations />}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="border-border bg-card shadow-card cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigateToTab?.('users')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('settingsOverview.totalUsers')}</p>
                <p className="font-heading text-3xl font-bold text-foreground">
                  {userCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isSystemAdmin && (
          <Card 
            className="border-border bg-card shadow-card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigateToTab?.('companies')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-shipped/10">
                  <Building2 className="h-6 w-6 text-status-shipped" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('settings.company')}</p>
                  <p className="font-heading text-3xl font-bold text-foreground">
                    {companyCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border bg-card shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('settingsOverview.administrators')}</p>
                <p className="font-heading text-3xl font-bold text-foreground">
                  {adminCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-ready/10">
                <UserPlus className="h-6 w-6 text-status-ready" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('settingsOverview.new30Days')}</p>
                <p className="font-heading text-3xl font-bold text-foreground">
                  {recentUsers.filter(u => {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return new Date(u.created_at) > thirtyDaysAgo;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-border bg-card shadow-card">
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            <CardTitle className="text-lg">{t('settingsOverview.recentActivity')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">{t('settingsOverview.noActivity')}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentUsers.slice(0, 8).map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                    <UserCheck className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {user.full_name || t('registration.unknown')}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                      {user.company_name && (
                        <span className="text-muted-foreground/60"> • {user.company_name}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {t('settingsOverview.registered')}
                    </Badge>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: dateFnsLocales[language] })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
