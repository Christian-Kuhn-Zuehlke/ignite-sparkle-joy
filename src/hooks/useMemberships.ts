import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type MembershipStatus = 'pending' | 'approved' | 'rejected';

export interface Membership {
  id: string;
  user_id: string;
  company_id: string;
  role: 'viewer' | 'admin' | 'msd_csm' | 'msd_ma' | 'system_admin';
  is_primary: boolean;
  status?: MembershipStatus; // Optional until DB types sync
  created_at: string;
  updated_at: string;
  // Joined data
  company_name?: string;
  user_email?: string;
  user_name?: string;
  requested_company_name?: string;
}

export interface CSMAssignment {
  id: string;
  csm_user_id: string;
  company_id: string;
  created_at: string;
  // Joined data
  company_name?: string;
  csm_name?: string;
  csm_email?: string;
}

// Fetch memberships for current user
export function useMyMemberships() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['memberships', 'my', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('memberships')
        .select(`
          *,
          companies:company_id (name)
        `)
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });

      if (error) throw error;

      return (data || []).map(m => ({
        ...m,
        status: (m as any).status || 'approved',
        company_name: (m.companies as any)?.name
      })) as Membership[];
    },
    enabled: !!user,
  });
}

// Fetch memberships for a specific company (for admins)
export function useCompanyMemberships(companyId: string | null) {
  return useQuery({
    queryKey: ['memberships', 'company', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Fetch memberships first (no JOIN - FK doesn't exist to profiles)
      const { data: memberships, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!memberships || memberships.length === 0) {
        return [] as Membership[];
      }

      // Fetch profiles separately
      const userIds = [...new Set(memberships.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return memberships.map(m => {
        const profile = profileMap.get(m.user_id);
        return {
          ...m,
          status: (m as any).status || 'approved',
          user_email: profile?.email,
          user_name: profile?.full_name
        };
      }) as Membership[];
    },
    enabled: !!companyId,
  });
}

// Fetch all memberships (for system admins)
export function useAllMemberships(statusFilter?: MembershipStatus) {
  return useQuery({
    queryKey: ['memberships', 'all', statusFilter],
    queryFn: async () => {
      // Fetch memberships first
      let query = supabase
        .from('memberships')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data: memberships, error } = await query;

      if (error) {
        console.error('Error fetching memberships:', error);
        throw error;
      }

      if (!memberships || memberships.length === 0) {
        return [] as Membership[];
      }

      // Get unique user IDs and fetch profiles separately
      const userIds = [...new Set(memberships.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name, requested_company_name')
        .in('user_id', userIds);

      // Get unique company IDs (excluding PENDING) and fetch companies separately
      const companyIds = [...new Set(memberships.map(m => m.company_id).filter(id => id && id !== 'PENDING'))];
      let companies: { id: string; name: string }[] = [];
      if (companyIds.length > 0) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);
        companies = companyData || [];
      }

      // Combine the data
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const companyMap = new Map(companies.map(c => [c.id, c]));

      return memberships.map(m => {
        const profile = profileMap.get(m.user_id);
        const company = companyMap.get(m.company_id);
        
        return {
          ...m,
          status: (m as any).status || 'approved',
          company_name: company?.name || null,
          user_email: profile?.email,
          user_name: profile?.full_name,
          requested_company_name: profile?.requested_company_name,
        };
      }) as Membership[];
    },
    refetchInterval: 10000, // Refetch every 10 seconds for pending registrations
  });
}

// Fetch pending memberships count (for badges)
export function usePendingMembershipsCount() {
  return useQuery({
    queryKey: ['memberships', 'pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('memberships')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
  });
}

// Add membership
export function useAddMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membership: {
      user_id: string;
      company_id: string;
      role: 'viewer' | 'admin';
      is_primary?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('memberships')
        .insert(membership)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      toast.success('Mitgliedschaft hinzugefügt');
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
}

// Update membership
export function useUpdateMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      role?: 'viewer' | 'admin';
      is_primary?: boolean;
      status?: MembershipStatus;
    }) => {
      const { data, error } = await supabase
        .from('memberships')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      toast.success('Mitgliedschaft aktualisiert');
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
}

// Approve membership
export function useApproveMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userEmail, userName, companyName }: { 
      id: string; 
      userEmail?: string; 
      userName?: string; 
      companyName?: string;
    }) => {
      const { data, error } = await supabase
        .from('memberships')
        .update({ status: 'approved' } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Send approval notification email to user
      if (userEmail) {
        supabase.functions.invoke('notify-approval', {
          body: {
            user_email: userEmail,
            user_name: userName || '',
            company_name: companyName || '',
            action: 'approved',
          },
        }).then(({ error: notifyError }) => {
          if (notifyError) {
            console.error('Failed to send approval notification:', notifyError);
          } else {
            console.log('Approval notification sent successfully');
          }
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      toast.success('Mitgliedschaft genehmigt - Benutzer wurde per Email benachrichtigt');
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
}

// Reject membership
export function useRejectMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, userEmail, userName }: { 
      id: string; 
      userEmail?: string; 
      userName?: string;
    }) => {
      const { data, error } = await supabase
        .from('memberships')
        .update({ status: 'rejected' } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Send rejection notification email to user
      if (userEmail) {
        supabase.functions.invoke('notify-approval', {
          body: {
            user_email: userEmail,
            user_name: userName || '',
            company_name: '',
            action: 'rejected',
          },
        }).then(({ error: notifyError }) => {
          if (notifyError) {
            console.error('Failed to send rejection notification:', notifyError);
          } else {
            console.log('Rejection notification sent successfully');
          }
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      toast.success('Mitgliedschaft abgelehnt - Benutzer wurde per Email benachrichtigt');
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
}

// Remove membership
export function useRemoveMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      toast.success('Mitgliedschaft entfernt');
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
}

// =====================================================
// CSM ASSIGNMENTS
// =====================================================

// Fetch CSM assignments for a company
export function useCompanyCSMAssignments(companyId: string | null) {
  return useQuery({
    queryKey: ['csm-assignments', 'company', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Fetch assignments first (no JOIN to profiles - FK doesn't exist)
      const { data: assignments, error } = await supabase
        .from('csm_assignments')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;

      if (!assignments || assignments.length === 0) {
        return [] as CSMAssignment[];
      }

      // Fetch profiles separately
      const userIds = [...new Set(assignments.map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return assignments.map(a => {
        const profile = profileMap.get(a.user_id);
        return {
          ...a,
          csm_user_id: a.user_id,
          csm_email: profile?.email,
          csm_name: profile?.full_name
        };
      }) as unknown as CSMAssignment[];
    },
    enabled: !!companyId,
  });
}

// Fetch all CSM assignments (for MSD staff and system admins)
export function useAllCSMAssignments() {
  return useQuery({
    queryKey: ['csm-assignments', 'all'],
    queryFn: async () => {
      // Fetch assignments first
      const { data: assignments, error } = await supabase
        .from('csm_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!assignments || assignments.length === 0) {
        return [] as CSMAssignment[];
      }

      // Fetch profiles and companies separately
      const userIds = [...new Set(assignments.map(a => a.user_id))];
      const companyIds = [...new Set(assignments.map(a => a.company_id))];

      const [profilesResult, companiesResult] = await Promise.all([
        supabase.from('profiles').select('user_id, email, full_name').in('user_id', userIds),
        supabase.from('companies').select('id, name').in('id', companyIds)
      ]);

      const profileMap = new Map(profilesResult.data?.map(p => [p.user_id, p]) || []);
      const companyMap = new Map(companiesResult.data?.map(c => [c.id, c]) || []);

      return assignments.map(a => {
        const profile = profileMap.get(a.user_id);
        const company = companyMap.get(a.company_id);
        return {
          ...a,
          csm_user_id: a.user_id,
          company_name: company?.name,
          csm_email: profile?.email,
          csm_name: profile?.full_name
        };
      }) as unknown as CSMAssignment[];
    },
  });
}

// Fetch my CSM assignments (for CSMs)
export function useMyCSMAssignments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['csm-assignments', 'my', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('csm_assignments')
        .select(`
          *,
          companies:company_id (name, logo_url, primary_color)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      return (data || []).map(a => ({
        ...a,
        csm_user_id: a.user_id,
        company_name: (a.companies as any)?.name
      })) as unknown as CSMAssignment[];
    },
    enabled: !!user,
  });
}

// Add CSM assignment
export function useAddCSMAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignment: {
      csm_user_id: string;
      company_id: string;
    }) => {
      const { data, error } = await supabase
        .from('csm_assignments')
        .insert({ user_id: assignment.csm_user_id, company_id: assignment.company_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csm-assignments'] });
      toast.success('CSM-Zuweisung erstellt');
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
}

// Remove CSM assignment
export function useRemoveCSMAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('csm_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csm-assignments'] });
      toast.success('CSM-Zuweisung entfernt');
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
}
