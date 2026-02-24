import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AuditAction = 
  | 'login'
  | 'logout'
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  | 'approve'
  | 'reject'
  | 'status_change';

export type AuditResource = 
  | 'order'
  | 'inventory'
  | 'return'
  | 'user'
  | 'membership'
  | 'company'
  | 'settings'
  | 'api_key'
  | 'webhook'
  | 'integration'
  | 'kpi';

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: AuditAction;
  resource_type: AuditResource;
  resource_id: string | null;
  company_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface CreateAuditLogParams {
  action: AuditAction;
  resourceType: AuditResource;
  resourceId?: string;
  companyId?: string;
  details?: Record<string, any>;
}

// Hook to create audit log entries
export function useCreateAuditLog() {
  const { activeCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      action, 
      resourceType, 
      resourceId, 
      companyId,
      details = {} 
    }: CreateAuditLogParams) => {
      // Use the database function which handles enum types correctly
      const { data, error } = await supabase
        .rpc('create_audit_log', {
          p_action: action,
          p_resource_type: resourceType,
          p_resource_id: resourceId,
          p_company_id: companyId ?? activeCompanyId ?? undefined,
          p_details: details,
        });

      if (error) {
        console.error('Failed to create audit log:', error);
        throw error;
      }
      return data;
    },
  });
}

// Convenience function to log without waiting
export function useAuditLogger() {
  const createAuditLog = useCreateAuditLog();

  const log = (params: CreateAuditLogParams) => {
    // Fire and forget - don't block UI for audit logging
    createAuditLog.mutate(params);
  };

  return { log };
}

// Hook to fetch audit logs with filtering
interface UseAuditLogsParams {
  companyId?: string | null;
  action?: AuditAction;
  resourceType?: AuditResource;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export function useAuditLogs(params: UseAuditLogsParams = {}) {
  const { 
    companyId, 
    action, 
    resourceType, 
    userId, 
    startDate, 
    endDate, 
    limit = 100 
  } = params;

  return useQuery({
    queryKey: ['audit-logs', companyId, action, resourceType, userId, startDate?.toISOString(), endDate?.toISOString(), limit],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      if (action) {
        query = query.eq('action', action);
      }
      if (resourceType) {
        query = query.eq('resource_type', resourceType);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    },
  });
}

// Hook to get audit log stats
export function useAuditLogStats(companyId?: string | null) {
  return useQuery({
    queryKey: ['audit-logs-stats', companyId],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      let query = supabase
        .from('audit_logs')
        .select('action, resource_type, created_at')
        .gte('created_at', weekAgo.toISOString());

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const logs = data || [];
      const todayLogs = logs.filter(l => new Date(l.created_at) >= today);

      // Count by action
      const actionCounts: Record<string, number> = {};
      logs.forEach(log => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      });

      // Count by resource
      const resourceCounts: Record<string, number> = {};
      logs.forEach(log => {
        resourceCounts[log.resource_type] = (resourceCounts[log.resource_type] || 0) + 1;
      });

      return {
        totalWeek: logs.length,
        totalToday: todayLogs.length,
        byAction: actionCounts,
        byResource: resourceCounts,
      };
    },
  });
}
