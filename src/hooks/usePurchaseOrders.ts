import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
interface PurchaseOrder {
  id: string;
  company_id: string | null;
  po_number: string | null;
  supplier_name: string | null;
  status: string;
  notes: string | null;
  expected_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  line_count?: number;
  has_discrepancies?: boolean;
}

interface PurchaseOrderLine {
  id: string;
  purchase_order_id: string;
  sku: string | null;
  name: string | null;
  quantity_ordered: number | null;
  quantity_received: number | null;
  unit_cost: number | null;
  created_at: string;
}

interface Discrepancy {
  id: string;
  session_id: string;
  po_line_id: string | null;
  type: string;
  severity: string;
  resolution: string;
  sku: string | null;
  expected_qty: number | null;
  actual_qty: number | null;
  notes: string | null;
}

interface PurchaseOrderDetail extends PurchaseOrder {
  lines: any[];
  discrepancies: any[];
}

interface POStats {
  expectedToday: number;
  arrivedNotReceived: number;
  inProgress: number;
  discrepancies: number;
  completedThisWeek: number;
}

interface CreatePOData {
  company_id: string;
  po_number: string;
  supplier_name: string;
  supplier_code?: string;
  eta?: string;
  location?: string;
  notes?: string;
  lines: Array<{
    sku: string;
    product_name: string;
    qty_expected: number;
    uom: string;
  }>;
}

// Fetch purchase orders list
export function usePurchaseOrders(params: { search?: string; status?: string } = {}) {
  const { activeCompanyId, isMsdStaff } = useAuth();

  return useQuery({
    queryKey: ['purchase-orders', activeCompanyId, params],
    queryFn: async (): Promise<PurchaseOrder[]> => {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_lines(count),
          discrepancies(count)
        `)
        .order('created_at', { ascending: false });

      if (activeCompanyId && !isMsdStaff()) {
        query = query.eq('company_id', activeCompanyId);
      } else if (activeCompanyId) {
        query = query.eq('company_id', activeCompanyId);
      }

      if (params.status) {
        query = query.eq('status', params.status as any);
      }

      if (params.search) {
        query = query.or(`po_number.ilike.%${params.search}%,supplier_name.ilike.%${params.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((po: any) => ({
        ...po,
        line_count: po.purchase_order_lines?.[0]?.count || 0,
        has_discrepancies: (po.discrepancies?.[0]?.count || 0) > 0,
      }));
    },
    enabled: true,
  });
}

// Fetch single PO with details
export function usePurchaseOrderDetail(poId: string | null) {
  return useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: async (): Promise<PurchaseOrderDetail | null> => {
      if (!poId) return null;

      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', poId)
        .single();

      if (poError) throw poError;

      const { data: lines, error: linesError } = await (supabase as any)
        .from('purchase_order_lines')
        .select('*')
        .eq('po_id', poId)
        .order('line_number', { ascending: true });

      if (linesError) throw linesError;

      // Fetch discrepancies via receiving sessions
      const { data: sessions } = await (supabase as any)
        .from('receiving_sessions')
        .select('id')
        .eq('po_id', poId);

      let discrepancies: Discrepancy[] = [];
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map((s: any) => s.id);
        const { data: discData } = await (supabase as any)
          .from('discrepancies')
          .select('*')
          .in('session_id', sessionIds);
        discrepancies = discData || [];
      }

      return {
        ...po,
        lines: lines || [],
        discrepancies,
      };
    },
    enabled: !!poId,
  });
}

// Fetch PO statistics
export function usePurchaseOrderStats() {
  const { activeCompanyId } = useAuth();

  return useQuery({
    queryKey: ['purchase-order-stats', activeCompanyId],
    queryFn: async (): Promise<POStats> => {
      const today = new Date().toISOString().split('T')[0];

      let baseQuery = supabase.from('purchase_orders').select('id, status, expected_date');
      
      if (activeCompanyId) {
        baseQuery = baseQuery.eq('company_id', activeCompanyId);
      }

      const { data: allPOs } = await baseQuery;
      const pos = (allPOs || []) as any[];

      // Count discrepancies
      let discCount = 0;

      return {
        expectedToday: pos.filter(po => po.expected_date === today && !['received', 'cancelled'].includes(po.status)).length,
        arrivedNotReceived: pos.filter(po => po.status === 'confirmed').length,
        inProgress: pos.filter(po => po.status === 'partially_received').length,
        discrepancies: discCount,
        completedThisWeek: pos.filter(po => po.status === 'received').length,
      };
    },
    enabled: true,
  });
}

// Create PO
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreatePOData) => {
      // Insert PO header
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          company_id: data.company_id,
          po_number: data.po_number,
          supplier_name: data.supplier_name,
          expected_date: data.eta || null,
          notes: data.notes || null,
          status: 'draft' as any,
          created_by: user?.id,
        })
        .select()
        .single();

      if (poError) throw poError;

      // Insert lines into po_lines
      const lines = data.lines.map((line) => ({
        purchase_order_id: po.id,
        sku: line.sku,
        name: line.product_name,
        quantity_ordered: line.qty_expected,
      }));

      const { error: linesError } = await supabase
        .from('po_lines')
        .insert(lines);

      if (linesError) throw linesError;

      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-stats'] });
    },
  });
}

// Start receiving session
export function useStartReceiving() {
  const queryClient = useQueryClient();
  const { activeCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (poId: string) => {
      // Update PO status
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({ status: 'partially_received' as any })
        .eq('id', poId);

      if (poError) throw poError;

      // Session tracking not available in current schema
      return { id: poId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
    },
  });
}

// Record receiving count
export function useRecordReceivingCount() {
  const queryClient = useQueryClient();
  const _queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { session_id: string; po_line_id: string; sku: string; qty_received: number }) => {
      // Update line qty_received in po_lines
      const { data: line } = await supabase
        .from('po_lines')
        .select('quantity_received')
        .eq('id', data.po_line_id)
        .single();

      const newQty = ((line as any)?.quantity_received || 0) + data.qty_received;

      const { error: updateError } = await supabase
        .from('po_lines')
        .update({ quantity_received: newQty })
        .eq('id', data.po_line_id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
    },
  });
}

// Complete receiving
export function useCompleteReceiving() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (poId: string) => {
      // Update PO status
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({ status: 'received' })
        .eq('id', poId);

      if (poError) throw poError;

      // Complete session
      // receiving_sessions table doesn't exist - skip
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-stats'] });
    },
  });
}
