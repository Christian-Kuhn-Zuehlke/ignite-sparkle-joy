import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Types
interface PurchaseOrder {
  id: string;
  company_id: string;
  po_number: string;
  supplier_name: string;
  supplier_code: string | null;
  eta: string | null;
  arrival_date: string | null;
  location: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  line_count?: number;
  has_discrepancies?: boolean;
}

interface PurchaseOrderLine {
  id: string;
  po_id: string;
  sku: string;
  product_name: string | null;
  qty_expected: number;
  qty_received: number;
  uom: string | null;
  gtin: string | null;
  line_number: number | null;
  notes: string | null;
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
  lines?: PurchaseOrderLine[];
  discrepancies?: Discrepancy[];
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

      const { data: lines, error: linesError } = await supabase
        .from('purchase_order_lines')
        .select('*')
        .eq('po_id', poId)
        .order('line_number', { ascending: true });

      if (linesError) throw linesError;

      // Fetch discrepancies via receiving sessions
      const { data: sessions } = await supabase
        .from('receiving_sessions')
        .select('id')
        .eq('po_id', poId);

      let discrepancies: Discrepancy[] = [];
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        const { data: discData } = await supabase
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

      let baseQuery = supabase.from('purchase_orders').select('id, status, eta');
      
      if (activeCompanyId) {
        baseQuery = baseQuery.eq('company_id', activeCompanyId);
      }

      const { data: allPOs } = await baseQuery;
      const pos = allPOs || [];

      // Count discrepancies
      let discQuery = supabase.from('discrepancies').select('id', { count: 'exact' });
      if (activeCompanyId) {
        discQuery = discQuery.eq('company_id', activeCompanyId);
      }
      discQuery = discQuery.eq('resolution', 'pending');
      const { count: discCount } = await discQuery;

      return {
        expectedToday: pos.filter(po => po.eta === today && !['completed', 'cancelled'].includes(po.status)).length,
        arrivedNotReceived: pos.filter(po => po.status === 'arrived').length,
        inProgress: pos.filter(po => po.status === 'receiving').length,
        discrepancies: discCount || 0,
        completedThisWeek: pos.filter(po => po.status === 'completed').length, // Simplified
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
          supplier_code: data.supplier_code || null,
          eta: data.eta || null,
          location: data.location || 'main_warehouse',
          notes: data.notes || null,
          status: 'draft',
          source: 'manual',
          created_by: user?.id,
        })
        .select()
        .single();

      if (poError) throw poError;

      // Insert lines
      const lines = data.lines.map((line, index) => ({
        po_id: po.id,
        sku: line.sku,
        product_name: line.product_name,
        qty_expected: line.qty_expected,
        uom: line.uom,
        line_number: index + 1,
      }));

      const { error: linesError } = await supabase
        .from('purchase_order_lines')
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
  const { user, activeCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (poId: string) => {
      // Update PO status
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({ status: 'receiving' })
        .eq('id', poId);

      if (poError) throw poError;

      // Create session
      const { data: session, error: sessionError } = await supabase
        .from('receiving_sessions')
        .insert([{
          po_id: poId,
          company_id: activeCompanyId!,
          started_by: user?.id,
          method: 'scan',
          status: 'in_progress',
        }])
        .select()
        .single();

      if (sessionError) throw sessionError;

      return session;
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: { session_id: string; po_line_id: string; sku: string; qty_received: number }) => {
      // Insert count
      const { error: countError } = await supabase
        .from('receiving_counts')
        .insert({
          session_id: data.session_id,
          po_line_id: data.po_line_id,
          sku: data.sku,
          qty_received: data.qty_received,
          scanned_by: user?.id,
        });

      if (countError) throw countError;

      // Update line qty_received
      const { data: line } = await supabase
        .from('purchase_order_lines')
        .select('qty_received')
        .eq('id', data.po_line_id)
        .single();

      const newQty = (line?.qty_received || 0) + data.qty_received;

      const { error: updateError } = await supabase
        .from('purchase_order_lines')
        .update({ qty_received: newQty })
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
      const { error: sessionError } = await supabase
        .from('receiving_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('po_id', poId)
        .eq('status', 'in_progress');

      if (sessionError) throw sessionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-stats'] });
    },
  });
}
