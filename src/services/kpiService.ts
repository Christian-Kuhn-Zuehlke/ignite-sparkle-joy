import { supabase } from '@/integrations/supabase/client';

export type KpiType = 'delivery_time_sla' | 'processing_time' | 'dock_to_stock';
export type KpiUnit = 'percent' | 'hours' | 'days';

export interface CompanyKpi {
  id: string;
  company_id: string;
  kpi_type: KpiType;
  name: string;
  description: string | null;
  target_value: number;
  unit: KpiUnit;
  warning_threshold: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KpiMeasurement {
  id: string;
  kpi_id: string;
  company_id: string;
  measured_value: number;
  period_start: string;
  period_end: string;
  total_count: number | null;
  success_count: number | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface KpiWithStatus extends CompanyKpi {
  current_value: number | null;
  status: 'achieved' | 'warning' | 'missed' | 'no_data';
  last_measurement?: KpiMeasurement;
}

// Get KPI type label
export function getKpiTypeLabel(type: KpiType): string {
  const labels: Record<KpiType, string> = {
    delivery_time_sla: 'Lieferzeit-SLA',
    processing_time: 'Bearbeitungszeit',
    dock_to_stock: 'Dock-to-Stock',
  };
  return labels[type];
}

// Get KPI type description
export function getKpiTypeDescription(type: KpiType): string {
  const descriptions: Record<KpiType, string> = {
    delivery_time_sla: 'Prozent der Bestellungen, die innerhalb der SLA-Zeit versandt werden',
    processing_time: 'Durchschnittliche Zeit von Bestelleingang bis Versand',
    dock_to_stock: 'Durchlaufzeit vom Wareneingang bis zur Einlagerung',
  };
  return descriptions[type];
}

// Get unit label
export function getUnitLabel(unit: KpiUnit): string {
  const labels: Record<KpiUnit, string> = {
    percent: '%',
    hours: 'Std.',
    days: 'Tage',
  };
  return labels[unit];
}

// Fetch all KPIs for a company
export async function fetchCompanyKpis(companyId?: string): Promise<CompanyKpi[]> {
  let query = supabase
    .from('company_kpis')
    .select('*')
    .order('kpi_type');

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;
  
  if (error) throw error;
  return (data || []) as CompanyKpi[];
}

// Fetch latest measurements for KPIs
export async function fetchLatestMeasurements(kpiIds: string[]): Promise<KpiMeasurement[]> {
  if (kpiIds.length === 0) return [];

  const { data, error } = await supabase
    .from('kpi_measurements')
    .select('*')
    .in('kpi_id', kpiIds)
    .order('period_end', { ascending: false });

  if (error) throw error;
  return (data || []) as KpiMeasurement[];
}

// Fetch KPIs with their current status
export async function fetchKpisWithStatus(companyId?: string): Promise<KpiWithStatus[]> {
  const kpis = await fetchCompanyKpis(companyId);
  
  if (kpis.length === 0) return [];

  const kpiIds = kpis.map(k => k.id);
  const measurements = await fetchLatestMeasurements(kpiIds);

  // Group measurements by KPI and get the latest one
  const latestByKpi = new Map<string, KpiMeasurement>();
  measurements.forEach(m => {
    const existing = latestByKpi.get(m.kpi_id);
    if (!existing || new Date(m.period_end) > new Date(existing.period_end)) {
      latestByKpi.set(m.kpi_id, m);
    }
  });

  return kpis.map(kpi => {
    const lastMeasurement = latestByKpi.get(kpi.id);
    const currentValue = lastMeasurement?.measured_value ?? null;
    
    let status: KpiWithStatus['status'] = 'no_data';
    if (currentValue !== null) {
      if (kpi.unit === 'percent') {
        // For percentage: higher is better
        if (currentValue >= kpi.target_value) {
          status = 'achieved';
        } else if (kpi.warning_threshold && currentValue >= kpi.warning_threshold) {
          status = 'warning';
        } else {
          status = 'missed';
        }
      } else {
        // For time-based: lower is better
        if (currentValue <= kpi.target_value) {
          status = 'achieved';
        } else if (kpi.warning_threshold && currentValue <= kpi.warning_threshold) {
          status = 'warning';
        } else {
          status = 'missed';
        }
      }
    }

    return {
      ...kpi,
      current_value: currentValue,
      status,
      last_measurement: lastMeasurement,
    };
  });
}

// Create or update a KPI
export async function upsertKpi(kpi: Partial<CompanyKpi> & { company_id: string; kpi_type: KpiType }): Promise<CompanyKpi> {
  const insertData = {
    id: kpi.id,
    company_id: kpi.company_id,
    kpi_type: kpi.kpi_type,
    name: kpi.name || getKpiTypeLabel(kpi.kpi_type),
    description: kpi.description,
    target_value: kpi.target_value!,
    unit: kpi.unit || 'percent',
    warning_threshold: kpi.warning_threshold,
    is_active: kpi.is_active ?? true,
  };

  const { data, error } = await supabase
    .from('company_kpis')
    .upsert(insertData, { onConflict: 'company_id,kpi_type' })
    .select()
    .single();

  if (error) throw error;
  return data as CompanyKpi;
}

// Delete a KPI
export async function deleteKpi(kpiId: string): Promise<void> {
  const { error } = await supabase
    .from('company_kpis')
    .delete()
    .eq('id', kpiId);

  if (error) throw error;
}

// Calculate KPI value from orders data
export async function calculateDeliveryTimeSla(
  companyId: string, 
  periodStart: string, 
  periodEnd: string,
  slaHours: number = 24
): Promise<{ value: number; total: number; success: number }> {
  // Get all shipped orders in the period
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_date, posted_shipment_date, status_date')
    .eq('company_id', companyId)
    .eq('status', 'shipped')
    .gte('posted_shipment_date', periodStart)
    .lte('posted_shipment_date', periodEnd);

  if (error) throw error;

  if (!orders || orders.length === 0) {
    return { value: 0, total: 0, success: 0 };
  }

  let successCount = 0;
  orders.forEach(order => {
    if (order.order_date && order.posted_shipment_date) {
      const orderTime = new Date(order.order_date).getTime();
      const shipTime = new Date(order.posted_shipment_date).getTime();
      const hoursDiff = (shipTime - orderTime) / (1000 * 60 * 60);
      
      if (hoursDiff <= slaHours) {
        successCount++;
      }
    }
  });

  const percentage = orders.length > 0 ? (successCount / orders.length) * 100 : 0;

  return {
    value: Math.round(percentage * 10) / 10,
    total: orders.length,
    success: successCount,
  };
}

// Calculate average processing time
export async function calculateProcessingTime(
  companyId: string,
  periodStart: string,
  periodEnd: string
): Promise<{ value: number; total: number }> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('order_date, posted_shipment_date')
    .eq('company_id', companyId)
    .not('posted_shipment_date', 'is', null)
    .gte('posted_shipment_date', periodStart)
    .lte('posted_shipment_date', periodEnd);

  if (error) throw error;

  if (!orders || orders.length === 0) {
    return { value: 0, total: 0 };
  }

  let totalHours = 0;
  let validOrders = 0;

  orders.forEach(order => {
    if (order.order_date && order.posted_shipment_date) {
      const orderTime = new Date(order.order_date).getTime();
      const shipTime = new Date(order.posted_shipment_date).getTime();
      const hoursDiff = (shipTime - orderTime) / (1000 * 60 * 60);
      
      totalHours += hoursDiff;
      validOrders++;
    }
  });

  const avgHours = validOrders > 0 ? totalHours / validOrders : 0;

  return {
    value: Math.round(avgHours * 10) / 10,
    total: validOrders,
  };
}

// Save a measurement
export async function saveMeasurement(
  kpiId: string,
  companyId: string,
  value: number,
  periodStart: string,
  periodEnd: string,
  totalCount?: number,
  successCount?: number,
  details?: Record<string, unknown>
): Promise<KpiMeasurement> {
  const insertData: Record<string, unknown> = {
    kpi_id: kpiId,
    company_id: companyId,
    measured_value: value,
    period_start: periodStart,
    period_end: periodEnd,
    total_count: totalCount,
    success_count: successCount,
    details: details || {},
  };

  const { data, error } = await supabase
    .from('kpi_measurements')
    .insert(insertData as any)
    .select()
    .single();

  if (error) throw error;
  return data as KpiMeasurement;
}

// Get KPI history for a specific KPI
export async function fetchKpiHistory(kpiId: string, limit: number = 30): Promise<KpiMeasurement[]> {
  const { data, error } = await supabase
    .from('kpi_measurements')
    .select('*')
    .eq('kpi_id', kpiId)
    .order('period_end', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as KpiMeasurement[];
}
