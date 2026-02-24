import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from '@/components/icons';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'viewer' | 'admin' | 'msd_csm' | 'msd_ma' | 'msd_ops' | 'msd_management' | 'system_admin'>;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, roles, loading } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted-foreground">{t('common.loadingApp')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check if user has ANY of the allowed roles (multi-role support)
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = roles.some(r => allowedRoles.includes(r));
    if (!hasAllowedRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
