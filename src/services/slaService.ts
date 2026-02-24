import { supabase } from '@/integrations/supabase/client';

// SLA Service - Uses order_events for precise SLA tracking

export type SLAScope = 'outbound_orders' | 'returns' | 'receiving';
export type SLAMeasurementMethod = 'business_hours' | '24_7';
export type SLASeverity = 'info' | 'warn' | 'breach';
export type SLAResultStatus = 'met' | 'at_risk' | 'breached' | 'not_applicable' | 'excluded';

// Matches order_status enum
export type OrderStatus = 
  | 'received'
  | 'putaway'
  | 'picking'
  | 'packing'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered';

export type OrderEventType = 
  | 'ORDER_RECEIVED'
  | 'PICK_STARTED'
  | 'PACK_COMPLETED'
  | 'READY_TO_SHIP'
  | 'CARRIER_HANDOVER'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RETURN_RECEIVED'
  | 'RETURN_COMPLETED';

export interface OrderEvent {
  id: string;
  order_id: string;
  company_id: string;
  event_type: 'status_change' | 'created' | 'note_added' | 'sla_warning' | 'sla_breach';
  old_status: string | null;
  new_status: string | null;
  occurred_at: string;
  duration_seconds: number | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface SLAProfile {
  id: string;
  company_id: string;
  timezone: string;
  work_days: number[]; // 1-7 (Monday-Sunday)
  work_hours_start: string; // HH:MM
  work_hours_end: string; // HH:MM
  cut_off_time: string | null; // HH:MM
  blackout_days: string[] | null; // ISO date strings
}

export interface StatusDuration {
  status: string;
  enteredAt: Date;
  exitedAt: Date | null;
  durationSeconds: number;
  durationMinutes: number;
  durationFormatted: string;
}

export interface OrderSLAMetrics {
  orderId: string;
  companyId: string;
  totalProcessingMinutes: number;
  statusDurations: StatusDuration[];
  currentStatus: string;
  isComplete: boolean;
  createdAt: Date;
  shippedAt: Date | null;
  deliveredAt: Date | null;
}

// Fetch order events for a specific order
export async function fetchOrderEvents(orderId: string): Promise<OrderEvent[]> {
  const { data, error } = await supabase
    .from('order_events')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching order events:', error);
    return [];
  }

  return (data || []) as unknown as OrderEvent[];
}

// Fetch all events for a company within a date range
export async function fetchCompanyEvents(
  _companyId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<OrderEvent[]> {
  let query = supabase
    .from('order_events')
    .select('*')
    .order('created_at', { ascending: false });

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data, error } = await query.limit(1000);

  if (error) {
    console.error('Error fetching company events:', error);
    return [];
  }

  return (data || []) as unknown as OrderEvent[];
}

// Calculate duration in each status for an order
export function calculateStatusDurations(events: OrderEvent[]): StatusDuration[] {
  const durations: StatusDuration[] = [];
  
  // Filter to status_change and created events
  const statusEvents = events.filter(
    e => e.event_type === 'status_change' || e.event_type === 'created'
  );

  for (let i = 0; i < statusEvents.length; i++) {
    const event = statusEvents[i];
    const nextEvent = statusEvents[i + 1];
    
    const status = event.new_status || 'received';
    const enteredAt = new Date(event.occurred_at);
    const exitedAt = nextEvent ? new Date(nextEvent.occurred_at) : null;
    
    // Use pre-calculated duration if available, otherwise calculate
    let durationSeconds: number;
    if (nextEvent?.duration_seconds) {
      durationSeconds = nextEvent.duration_seconds;
    } else if (exitedAt) {
      durationSeconds = Math.floor((exitedAt.getTime() - enteredAt.getTime()) / 1000);
    } else {
      // Still in this status
      durationSeconds = Math.floor((Date.now() - enteredAt.getTime()) / 1000);
    }

    durations.push({
      status,
      enteredAt,
      exitedAt,
      durationSeconds,
      durationMinutes: Math.floor(durationSeconds / 60),
      durationFormatted: formatDuration(durationSeconds),
    });
  }

  return durations;
}

// Format duration in a human-readable way
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

// Get comprehensive SLA metrics for an order
export async function getOrderSLAMetrics(orderId: string): Promise<OrderSLAMetrics | null> {
  const events = await fetchOrderEvents(orderId);
  
  if (events.length === 0) {
    return null;
  }

  const statusDurations = calculateStatusDurations(events);
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  
  // Find shipped and delivered events
  const shippedEvent = events.find(e => e.new_status === 'shipped');
  const deliveredEvent = events.find(e => e.new_status === 'delivered');
  
  // Calculate total processing time (from received to shipped or current)
  const createdAt = new Date(firstEvent.occurred_at);
  const endTime = shippedEvent 
    ? new Date(shippedEvent.occurred_at) 
    : new Date();
  
  const totalProcessingMinutes = Math.floor(
    (endTime.getTime() - createdAt.getTime()) / (1000 * 60)
  );

  return {
    orderId,
    companyId: firstEvent.company_id,
    totalProcessingMinutes,
    statusDurations,
    currentStatus: lastEvent.new_status || 'received',
    isComplete: !!deliveredEvent,
    createdAt,
    shippedAt: shippedEvent ? new Date(shippedEvent.occurred_at) : null,
    deliveredAt: deliveredEvent ? new Date(deliveredEvent.occurred_at) : null,
  };
}

// Calculate SLA compliance based on events
export async function calculateSLAComplianceFromEvents(
  companyId: string,
  targetMinutes: number = 1440, // Default: 24 hours
  days: number = 7
): Promise<{
  compliance: number;
  total: number;
  met: number;
  atRisk: number;
  breached: number;
  averageProcessingMinutes: number;
}> {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);
  
  // Get all shipped orders in the period
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, created_at, status')
    .eq('company_id', companyId)
    .gte('created_at', dateFrom.toISOString())
    .in('status', ['shipped', 'delivered']);

  if (error || !orders) {
    console.error('Error fetching orders for SLA:', error);
    return {
      compliance: 100,
      total: 0,
      met: 0,
      atRisk: 0,
      breached: 0,
      averageProcessingMinutes: 0,
    };
  }

  if (orders.length === 0) {
    return {
      compliance: 100,
      total: 0,
      met: 0,
      atRisk: 0,
      breached: 0,
      averageProcessingMinutes: 0,
    };
  }

  // Get events for all orders - batch in chunks to avoid URI length limits
  const orderIds = orders.map(o => o.id);
  const BATCH_SIZE = 100;
  const allEvents: OrderEvent[] = [];
  
  for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
    const batchIds = orderIds.slice(i, i + BATCH_SIZE);
    const { data: batchEvents, error: batchError } = await supabase
      .from('order_events')
      .select('*')
      .in('order_id', batchIds)
      .order('created_at', { ascending: true });
    
    if (batchError) {
      console.error('Error fetching events batch for SLA:', batchError);
      continue;
    }
    
    if (batchEvents) {
      allEvents.push(...(batchEvents as unknown as OrderEvent[]));
    }
  }
  
  const events = allEvents;

  if (events.length === 0 && orderIds.length > 0) {
    // No events found - calculate from order data only
    return {
      compliance: 100,
      total: orders.length,
      met: 0,
      atRisk: 0,
      breached: 0,
      averageProcessingMinutes: 0,
    };
  }

  // Group events by order
  const eventsByOrder = new Map<string, OrderEvent[]>();
  for (const event of (events || []) as OrderEvent[]) {
    const orderEvents = eventsByOrder.get(event.order_id) || [];
    orderEvents.push(event);
    eventsByOrder.set(event.order_id, orderEvents);
  }

  let met = 0;
  let atRisk = 0;
  let breached = 0;
  let totalProcessingMinutes = 0;

  const atRiskThreshold = targetMinutes * 0.8; // 80% of target

  for (const order of orders) {
    const orderEvents = eventsByOrder.get(order.id) || [];
    
    if (orderEvents.length === 0) {
      // No events, use order created_at as fallback
      const createdAt = new Date(order.created_at);
      const processingMinutes = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60));
      totalProcessingMinutes += processingMinutes;
      
      if (processingMinutes <= targetMinutes) {
        met++;
      } else {
        breached++;
      }
      continue;
    }

    // Find shipped event
    const createdEvent = orderEvents.find(e => e.event_type === 'created');
    const shippedEvent = orderEvents.find(e => e.new_status === 'shipped');
    
    const startTime = createdEvent 
      ? new Date(createdEvent.occurred_at) 
      : new Date(order.created_at);
    const endTime = shippedEvent 
      ? new Date(shippedEvent.occurred_at) 
      : new Date();
    
    const processingMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    totalProcessingMinutes += processingMinutes;

    if (processingMinutes <= atRiskThreshold) {
      met++;
    } else if (processingMinutes <= targetMinutes) {
      atRisk++;
    } else {
      breached++;
    }
  }

  const total = orders.length;
  const compliance = total > 0 ? Math.round(((met + atRisk) / total) * 100) : 100;
  const averageProcessingMinutes = total > 0 ? Math.round(totalProcessingMinutes / total) : 0;

  return {
    compliance,
    total,
    met,
    atRisk,
    breached,
    averageProcessingMinutes,
  };
}

// Get status transition timeline for visualization
export async function getOrderTimeline(orderId: string): Promise<{
  status: string;
  timestamp: Date;
  duration: string | null;
  isActive: boolean;
}[]> {
  const events = await fetchOrderEvents(orderId);
  const durations = calculateStatusDurations(events);
  
  // Get current order status
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single();

  const currentStatus = order?.status || 'received';

  // Create timeline from durations
  return durations.map(d => ({
    status: d.status,
    timestamp: d.enteredAt,
    duration: d.exitedAt ? d.durationFormatted : null,
    isActive: d.status === currentStatus && !d.exitedAt,
  }));
}

// Calculate average time per status for a company
export async function getAverageStatusDurations(
  companyId: string,
  days: number = 30
): Promise<Map<string, { avgMinutes: number; count: number }>> {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);
  
  const { data: events, error } = await supabase
    .from('order_events')
    .select('*')
    .eq('company_id', companyId)
    .eq('event_type', 'status_change')
    .gte('occurred_at', dateFrom.toISOString())
    .not('duration_seconds', 'is', null);

  if (error || !events) {
    console.error('Error fetching events for averages:', error);
    return new Map();
  }

  const statusTotals = new Map<string, { totalSeconds: number; count: number }>();

  for (const event of events as unknown as OrderEvent[]) {
    if (event.old_status && event.duration_seconds) {
      const existing = statusTotals.get(event.old_status) || { totalSeconds: 0, count: 0 };
      existing.totalSeconds += event.duration_seconds;
      existing.count += 1;
      statusTotals.set(event.old_status, existing);
    }
  }

  const averages = new Map<string, { avgMinutes: number; count: number }>();
  for (const [status, data] of statusTotals) {
    averages.set(status, {
      avgMinutes: Math.round(data.totalSeconds / data.count / 60),
      count: data.count,
    });
  }

  return averages;
}

// Trigger backfill for existing orders (admin function)
export async function backfillOrderEvents(): Promise<number> {
  const { data, error } = await (supabase as any).rpc('backfill_order_events');
  
  if (error) {
    console.error('Error backfilling order events:', error);
    throw error;
  }
  
  return (data as unknown as number) || 0;
}

// Helper functions for business hours calculation
export function isWorkDay(date: Date, workDays: number[]): boolean {
  const dayOfWeek = date.getDay();
  const day = dayOfWeek === 0 ? 7 : dayOfWeek;
  return workDays.includes(day);
}

export function isWorkHours(date: Date, startTime: string, endTime: string): boolean {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const hour = date.getHours();
  const minute = date.getMinutes();
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const currentMinutes = hour * 60 + minute;
  
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export function calculateBusinessHours(
  start: Date,
  end: Date,
  profile: SLAProfile
): number {
  if (start >= end) return 0;

  const [startHour, startMin] = profile.work_hours_start.split(':').map(Number);
  const [endHour, endMin] = profile.work_hours_end.split(':').map(Number);

  let totalMinutes = 0;
  let current = new Date(start);

  while (current < end) {
    if (isWorkDay(current, profile.work_days)) {
      const dateStr = current.toISOString().split('T')[0];
      const isBlackout = profile.blackout_days?.includes(dateStr);
      
      if (!isBlackout) {
        const dayStart = new Date(current);
        dayStart.setHours(startHour, startMin, 0, 0);
        const dayEnd = new Date(current);
        dayEnd.setHours(endHour, endMin, 0, 0);

        const effectiveStart = current > dayStart ? current : dayStart;
        const effectiveEnd = end < dayEnd ? end : dayEnd;

        if (effectiveStart < effectiveEnd) {
          const diffMs = effectiveEnd.getTime() - effectiveStart.getTime();
          totalMinutes += Math.floor(diffMs / (1000 * 60));
        }
      }
    }

    current.setDate(current.getDate() + 1);
    current.setHours(startHour, startMin, 0, 0);
  }

  return totalMinutes;
}

export function calculateElapsedTime(
  start: Date,
  end: Date,
  profile: SLAProfile,
  method: SLAMeasurementMethod
): number {
  if (method === '24_7') {
    const diffMs = end.getTime() - start.getTime();
    return Math.floor(diffMs / (1000 * 60));
  } else {
    return calculateBusinessHours(start, end, profile);
  }
}

// ============================================================================
// Legacy Types & Functions for backward compatibility
// ============================================================================

export interface SLARule {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  scope: SLAScope;
  filters: Record<string, unknown>;
  start_event: OrderEventType;
  end_event: OrderEventType;
  target_minutes: number;
  measurement_method: SLAMeasurementMethod;
  severity: SLASeverity;
  grace_minutes: number;
  at_risk_threshold_percent: number;
  exclude_statuses: string[] | null;
  exclude_flags: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SLAResult {
  id: string;
  order_id: string | null;
  return_id: string | null;
  sla_rule_id: string;
  status: SLAResultStatus;
  elapsed_minutes: number | null;
  target_minutes: number;
  started_at: string | null;
  ended_at: string | null;
  computed_at: string;
  exclusion_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface SLAAlert {
  id: string;
  sla_result_id: string;
  order_id: string | null;
  return_id: string | null;
  company_id: string;
  severity: SLASeverity;
  message: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

// Legacy placeholder functions - these will be migrated to use order_events
export async function fetchSLAProfile(_companyId: string): Promise<SLAProfile | null> {
  console.debug('Using default SLA profile');
  return null;
}

export async function upsertSLAProfile(_profile: Partial<SLAProfile>): Promise<SLAProfile> {
  throw new Error('SLA profile management not yet implemented with order_events');
}

export async function fetchSLARules(_companyId: string, _activeOnly = false): Promise<SLARule[]> {
  console.debug('SLA rules not yet migrated to order_events');
  return [];
}

export async function createSLARule(_rule: Omit<SLARule, 'id' | 'created_at' | 'updated_at'>): Promise<SLARule> {
  throw new Error('SLA rule management not yet implemented with order_events');
}

export async function updateSLARule(_id: string, _updates: Partial<SLARule>): Promise<SLARule> {
  throw new Error('SLA rule management not yet implemented with order_events');
}

export async function deleteSLARule(_id: string): Promise<void> {
  throw new Error('SLA rule management not yet implemented with order_events');
}

export async function fetchSLAResultsForOrder(_orderId: string): Promise<SLAResult[]> {
  // Can be migrated to use order_events
  return [];
}

export async function fetchSLAResults(
  _companyId: string,
  _filters?: {
    status?: SLAResultStatus;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<SLAResult[]> {
  return [];
}

export async function fetchSLAAlerts(
  _companyId: string,
  _unresolvedOnly = true
): Promise<SLAAlert[]> {
  return [];
}

// Updated to use event-based calculation
export async function calculateSLACompliance(
  companyId: string,
  days: number = 7
): Promise<{
  compliance: number;
  total: number;
  met: number;
  atRisk: number;
  breached: number;
}> {
  const result = await calculateSLAComplianceFromEvents(companyId, 1440, days);
  return {
    compliance: result.compliance,
    total: result.total,
    met: result.met,
    atRisk: result.atRisk,
    breached: result.breached,
  };
}

export async function triggerSLACalculation(_orderId: string): Promise<void> {
  console.debug('SLA calculation now uses order_events automatically');
}
