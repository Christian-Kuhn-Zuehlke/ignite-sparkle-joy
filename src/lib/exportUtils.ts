/**
 * CSV Export Utilities
 */

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Convert array of objects to CSV string
 */
export function toCSV<T>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) return '';
  
  // Header row
  const headerRow = columns.map(col => escapeCSV(col.header)).join(';');
  
  // Data rows
  const dataRows = data.map(row =>
    columns.map(col => escapeCSV(row[col.key])).join(';')
  );
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv;charset=utf-8') {
  // Add BOM for Excel compatibility with UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as CSV file
 */
export function exportToCSV<T>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  filename: string
) {
  const csv = toCSV(data, columns);
  downloadFile(csv, filename);
}

/**
 * Format date for export
 */
export function formatDateForExport(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '';
  return amount.toFixed(2);
}

// Pre-defined column configs for common exports
export const ORDER_EXPORT_COLUMNS = [
  { key: 'source_no' as const, header: 'Order Nr.' },
  { key: 'external_document_no' as const, header: 'Ext. Dok. Nr.' },
  { key: 'order_date' as const, header: 'Bestelldatum' },
  { key: 'company_name' as const, header: 'Unternehmen' },
  { key: 'ship_to_name' as const, header: 'Empfänger' },
  { key: 'ship_to_address' as const, header: 'Adresse' },
  { key: 'ship_to_postcode' as const, header: 'PLZ' },
  { key: 'ship_to_city' as const, header: 'Stadt' },
  { key: 'ship_to_country' as const, header: 'Land' },
  { key: 'status' as const, header: 'Status' },
  { key: 'order_amount' as const, header: 'Betrag' },
  { key: 'shipping_agent_code' as const, header: 'Versandart' },
  { key: 'tracking_code' as const, header: 'Tracking Nr.' },
];

export const INVENTORY_EXPORT_COLUMNS = [
  { key: 'sku' as const, header: 'SKU' },
  { key: 'name' as const, header: 'Artikelname' },
  { key: 'on_hand' as const, header: 'Bestand' },
  { key: 'reserved' as const, header: 'Reserviert' },
  { key: 'available' as const, header: 'Verfügbar' },
  { key: 'low_stock_threshold' as const, header: 'Mindestbestand' },
];

export const RETURNS_EXPORT_COLUMNS = [
  { key: 'id' as const, header: 'Retouren ID' },
  { key: 'return_date' as const, header: 'Retourendatum' },
  { key: 'order_source_no' as const, header: 'Order Nr.' },
  { key: 'company_id' as const, header: 'Unternehmen' },
  { key: 'status' as const, header: 'Status' },
  { key: 'amount' as const, header: 'Betrag' },
  { key: 'reason' as const, header: 'Grund' },
];

// Carrier Performance Export Columns
export const CARRIER_EXPORT_COLUMNS = [
  { key: 'carrier' as const, header: 'Spediteur' },
  { key: 'totalOrders' as const, header: 'Bestellungen' },
  { key: 'deliveredCount' as const, header: 'Zugestellt' },
  { key: 'deliveryRate' as const, header: 'Zustellquote %' },
  { key: 'avgDeliveryDays' as const, header: 'Ø Lieferzeit (Tage)' },
  { key: 'onTimeRate' as const, header: 'Pünktlichkeitsrate %' },
];

// Customer Segmentation Export Columns
export const CUSTOMER_EXPORT_COLUMNS = [
  { key: 'customerNo' as const, header: 'Kundennummer' },
  { key: 'shipToName' as const, header: 'Kundenname' },
  { key: 'segment' as const, header: 'Segment' },
  { key: 'orderCount' as const, header: 'Bestellungen' },
  { key: 'totalRevenue' as const, header: 'Gesamtumsatz' },
  { key: 'avgOrderValue' as const, header: 'Ø Bestellwert' },
  { key: 'lastOrderDate' as const, header: 'Letzte Bestellung' },
];

// Dashboard Metrics Export Columns
export const METRICS_EXPORT_COLUMNS = [
  { key: 'metric' as const, header: 'Kennzahl' },
  { key: 'value' as const, header: 'Wert' },
  { key: 'previousValue' as const, header: 'Vorperiode' },
  { key: 'change' as const, header: 'Veränderung %' },
  { key: 'period' as const, header: 'Zeitraum' },
];
