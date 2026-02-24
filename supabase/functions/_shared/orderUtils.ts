/**
 * Shared order utility functions for edge functions.
 * Implements IT specification for status code mapping based on Return_Status and Shipment_Status.
 */

export type OrderStatus = 'received' | 'putaway' | 'picking' | 'packing' | 'ready_to_ship' | 'shipped' | 'delivered';

/**
 * Status codes 1-9 based on IT specification
 * Used to determine order status from Return_Status and Shipment_Status
 */
export type StatusCode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Get Header Status Code (1-9) based on Return_Status and Shipment_Status
 * IT Specification Logic:
 * - If Return_Status is blank: map based on Shipment_Status
 * - If Return_Status is not blank: map based on Return_Status
 */
export function getHeaderStatusCode(returnStatus?: string, shipmentStatus?: string): StatusCode {
  const isReturnBlank = !returnStatus || returnStatus === '_blank_' || returnStatus.trim() === '';
  
  if (isReturnBlank) {
    // Map based on Shipment_Status
    const shipment = (shipmentStatus || '').toLowerCase().trim();
    
    if (shipment === 'shipped' || shipment === 'versandt') {
      return 1; // Shipped
    }
    if (shipment === 'cancelled' || shipment === 'storniert') {
      return 2; // Cancelled
    }
    if (shipment === 'partial_delivery' || shipment === 'partially_shipped' || shipment.includes('partial')) {
      return 3; // Partial Delivery
    }
    if (shipment === 'in_process' || shipment === 'in process' || shipment === 'in_bearbeitung' || shipment === 'open') {
      return 4; // In Process
    }
    if (shipment === 'delivery_to_store_in_process' || shipment.includes('store') && shipment.includes('process')) {
      return 5; // Delivery to Store in Process
    }
    if (shipment === 'delivered_to_store' || shipment.includes('delivered') && shipment.includes('store')) {
      return 6; // Delivered to Store
    }
    if (shipment === 'picked_up_from_store_by_customer' || shipment.includes('picked_up') || shipment.includes('pickup')) {
      return 7; // Picked up from Store by Customer
    }
    
    // Default for unknown Shipment_Status when Return_Status is blank
    return 4; // Treat as In Process
  } else {
    // Map based on Return_Status
    const returnSt = returnStatus.toLowerCase().trim();
    
    if (returnSt === 'partially_returned' || returnSt.includes('partial') && returnSt.includes('return')) {
      return 8; // Partially Returned
    }
    
    // All other Return_Status values
    return 9; // Other return status (fully returned, etc.)
  }
}

/**
 * Get Position/Line Status Code (1-9) based on QTY_Returned_Calc, Qty, and Shipment_Status
 * IT Specification Logic:
 * - If QTY_Returned_Calc = 0: map based on Shipment_Status (same as header)
 * - If QTY_Returned_Calc > 0: compare with Qty for codes 8/9
 */
export function getPositionStatusCode(qtyReturnedCalc: number, qty: number, shipmentStatus?: string): StatusCode {
  if (qtyReturnedCalc === 0) {
    // Map based on Shipment_Status (same logic as header with blank Return_Status)
    return getHeaderStatusCode(undefined, shipmentStatus);
  } else {
    // QTY_Returned_Calc > 0
    if (qtyReturnedCalc < qty) {
      return 8; // Partially Returned
    } else {
      return 9; // Fully Returned
    }
  }
}

/**
 * Map Status Code (1-9) to OrderStatus
 * Based on IT specification mapping table
 */
export function mapStatusCodeToOrderStatus(code: StatusCode): OrderStatus {
  switch (code) {
    case 1: return 'shipped';     // Shipped
    case 2: return 'received';    // Cancelled - treat as received (no further processing)
    case 3: return 'shipped';     // Partial Delivery - partially shipped
    case 4: return 'received';    // In Process - still being processed
    case 5: return 'delivered';   // Delivery to Store in Process - near delivery
    case 6: return 'delivered';   // Delivered to Store
    case 7: return 'delivered';   // Picked up from Store by Customer
    case 8: return 'shipped';     // Partially Returned - order was shipped, partial return
    case 9: return 'shipped';     // Fully Returned - order was shipped, now returned
    default: return 'received';   // Fallback
  }
}

/**
 * Combined mapping: Return_Status + Shipment_Status -> OrderStatus
 * Primary function for order status determination
 */
export function mapStatusWithReturnStatus(returnStatus?: string, shipmentStatus?: string): OrderStatus {
  const statusCode = getHeaderStatusCode(returnStatus, shipmentStatus);
  return mapStatusCodeToOrderStatus(statusCode);
}

/**
 * Maps Business Central status strings to internal order status.
 * Used by xml-import and xml-import-bulk functions.
 * @deprecated Use mapStatusWithReturnStatus for more accurate status mapping
 */
export function mapStatus(bcStatus?: string): OrderStatus {
  if (!bcStatus) return 'received';
  
  const statusLower = bcStatus.toLowerCase();
  
  if (statusLower.includes('shipped') || statusLower.includes('delivered')) return 'shipped';
  if (statusLower.includes('partial')) return 'shipped';
  if (statusLower.includes('ready')) return 'ready_to_ship';
  if (statusLower.includes('pack')) return 'packing';
  if (statusLower.includes('pick')) return 'picking';
  
  return 'received';
}

/**
 * Company ID mapping from Business Central to internal IDs.
 * Empty string maps to SLK as fallback for SK_Inventory files that don't have Company_Identification_Code
 */
export const companyIdMap: Record<string, string> = {
  'GT': 'GT',
  'NK': 'NAM',
  'AV': 'AVI',
  'E1': 'GF',
  'GF': 'GF',
  'SK': 'SLK', // Stadtlandkind - XML hat "SK", DB hat "SLK"
  '': 'SLK',   // Empty company ID defaults to SLK (for SK_Inventory files without Company_Identification_Code)
};

/**
 * Parses a date string, returning null for invalid dates.
 */
export function parseDate(dateStr?: string): string | null {
  if (!dateStr || dateStr.startsWith('0001')) return null;
  return dateStr;
}
