import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { identifySentryUser, clearSentryUser } from '@/lib/sentry';
import { useSessionExpiry } from '@/hooks/useSessionExpiry';
import { safeLocalStorageGet, safeLocalStorageSet, safeLocalStorageRemove } from '@/lib/storage';
import { useQueryClient } from '@tanstack/react-query';

type AppRole = 'viewer' | 'admin' | 'msd_csm' | 'msd_ma' | 'msd_ops' | 'msd_management' | 'system_admin';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  company_id: string | null;
  company_name: string | null;
}

interface Membership {
  id: string;
  user_id: string;
  company_id: string;
  role: AppRole;
  is_primary: boolean;
  company_name?: string;
  company_logo_url?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null; // Primary role (first one) for backwards compatibility
  roles: AppRole[]; // All roles the user has
  loading: boolean;
  // Multi-company support
  memberships: Membership[];
  activeCompanyId: string | null;
  activeCompanyName: string | null;
  setActiveCompanyId: (companyId: string | null) => void;
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, companyId: string | null, requestedCompanyName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  getRoleLabel: (role: AppRole) => string;
  // Helper methods - now check ALL roles
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (...roles: AppRole[]) => boolean;
  isMsdStaff: () => boolean;
  isSystemAdmin: () => boolean;
  isMsdOps: () => boolean;
  isMsdManagement: () => boolean;
  isAdmin: () => boolean;
  canViewAllCompanies: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// User-specific storage key to prevent branding cache issues between different users
const getActiveCompanyKey = (userId: string) => `msd_active_company_${userId}`;

// Legacy key for backwards compatibility cleanup
const LEGACY_ACTIVE_COMPANY_KEY = 'msd_active_company';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const previousUserIdRef = useRef<string | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Helper to reset CSS variables to defaults (prevents branding cache issues)
  const resetCSSVariables = useCallback(() => {
    const root = document.documentElement;
    // Reset to MSD default colors
    root.style.setProperty('--primary', '220 60% 20%');
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--primary-button', '220 60% 20%');
    root.style.setProperty('--primary-button-hover', '220 60% 15%');
    root.style.setProperty('--accent', '175 60% 40%');
    root.style.setProperty('--accent-foreground', '0 0% 100%');
    root.style.setProperty('--sidebar-background', '220 60% 20%');
    root.style.setProperty('--sidebar-foreground', '210 20% 90%');
    root.style.setProperty('--sidebar-primary', '175 60% 50%');
    root.style.setProperty('--sidebar-primary-foreground', '0 0% 100%');
    root.style.setProperty('--sidebar-accent', '220 60% 28%');
    root.style.setProperty('--sidebar-accent-foreground', '0 0% 100%');
    root.style.setProperty('--sidebar-border', '220 60% 25%');
    root.style.setProperty('--sidebar-ring', '175 60% 40%');
    console.log('🎨 CSS variables reset to MSD defaults');
  }, []);

  const fetchUserData = async (userId: string) => {
    // Clean up legacy storage key and any other user's company key
    safeLocalStorageRemove(LEGACY_ACTIVE_COMPANY_KEY);
    
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else {
        setProfile(profileData);
      }

      // Fetch ALL roles (multi-role support)
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        setRoles([]);
      } else {
        const userRoles = (rolesData || []).map(r => r.role as AppRole);
        setRoles(userRoles);
      }

      // Fetch memberships with company details
      const { data: membershipData, error: membershipError } = await supabase
        .from('memberships')
        .select(`
          *,
          companies:company_id (name, logo_url)
        `)
        .eq('user_id', userId)
        .order('is_primary', { ascending: false });

      if (membershipError) {
        console.error('Error fetching memberships:', membershipError);
      } else {
        const formattedMemberships = (membershipData || []).map(m => ({
          id: m.id,
          user_id: m.user_id,
          company_id: m.company_id,
          role: m.role as AppRole,
          is_primary: m.is_primary,
          company_name: (m.companies as any)?.name,
          company_logo_url: (m.companies as any)?.logo_url,
        }));
        setMemberships(formattedMemberships);

        // Get the user's roles to determine default company
        const { data: userRolesData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        
        const userRolesList = (userRolesData || []).map(r => r.role as AppRole);
        const isMsdStaffRole = userRolesList.some(r => 
          ['msd_csm', 'msd_ma', 'msd_ops', 'msd_management', 'system_admin'].includes(r)
        );

        // Restore or set active company - USER SPECIFIC key to prevent cache issues
        const userCompanyKey = getActiveCompanyKey(userId);
        const storedCompanyId = safeLocalStorageGet(userCompanyKey);
        
        // For MSD staff: default to "ALL" (Alle Kunden)
        if (isMsdStaffRole) {
          // Use stored value if it exists, otherwise default to "ALL"
          if (storedCompanyId) {
            setActiveCompanyIdState(storedCompanyId);
          } else {
            setActiveCompanyIdState('ALL');
            safeLocalStorageSet(userCompanyKey, 'ALL');
          }
        } else {
          // For regular users: validate stored company against their memberships
          // This prevents showing invalid company selections after user switches
          const validStoredCompany = storedCompanyId && storedCompanyId !== 'ALL'
            ? formattedMemberships.find(m => m.company_id === storedCompanyId)
            : null;
          
          if (validStoredCompany) {
            setActiveCompanyIdState(storedCompanyId);
          } else {
            // Clear invalid stored value and use primary/first company
            if (storedCompanyId) {
              safeLocalStorageRemove(userCompanyKey);
            }
            // Fall back to primary company or first membership
            const primaryMembership = formattedMemberships.find(m => m.is_primary);
            const defaultCompanyId = primaryMembership?.company_id || formattedMemberships[0]?.company_id || profileData?.company_id || null;
            setActiveCompanyIdState(defaultCompanyId);
            if (defaultCompanyId) {
              safeLocalStorageSet(userCompanyKey, defaultCompanyId);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout to prevent deadlock
        if (session?.user) {
          // Check if this is a different user than before - if so, clear the cache and reset CSS
          // This prevents showing old company data (branding, features) for new user
          if (previousUserIdRef.current && previousUserIdRef.current !== session.user.id) {
            console.log('User switched, clearing React Query cache and resetting branding');
            queryClient.clear();
            resetCSSVariables();
            // Don't remove the NEW user's company key - just the old one
            safeLocalStorageRemove(getActiveCompanyKey(previousUserIdRef.current));
          }
          previousUserIdRef.current = session.user.id;
          
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          // User logged out - clear cache to prevent stale data on next login
          if (previousUserIdRef.current) {
            console.log('User logged out, clearing React Query cache');
            queryClient.clear();
          }
          previousUserIdRef.current = null;
          
          setProfile(null);
          setRoles([]);
          setMemberships([]);
          setActiveCompanyIdState(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const setActiveCompanyId = (companyId: string | null) => {
    // Allow "ALL" for MSD staff to view all companies
    const isMsd = roles.some(r => ['msd_csm', 'msd_ma', 'msd_ops', 'msd_management', 'system_admin'].includes(r));
    
    // Need user ID for storage key
    const userId = user?.id;
    if (!userId) return;
    
    const userCompanyKey = getActiveCompanyKey(userId);
    
    if (companyId === 'ALL' && isMsd) {
      setActiveCompanyIdState('ALL');
      safeLocalStorageSet(userCompanyKey, 'ALL');
      return;
    }
    
    // Validate company is in memberships (or user is MSD staff who can view all)
    const hasMembership = memberships.some(m => m.company_id === companyId);
    
    if (hasMembership || isMsd) {
      setActiveCompanyIdState(companyId);
      if (companyId) {
        safeLocalStorageSet(userCompanyKey, companyId);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Log successful login and update last_login_at
    if (!error && data?.user) {
      // Identify user in Sentry
      identifySentryUser({ id: data.user.id, email });
      
      setTimeout(async () => {
        try {
          // Update last_login_at in profiles
          await supabase
            .from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('user_id', data.user.id);
          
          // Log to audit_logs
          await supabase.from('audit_logs').insert({
            user_id: data.user.id,
            user_email: email,
            action: 'login',
            resource_type: 'user',
            resource_id: data.user.id,
            details: {},
            user_agent: navigator.userAgent,
          } as any);
        } catch (e) {
          console.error('Failed to log login:', e);
        }
      }, 100);
    }
    
    return { error };
  };

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string,
    companyId: string | null,
    requestedCompanyName: string
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    
    // Build metadata - only include non-null values to avoid JSON parsing issues
    const userData: Record<string, string> = {
      full_name: fullName,
      requested_company_name: requestedCompanyName,
    };
    
    // Only add company_id if it's not null (avoid JSON null issues)
    if (companyId) {
      userData.company_id = companyId;
    }
    
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData,
      },
    });
    
    // Send notification to admins about new registration
    if (!error && data?.user) {
      const isPending = !companyId; // Pending if no known company selected
      
      // Fire and forget - don't block registration on email notification
      supabase.functions.invoke('notify-registration', {
        body: {
          user_email: email,
          user_name: fullName,
          company_name: requestedCompanyName,
          is_pending: isPending,
          requested_company_name: isPending ? requestedCompanyName : null,
        },
      }).then(({ error: notifyError }) => {
        if (notifyError) {
          console.error('Failed to send registration notification:', notifyError);
        } else {
          console.log('Registration notification sent successfully');
        }
      });
    }
    
    return { error };
  };

  const signOut = async () => {
    // Log logout before signing out
    if (user) {
      try {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          user_email: profile?.email,
          user_name: profile?.full_name,
          action: 'logout',
          resource_type: 'user',
          resource_id: user.id,
          company_id: activeCompanyId,
          details: {},
          user_agent: navigator.userAgent,
        } as any);
      } catch (e) {
        console.error('Failed to log logout:', e);
      }
    }
    
    // Clear Sentry user context
    clearSentryUser();
    
    // Clear React Query cache to prevent stale data for next user
    queryClient.clear();
    
    // Reset CSS variables to defaults before logout to prevent branding cache
    resetCSSVariables();
    
    // Clear this user's company key if we know the user ID
    if (user?.id) {
      safeLocalStorageRemove(getActiveCompanyKey(user.id));
    }
    previousUserIdRef.current = null;
    
    // Clear welcome shown flag so it shows again on next login
    sessionStorage.removeItem('msd_welcome_shown');
    // Also clear legacy key if it exists
    safeLocalStorageRemove(LEGACY_ACTIVE_COMPANY_KEY);
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setMemberships([]);
    setActiveCompanyIdState(null);
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  // Role label mapping - uses translation keys for i18n
  const getRoleLabel = (role: AppRole): string => {
    // Fallback labels for when translation context is not available
    const fallbackLabels: Record<AppRole, string> = {
      viewer: 'Kunde – Viewer',
      admin: 'Kunde – Admin',
      msd_csm: 'MSD-CSM',
      msd_ma: 'MSD-MA',
      msd_ops: 'MSD-OPS',
      msd_management: 'MSD-Management',
      system_admin: 'System Admin',
    };
    return fallbackLabels[role];
  };

  // Multi-role helper functions - memoized to prevent infinite re-renders
  const hasRole = useCallback((checkRole: AppRole): boolean => {
    return roles.includes(checkRole);
  }, [roles]);

  const hasAnyRole = useCallback((...checkRoles: AppRole[]): boolean => {
    return checkRoles.some(r => roles.includes(r));
  }, [roles]);

  const isMsdStaff = useCallback(() => {
    return ['msd_csm', 'msd_ma', 'msd_ops', 'msd_management', 'system_admin'].some(r => roles.includes(r as AppRole));
  }, [roles]);

  const isSystemAdmin = useCallback(() => {
    return roles.includes('system_admin');
  }, [roles]);

  const isMsdOps = useCallback(() => {
    return roles.includes('msd_ops');
  }, [roles]);

  const isMsdManagement = useCallback(() => {
    return roles.includes('msd_management');
  }, [roles]);

  const isAdmin = useCallback(() => {
    return roles.includes('admin');
  }, [roles]);

  const canViewAllCompanies = useCallback(() => {
    return ['msd_csm', 'msd_ma', 'msd_ops', 'msd_management', 'system_admin'].some(r => roles.includes(r as AppRole));
  }, [roles]);

  // Primary role for backwards compatibility (first role or null)
  const role = roles.length > 0 ? roles[0] : null;

  const activeCompanyName = memberships.find(m => m.company_id === activeCompanyId)?.company_name || null;

  // Session expiry monitoring - only show warnings, don't auto-logout
  // Supabase handles token refresh automatically
  useSessionExpiry({
    session,
    // Removed: onExpired: signOut - let Supabase handle token refresh
    warningMinutes: 2,
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        roles,
        loading,
        memberships,
        activeCompanyId,
        activeCompanyName,
        setActiveCompanyId,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        getRoleLabel,
        hasRole,
        hasAnyRole,
        isMsdStaff,
        isSystemAdmin,
        isMsdOps,
        isMsdManagement,
        isAdmin,
        canViewAllCompanies,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
