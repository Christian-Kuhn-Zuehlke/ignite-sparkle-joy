import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from '@/components/icons';

/**
 * Index page that redirects users to their role-specific dashboard.
 * With multi-role support, uses the highest-priority role to determine the dashboard.
 * 
 * Priority order (highest first):
 * 1. system_admin → Executive Dashboard
 * 2. msd_management → Executive Dashboard
 * 3. msd_ops → Operations Dashboard
 * 4. msd_csm → Customer Cockpit
 * 5. admin/viewer → Standard Dashboard
 */
const Index = () => {
  const navigate = useNavigate();
  const { loading, hasRole } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Multi-role: check in priority order for best dashboard
    if (hasRole('system_admin') || hasRole('msd_management')) {
      navigate('/executive', { replace: true });
    } else if (hasRole('msd_ops')) {
      // TODO: Create Operations Dashboard at /operations
      navigate('/dashboard', { replace: true });
    } else if (hasRole('msd_csm')) {
      // TODO: Create Customer Cockpit at /customer-cockpit
      navigate('/dashboard', { replace: true });
    } else {
      // Regular users (viewer, admin, msd_ma) go to standard dashboard
      navigate('/dashboard', { replace: true });
    }
    // Note: hasRole is now memoized in AuthContext, so it's stable
  }, [loading, navigate, hasRole]);

  // Show loading while determining where to redirect
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground">Laden...</p>
      </div>
    </div>
  );
};

export default Index;
