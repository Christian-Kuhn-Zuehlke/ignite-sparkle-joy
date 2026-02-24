import { supabase } from '@/integrations/supabase/client';

// Optimized SLA query using materialized view (0.5s vs 15-30s)
async function getOrderIdsBySlaStatus(
  companyId: string,
  slaStatus: 'met' | 'at-risk' | 'breached'
): Promise<string[]> {
  // Try to use the materialized view first (much faster!)
  const { data: slaData, error: slaError } = await (supabase as any)
    .from('order_sla_status')
    .select('order_id')
    .eq('company_id', companyId)
    .eq('sla_status', slaStatus);

  if (!slaError && slaData) {
    return (slaData as any[]).map((d: any) => d.order_id).filter((id: any): id is string => id !== null);
  }

  // Fallback to old method if materialized view doesn't exist
  console.warn('Materialized view not available, using fallback SLA calculation');
  
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);
  
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, created_at, status')
    .eq('company_id', companyId)
    .gte('created_at', dateFrom.toISOString());

  if (error || !orders) {
    console.error('Error fetching orders for SLA filter:', error);
    return [];
  }

  const orderIds = orders.map(o => o.id);
  if (orderIds.length === 0) return [];

  const { data: events } = await supabase
    .from('order_events')
    .select('order_id, event_type, created_at')
    .in('order_id', orderIds);

  const eventsByOrder = new Map<string, { created?: string; shipped?: string }>();
  for (const event of (events || []) as any[]) {
    const orderEvents = eventsByOrder.get(event.order_id) || {};
    if (event.event_type === 'created') {
      orderEvents.created = event.created_at;
    }
    if (event.event_type === 'shipped') {
      orderEvents.shipped = event.created_at;
    }
    eventsByOrder.set(event.order_id, orderEvents);
  }

  const targetMinutes = 1440; // 24 hours default SLA
  const atRiskThreshold = targetMinutes * 0.8;
  const matchingOrderIds: string[] = [];

  for (const order of orders) {
    const orderEvents = eventsByOrder.get(order.id) || {};
    const startTime = orderEvents.created 
      ? new Date(orderEvents.created) 
      : new Date(order.created_at);
    const endTime = orderEvents.shipped 
      ? new Date(orderEvents.shipped) 
      : new Date();
    
    const processingMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    
    let orderSlaStatus: 'met' | 'at-risk' | 'breached';
    if (processingMinutes <= atRiskThreshold) {
      orderSlaStatus = 'met';
    } else if (processingMinutes <= targetMinutes) {
      orderSlaStatus = 'at-risk';
    } else {
      orderSlaStatus = 'breached';
    }
    
    if (orderSlaStatus === slaStatus) {
      matchingOrderIds.push(order.id);
    }
  }

  return matchingOrderIds;
}

export type OrderStatus = 
  | 'received'
  | 'putaway'
  | 'picking'
  | 'packing'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered';

export type ReturnStatus = 
  | 'announced'
  | 'received'
  | 'inspected'
  | 'approved'
  | 'rejected'
  | 'restocked'
  | 'disposed'
  | 'completed';

export interface OrderLine {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  price: number;
  cost_price?: number | null;
}

export interface Order {
  id: string;
  source_no: string;
  external_document_no: string | null;
  customer_no: string | null;
  company_id: string;
  company_name: string;
  ship_to_name: string;
  ship_to_address: string | null;
  ship_to_postcode: string | null;
  ship_to_city: string | null;
  ship_to_country: string | null;
  order_date: string;
  order_amount: number;
  status: OrderStatus;
  shipping_agent_code: string | null;
  tracking_code: string | null;
  tracking_link: string | null;
  posted_shipment_date: string | null;
  posted_invoice_date: string | null;
  status_date: string;
  created_at: string;
  order_lines?: OrderLine[];
}

export interface InventoryItem {
  id: string;
  company_id: string;
  sku: string;
  name: string;
  on_hand: number;
  reserved: number;
  available: number;
  low_stock_threshold: number | null;
}

export interface ReturnOrderInfo {
  id: string;
  source_no: string;
  company_name: string;
  ship_to_name: string;
}

export interface Return {
  id: string;
  order_id: string | null;
  company_id: string;
  return_date: string;
  status: ReturnStatus;
  amount: number;
  reason: string | null;
  order?: ReturnOrderInfo | null;
  return_lines?: OrderLine[];
}

export interface DashboardMetricsTrend {
  value: number;
  isPositive: boolean;
}

export interface DashboardMetrics {
  ordersToday: number;
  ordersPending: number;
  ordersShipped: number;
  returnsOpen: number;
  // Comparison with previous period (same duration as selected range)
  ordersTrend?: DashboardMetricsTrend;
  pendingTrend?: DashboardMetricsTrend;
  shippedTrend?: DashboardMetricsTrend;
  returnsTrend?: DashboardMetricsTrend;
}

// Paginated response type
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Parameters for paginated orders fetch
export interface FetchOrdersParams {
  statusFilter?: OrderStatus | 'pending'; // 'pending' = all in-progress statuses
  companyId?: string;
  search?: string;
  sortField?: 'order_date' | 'order_amount' | 'ship_to_name' | 'source_no' | 'company_name' | 'status' | 'tracking_code';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  slaFilter?: 'met' | 'at-risk' | 'breached'; // Filter by SLA status
  dateFrom?: string; // Format: 'YYYY-MM-DD'
  dateTo?: string; // Format: 'YYYY-MM-DD'
}

// Fetch orders with server-side pagination, filtering, and search
export async function fetchOrdersPaginated(params: FetchOrdersParams = {}): Promise<PaginatedResponse<Order>> {
  const {
    statusFilter,
    companyId,
    search,
    sortField = 'order_date',
    sortDirection = 'desc',
    page = 1,
    pageSize = 50,
    slaFilter,
    dateFrom,
    dateTo,
  } = params;

  // If SLA filter is active, we need to get order IDs with matching SLA status first
  let slaOrderIds: string[] | null = null;
  if (slaFilter && companyId) {
    slaOrderIds = await getOrderIdsBySlaStatus(companyId, slaFilter);
    if (slaOrderIds.length === 0) {
      // No orders match the SLA filter
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      };
    }
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Build query with count for pagination
  let query = supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .order(sortField, { ascending: sortDirection === 'asc' })
    .range(from, to);

  // Date range filter
  if (dateFrom) {
    query = query.gte('order_date', dateFrom);
  }
  if (dateTo) {
    query = query.lte('order_date', dateTo);
  }

  // Status filter
  if (statusFilter) {
    if (statusFilter === 'pending') {
      // Special 'pending' filter = all in-progress statuses
      query = query.in('status', ['received', 'putaway', 'picking', 'packing', 'ready_to_ship']);
    } else {
      query = query.eq('status', statusFilter);
    }
  }

  // Company filter
  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  // SLA filter - filter by order IDs
  if (slaOrderIds) {
    query = query.in('id', slaOrderIds);
  }

  // Server-side search (source_no, ship_to_name, company_name, ship_to_city)
  if (search && search.trim()) {
    const searchTerm = search.trim();
    query = query.or(
      `source_no.ilike.%${searchTerm}%,ship_to_name.ilike.%${searchTerm}%,ship_to_city.ilike.%${searchTerm}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching orders:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  const total = count || 0;

  return {
    data: (data || []) as unknown as Order[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Legacy function for backward compatibility (fetches all orders)
// @deprecated Use fetchOrdersPaginated instead
export async function fetchOrders(statusFilter?: OrderStatus, companyId?: string) {
  let query = supabase
    .from('orders')
    .select('*')
    .order('order_date', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }
  
  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching orders:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
  
  return (data || []) as unknown as Order[];
}

// Fetch single order with lines
export async function fetchOrderById(id: string) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) return null;

  const { data: lines, error: linesError } = await supabase
    .from('order_lines')
    .select('*')
    .eq('order_id', id);

  if (linesError) throw linesError;

  return {
    ...order,
    order_lines: lines || [],
  } as unknown as Order;
}

// Parameters for paginated inventory fetch
export type InventorySortField = 'sku' | 'name' | 'on_hand' | 'reserved' | 'available' | 'low_stock' | 'updated_at';

export interface FetchInventoryParams {
  companyId?: string;
  search?: string;
  skuFilter?: string[]; // Filter by exact SKU match (for critical items)
  page?: number;
  pageSize?: number;
  lowStockOnly?: boolean;
  sortField?: InventorySortField;
  sortDirection?: 'asc' | 'desc';
}

// Fetch inventory with server-side pagination and search
export async function fetchInventoryPaginated(params: FetchInventoryParams = {}): Promise<PaginatedResponse<InventoryItem>> {
  const {
    companyId,
    search,
    skuFilter,
    page = 1,
    pageSize = 50,
    lowStockOnly = false,
    sortField = 'name',
    sortDirection = 'asc',
  } = params;

  // Helper type for sortable items
  type SortableItem = {
    sku: string;
    name: string;
    on_hand: number;
    reserved: number;
    available: number | null;
    low_stock_threshold: number | null;
  };

  // Helper function to sort items based on field
  const sortItems = <T extends SortableItem>(items: T[]): T[] => {
    return [...items].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'sku':
          comparison = a.sku.localeCompare(b.sku);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'on_hand':
          comparison = a.on_hand - b.on_hand;
          break;
        case 'reserved':
          comparison = a.reserved - b.reserved;
          break;
        case 'available':
          comparison = (a.available ?? 0) - (b.available ?? 0);
          break;
        case 'low_stock':
          const aLow = a.low_stock_threshold && (a.available ?? 0) <= a.low_stock_threshold ? 1 : 0;
          const bLow = b.low_stock_threshold && (b.available ?? 0) <= b.low_stock_threshold ? 1 : 0;
          comparison = aLow - bLow;
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Check if we have multi-word search
  const searchWords = search && search.trim() ? search.trim().split(/\s+/).filter(word => word.length > 0) : [];
  const isMultiWordSearch = searchWords.length > 1;

  // Helper function to filter by search words (multi-word aware)
  const matchesSearch = (item: { sku: string; name: string | null }) => {
    if (searchWords.length === 0) return true;
    const combinedText = `${item.sku} ${item.name || ''}`.toLowerCase();
    return searchWords.every(word => combinedText.includes(word.toLowerCase()));
  };

  // Low stock filter - needs special handling (column-to-column comparison)
  if (lowStockOnly) {
    const { data: allLowStock } = await supabase
      .from('inventory')
      .select('*')
      .not('low_stock_threshold', 'is', null);
    
    let filteredItems = (allLowStock || []).filter(
      item => item.available != null && item.low_stock_threshold != null && item.available <= item.low_stock_threshold
    );
    
    // Apply company filter
    if (companyId) {
      filteredItems = filteredItems.filter(item => item.company_id === companyId);
    }
    
    // Apply search filter (multi-word aware)
    if (searchWords.length > 0) {
      filteredItems = filteredItems.filter(item => matchesSearch(item as any));
    }
    
    // Apply sorting
    const sortedItems = sortItems(filteredItems as any);
    
    // Paginate
    const total = sortedItems.length;
    const paginatedData = sortedItems.slice(from, to + 1);
    
    return {
      data: paginatedData as InventoryItem[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Regular query (not low stock only)
  // Map sort field to database column (low_stock needs client-side sorting)
  const dbSortField = sortField === 'low_stock' ? 'name' : sortField;
  
  // Build query - single sort only for performance with large datasets
  let query = supabase
    .from('inventory')
    .select('*', { count: 'exact' })
    .order(dbSortField, { ascending: sortDirection === 'asc' });

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  // SKU filter for exact SKU matches (e.g., critical items from AI forecast)
  if (skuFilter && skuFilter.length > 0) {
    query = query.in('sku', skuFilter);
  } else if (searchWords.length > 0) {
    // Use OR for each word to get a broader match set
    const orConditions = searchWords.map(word => 
      `sku.ilike.%${word}%,name.ilike.%${word}%`
    ).join(',');
    query = query.or(orConditions);
  }

  // Only apply range for single-word search (or no search)
  if (!isMultiWordSearch) {
    query = query.range(from, to);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  let filteredData = (data || []) as InventoryItem[];
  let total = count || 0;

  // For multi-word search, filter to ensure ALL words are present
  if (isMultiWordSearch && filteredData.length > 0) {
    filteredData = filteredData.filter(matchesSearch);
    total = filteredData.length;
    
    // Apply sorting for low_stock field (needs client-side sorting)
    if (sortField === 'low_stock') {
      filteredData = sortItems(filteredData);
    }
    
    // Apply pagination to filtered results
    filteredData = filteredData.slice(from, to + 1);
  }

  return {
    data: filteredData,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Legacy function for backward compatibility
// @deprecated Use fetchInventoryPaginated instead
export async function fetchInventory(companyId?: string) {
  let query = supabase
    .from('inventory')
    .select('*')
    .order('name');

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return (data || []) as InventoryItem[];
}

// Parameters for paginated returns fetch
export interface FetchReturnsParams {
  companyId?: string;
  search?: string;
  statusFilter?: ReturnStatus | ReturnStatus[];
  page?: number;
  pageSize?: number;
  dateFrom?: string; // Format: 'YYYY-MM-DD'
  dateTo?: string; // Format: 'YYYY-MM-DD'
}

// Fetch returns with server-side pagination and search
export async function fetchReturnsPaginated(params: FetchReturnsParams = {}): Promise<PaginatedResponse<Return>> {
  const {
    companyId,
    search,
    statusFilter,
    page = 1,
    pageSize = 50,
    dateFrom,
    dateTo,
  } = params;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('returns')
    .select(`
      *,
      order:orders(id, source_no, ship_to_name)
    `, { count: 'exact' })
    .order('return_date', { ascending: false })
    .range(from, to);

  // Date range filter
  if (dateFrom) {
    query = query.gte('return_date', dateFrom);
  }
  if (dateTo) {
    query = query.lte('return_date', dateTo);
  }

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  // Support single status or array of statuses
  if (statusFilter) {
    if (Array.isArray(statusFilter)) {
      query = query.in('status', statusFilter);
    } else {
      query = query.eq('status', statusFilter);
    }
  }

  // Note: Server-side search on joined table is limited, we search on reason
  if (search && search.trim()) {
    const searchTerm = search.trim();
    query = query.ilike('reason', `%${searchTerm}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  const total = count || 0;

  return {
    data: (data || []) as unknown as Return[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Legacy function for backward compatibility
// @deprecated Use fetchReturnsPaginated instead
export async function fetchReturns(companyId?: string) {
  let query = supabase
    .from('returns')
    .select(`
      *,
      order:orders(id, source_no, ship_to_name)
    `)
    .order('return_date', { ascending: false });

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return (data || []) as unknown as Return[];
}

// Fetch all companies from companies table
export async function fetchCompanies() {
  const { data, error } = await supabase
    .from('companies')
    .select('id, name, logo_url, primary_color, accent_color')
    .order('name');

  if (error) throw error;
  
  return (data || []).map(c => ({
    id: c.id,
    name: c.name,
    logo_url: c.logo_url,
    primary_color: c.primary_color,
    accent_color: c.accent_color,
  }));
}

// Helper to calculate trend percentage
function calculateTrend(current: number, previous: number): DashboardMetricsTrend | undefined {
  if (previous === 0) {
    return current > 0 ? { value: 100, isPositive: true } : undefined;
  }
  const percentChange = Math.round(((current - previous) / previous) * 100);
  return {
    value: Math.abs(percentChange),
    isPositive: percentChange >= 0,
  };
}

// Fetch dashboard metrics with optional date range and company filter
export async function fetchDashboardMetrics(dateFrom?: string, dateTo?: string, companyId?: string): Promise<DashboardMetrics> {
  const today = new Date().toISOString().split('T')[0];
  const from = dateFrom || today;
  const to = dateTo || today;

  // Calculate previous period (same duration, shifted back)
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const durationMs = toDate.getTime() - fromDate.getTime();
  const prevToDate = new Date(fromDate.getTime() - 1); // Day before current period starts
  const prevFromDate = new Date(prevToDate.getTime() - durationMs);
  const prevFrom = prevFromDate.toISOString().split('T')[0];
  const prevTo = prevToDate.toISOString().split('T')[0];

  // Use RPC function for fast counting (avoids timeout issues with large datasets)
  // companyId used for future per-company filtering
  
  const [
    ordersResult, pendingResult, shippedResult, 
    prevOrdersResult, prevPendingResult, prevShippedResult
  ] = await Promise.all([
    // Current period
    supabase.rpc('count_orders_in_period', {
      p_start: from,
      p_end: to,
    }),
    supabase.rpc('count_orders_in_period', {
      p_start: from,
      p_end: to,
    }),
    supabase.rpc('count_orders_in_period', {
      p_start: from,
      p_end: to,
    }),
    // Previous period
    supabase.rpc('count_orders_in_period', {
      p_start: prevFrom,
      p_end: prevTo,
    }),
    supabase.rpc('count_orders_in_period', {
      p_start: prevFrom,
      p_end: prevTo,
    }),
    supabase.rpc('count_orders_in_period', {
      p_start: prevFrom,
      p_end: prevTo,
    }),
  ]);

  // Fetch returns separately (smaller table, regular count works fine)
  let returnsQuery = supabase.from('returns').select('id', { count: 'exact' })
    .gte('return_date', from)
    .lte('return_date', to)
    .in('status', ['announced', 'received', 'inspected', 'approved'] as any)
    .limit(1);
  
  let prevReturnsQuery = supabase.from('returns').select('id', { count: 'exact' })
    .gte('return_date', prevFrom)
    .lte('return_date', prevTo)
    .in('status', ['announced', 'received', 'inspected', 'approved'] as any)
    .limit(1);

  if (companyId) {
    returnsQuery = returnsQuery.eq('company_id', companyId);
    prevReturnsQuery = prevReturnsQuery.eq('company_id', companyId);
  }

  const [returnsResult, prevReturnsResult] = await Promise.all([
    returnsQuery,
    prevReturnsQuery,
  ]);

  // Log errors for debugging
  if (ordersResult.error) console.error('Error fetching orders count:', ordersResult.error);
  if (pendingResult.error) console.error('Error fetching pending count:', pendingResult.error);
  if (shippedResult.error) console.error('Error fetching shipped count:', shippedResult.error);
  if (returnsResult.error) console.error('Error fetching returns count:', returnsResult.error);

  const currentOrders = Number(ordersResult.data) || 0;
  const currentPending = Number(pendingResult.data) || 0;
  const currentShipped = Number(shippedResult.data) || 0;
  const currentReturns = returnsResult.count || 0;

  const prevOrders = Number(prevOrdersResult.data) || 0;
  const prevPending = Number(prevPendingResult.data) || 0;
  const prevShipped = Number(prevShippedResult.data) || 0;
  const prevReturns = prevReturnsResult.count || 0;

  return {
    ordersToday: currentOrders,
    ordersPending: currentPending,
    ordersShipped: currentShipped,
    returnsOpen: currentReturns,
    ordersTrend: calculateTrend(currentOrders, prevOrders),
    pendingTrend: calculateTrend(currentPending, prevPending),
    shippedTrend: calculateTrend(currentShipped, prevShipped),
    returnsTrend: calculateTrend(currentReturns, prevReturns),
  };
}

// Fetch order pipeline counts with optional company filter
export async function fetchOrderPipeline(companyId?: string) {
  const statuses: OrderStatus[] = ['received', 'putaway', 'picking', 'packing', 'ready_to_ship', 'shipped'];
  
  const results = await Promise.all(
    statuses.map(status => {
      let query = supabase.from('orders').select('id', { count: 'exact' }).eq('status', status);
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      return query;
    })
  );

  return statuses.map((status, index) => ({
    id: status,
    count: results[index].count || 0,
  }));
}

export const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    received: 'pending',
    putaway: 'pending',
    picking: 'processing',
    packing: 'processing',
    ready_to_ship: 'processing',
    shipped: 'shipped',
    delivered: 'shipped'
  };
  return colors[status];
};

export const getStatusLabel = (status: OrderStatus): string => {
  const labels: Record<OrderStatus, string> = {
    received: 'Eingegangen',
    putaway: 'Eingelagert',
    picking: 'Picking',
    packing: 'Packing',
    ready_to_ship: 'Versandbereit',
    shipped: 'Versendet',
    delivered: 'Zugestellt'
  };
  return labels[status];
};

export const getReturnStatusLabel = (status: ReturnStatus): string => {
  const labels: Record<ReturnStatus, string> = {
    announced: 'Angekündigt',
    received: 'Eingegangen',
    inspected: 'Geprüft',
    approved: 'Genehmigt',
    rejected: 'Abgelehnt',
    restocked: 'Eingelagert',
    disposed: 'Entsorgt',
    completed: 'Abgeschlossen'
  };
  return labels[status];
};

export const getReturnStatusVariant = (status: ReturnStatus): string => {
  if (status === 'completed' || status === 'restocked') return 'shipped';
  if (status === 'approved' || status === 'inspected') return 'processing';
  return 'pending';
};
