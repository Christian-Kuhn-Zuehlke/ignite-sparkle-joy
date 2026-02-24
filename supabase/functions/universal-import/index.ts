import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';
import { mapStatus, mapStatusWithReturnStatus, companyIdMap, parseDate, getHeaderStatusCode, getPositionStatusCode, mapStatusCodeToOrderStatus } from '../_shared/orderUtils.ts';

const logger = new Logger('universal-import');

// Chunk configuration
const CHUNK_SIZE = 100; // Process 100 items at a time
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB threshold for chunked processing

// Types for different data types
type DataType = 'orders' | 'inventory' | 'returns' | 'mixed' | 'unknown';

interface DetectionResult {
  dataType: DataType;
  counts: {
    orders: number;
    inventory: number;
    returns: number;
  };
}

interface ProgressUpdate {
  phase: 'detecting' | 'parsing' | 'importing' | 'complete';
  progress: number; // 0-100
  current: number;
  total: number;
  message: string;
}

interface ImportResults {
  dataType: DataType;
  orders: { imported: number; updated: number; errors: { id: string; error: string }[] };
  inventory: { imported: number; updated: number; lowStockAlerts: number; errors: { sku: string; error: string }[] };
  returns: { imported: number; updated: number; errors: { id: string; error: string }[] };
}

// Detect data type from XML content
function detectDataTypeFromXml(xmlString: string): DetectionResult {
  const counts = {
    orders: 0,
    inventory: 0,
    returns: 0,
  };

  // Count order-related elements
  const orderCountMatches = xmlString.match(/<WSIFOrdRespEshop>/gi);
  counts.orders = orderCountMatches?.length || 0;

  // Count inventory-related elements (both BC and MS Direct formats)
  const bcInventoryMatches = xmlString.match(/<WSIFProductStockItems>/gi);
  const msDirectInventoryMatches = xmlString.match(/<productStockItem>/gi);
  counts.inventory = (bcInventoryMatches?.length || 0) + (msDirectInventoryMatches?.length || 0);

  // Count return-related elements - ONLY count orders with ACTUAL return data
  // NOT just Return_Tracking_Code, as it's present in almost all orders (even without returns)
  // Only count if there's ReturnOrder_Date, Return_Status, or QTY_Returned > 0
  
  // Count unique orders with ACTUAL return data
  const ordersWithReturns = new Set<string>();
  const orderMatchIterator = xmlString.matchAll(/<WSIFOrdRespEshop>([\s\S]*?)<\/WSIFOrdRespEshop>/gi);
  for (const match of orderMatchIterator) {
    const orderContent = match[1];
    
    // Check for ACTUAL return indicators (NOT just tracking code)
    const hasReturnQty = /<QTY_Returned>[^0<]/i.test(orderContent);
    const hasReturnDate = /<ReturnOrder_Date>[^0]/i.test(orderContent) && !/<ReturnOrder_Date>0001-01-01/i.test(orderContent);
    const hasReturnStatus = /<Return_Status>[^_]/i.test(orderContent) && !/<Return_Status>_blank_/i.test(orderContent);
    
    // Also check in lines for QTY_Returned_Calc
    const linesRegex = /<IF_OrdResp_NavOrd_Lines_Sub>([\s\S]*?)<\/IF_OrdResp_NavOrd_Lines_Sub>/gi;
    let lineMatch;
    let hasReturnQtyInLines = false;
    
    while ((lineMatch = linesRegex.exec(orderContent)) !== null) {
      const lineContent = lineMatch[1];
      if (lineContent.includes('<IF_OrdResp_NavOrd_Lines_Sub>')) continue;
      
      const qtyReturnedMatch = lineContent.match(/<QTY_Returned>([^<]+)<\/QTY_Returned>/i);
      const qtyReturnedCalcMatch = lineContent.match(/<QTY_Returned_Calc>([^<]+)<\/QTY_Returned_Calc>/i);
      
      const qtyReturned = parseFloat(qtyReturnedMatch ? qtyReturnedMatch[1].trim() : '0');
      const qtyReturnedCalc = parseFloat(qtyReturnedCalcMatch ? qtyReturnedCalcMatch[1].trim() : '0');
      
      if (qtyReturned > 0 || qtyReturnedCalc > 0) {
        hasReturnQtyInLines = true;
        break;
      }
    }
    
    // Only count as return if there's ACTUAL return data (Date, Status, or Qty)
    // NOT just Return_Tracking_Code
    if (hasReturnQty || hasReturnDate || hasReturnStatus || hasReturnQtyInLines) {
      const sourceNoMatch = orderContent.match(/<Source_No>([^<]+)<\/Source_No>/i);
      if (sourceNoMatch) {
        ordersWithReturns.add(sourceNoMatch[1]);
      }
    }
  }
  
  // Use only the count of orders with ACTUAL return data
  // NOT returnTrackingMatches, as Return_Tracking_Code is present in almost all orders
  counts.returns = ordersWithReturns.size;

  // Determine primary data type
  let dataType: DataType = 'unknown';
  const total = counts.orders + counts.inventory + counts.returns;

  if (total === 0) {
    dataType = 'unknown';
  } else if (counts.orders > 0 && counts.inventory > 0) {
    dataType = 'mixed';
  } else if (counts.orders > 0 && counts.returns > 0) {
    dataType = 'mixed';
  } else if (counts.orders > 0) {
    dataType = 'orders';
  } else if (counts.inventory > 0) {
    dataType = 'inventory';
  } else if (counts.returns > 0) {
    dataType = 'returns';
  }

  return { dataType, counts };
}

// Detect data type from JSON content
function detectDataTypeFromJson(jsonData: unknown): DetectionResult {
  const counts = {
    orders: 0,
    inventory: 0,
    returns: 0,
  };

  // Handle array of items
  if (Array.isArray(jsonData)) {
    for (const item of jsonData) {
      if (item.SourceNo || item.source_no || item.orderNo || item.order_no) {
        counts.orders++;
      } else if (item.sku || item.SKU || item.itemNo || item.item_no) {
        counts.inventory++;
      } else if (item.returnId || item.return_id) {
        counts.returns++;
      }
    }
  } 
  // Handle object with typed arrays
  else if (typeof jsonData === 'object' && jsonData !== null) {
    const data = jsonData as Record<string, unknown>;
    if (Array.isArray(data.orders)) {
      counts.orders = data.orders.length;
    }
    if (Array.isArray(data.inventory)) {
      counts.inventory = data.inventory.length;
    }
    if (Array.isArray(data.returns)) {
      counts.returns = data.returns.length;
    }
  }

  // Determine primary data type
  let dataType: DataType = 'unknown';
  const total = counts.orders + counts.inventory + counts.returns;

  if (total === 0) {
    dataType = 'unknown';
  } else if ((counts.orders > 0 && counts.inventory > 0) || (counts.orders > 0 && counts.returns > 0)) {
    dataType = 'mixed';
  } else if (counts.orders > 0) {
    dataType = 'orders';
  } else if (counts.inventory > 0) {
    dataType = 'inventory';
  } else if (counts.returns > 0) {
    dataType = 'returns';
  }

  return { dataType, counts };
}

// Parse orders from JSON
function parseOrdersFromJson(jsonData: unknown): ParsedOrder[] {
  const orders: ParsedOrder[] = [];
  
  let rawOrders: unknown[] = [];
  
  if (Array.isArray(jsonData)) {
    rawOrders = jsonData;
  } else if (typeof jsonData === 'object' && jsonData !== null) {
    const data = jsonData as Record<string, unknown>;
    if (Array.isArray(data.orders)) {
      rawOrders = data.orders;
    }
  }

  for (const item of rawOrders) {
    if (typeof item !== 'object' || item === null) continue;
    const order = item as Record<string, unknown>;
    
    const lines: ParsedOrder['Lines'] = [];
    if (Array.isArray(order.lines) || Array.isArray(order.Lines)) {
      const rawLines = (order.lines || order.Lines) as Record<string, unknown>[];
      for (const line of rawLines) {
        lines.push({
          No: String(line.no || line.No || line.sku || line.SKU || ''),
          Description: String(line.description || line.Description || line.name || ''),
          Quantity: Number(line.quantity || line.Quantity || line.qty || 1),
          UnitPrice: Number(line.unitPrice || line.UnitPrice || line.price || 0),
        });
      }
    }

    orders.push({
      SourceNo: String(order.SourceNo || order.source_no || order.orderNo || order.order_no || ''),
      ExternalDocumentNo: order.ExternalDocumentNo || order.external_document_no ? String(order.ExternalDocumentNo || order.external_document_no) : undefined,
      CustomerNo: order.CustomerNo || order.customer_no ? String(order.CustomerNo || order.customer_no) : undefined,
      CompanyName: String(order.CompanyName || order.company_name || ''),
      CompanyId: String(order.CompanyId || order.company_id || ''),
      OrderDate: String(order.OrderDate || order.order_date || new Date().toISOString().split('T')[0]),
      ShipToName: String(order.ShipToName || order.ship_to_name || ''),
      ShipToAddress: order.ShipToAddress || order.ship_to_address ? String(order.ShipToAddress || order.ship_to_address) : undefined,
      ShipToPostCode: order.ShipToPostCode || order.ship_to_postcode ? String(order.ShipToPostCode || order.ship_to_postcode) : undefined,
      ShipToCity: order.ShipToCity || order.ship_to_city ? String(order.ShipToCity || order.ship_to_city) : undefined,
      ShipToCountry: order.ShipToCountry || order.ship_to_country ? String(order.ShipToCountry || order.ship_to_country) : 'CH',
      ShippingAgentCode: order.ShippingAgentCode || order.shipping_agent_code ? String(order.ShippingAgentCode || order.shipping_agent_code) : undefined,
      TrackingCode: order.TrackingCode || order.tracking_code ? String(order.TrackingCode || order.tracking_code) : undefined,
      TrackingLink: order.TrackingLink || order.tracking_link ? String(order.TrackingLink || order.tracking_link) : undefined,
      OrderAmount: order.OrderAmount || order.order_amount ? Number(order.OrderAmount || order.order_amount) : undefined,
      PostedShipmentDate: order.PostedShipmentDate || order.posted_shipment_date ? String(order.PostedShipmentDate || order.posted_shipment_date) : undefined,
      PostedInvoiceDate: order.PostedInvoiceDate || order.posted_invoice_date ? String(order.PostedInvoiceDate || order.posted_invoice_date) : undefined,
      ShipmentStatus: order.ShipmentStatus || order.shipment_status || order.status ? String(order.ShipmentStatus || order.shipment_status || order.status) : undefined,
      Lines: lines,
    });
  }

  return orders.filter(o => o.SourceNo);
}

// Parse Orders XML
interface ParsedOrder {
  SourceNo: string;
  ExternalDocumentNo?: string;
  CustomerNo?: string;
  CompanyName: string;
  CompanyId: string;
  OrderDate: string;
  ShipToName: string;
  ShipToAddress?: string;
  ShipToPostCode?: string;
  ShipToCity?: string;
  ShipToCountry?: string;
  ShippingAgentCode?: string;
  TrackingCode?: string;
  TrackingLink?: string;
  OrderAmount?: number;
  PostedShipmentDate?: string;
  PostedInvoiceDate?: string;
  ShipmentStatus?: string;
  ReturnStatus?: string; // Added for Header Status Code mapping
  Lines: { 
    No: string; 
    Description: string; 
    Quantity: number; 
    UnitPrice: number;
    QtyReturnedCalc?: number; // Added for Position Status Code mapping
    ShipmentStatus?: string; // Line-level shipment status
  }[];
}

function parseOrdersXML(xmlString: string): ParsedOrder[] {
  const orders: ParsedOrder[] = [];
  const orderRegex = /<WSIFOrdRespEshop>([\s\S]*?)<\/WSIFOrdRespEshop>/gi;
  let orderMatch;

  while ((orderMatch = orderRegex.exec(xmlString)) !== null) {
    const orderContent = orderMatch[1];

    const getValue = (tag: string): string | undefined => {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const match = orderContent.match(regex);
      return match ? match[1].trim() : undefined;
    };

    const order: ParsedOrder = {
      SourceNo: getValue('Source_No') || '',
      ExternalDocumentNo: getValue('External_Document_No') || getValue('EShop_Document_No'),
      CustomerNo: getValue('SellTo_CustomerNo_NAV') || getValue('CustomerNo_Externall'),
      CompanyName: getValue('Company_Name') || '',
      CompanyId: getValue('Company_ID') || '',
      OrderDate: getValue('OrderDate') || new Date().toISOString().split('T')[0],
      ShipToName: getValue('ShipTo_Name') || '',
      ShipToAddress: getValue('ShipTo_Address'),
      ShipToPostCode: getValue('ShipTo_Postcode'),
      ShipToCity: getValue('ShipTo_City'),
      ShipToCountry: getValue('Ship_to_Country') || 'CH',
      ShippingAgentCode: getValue('Shipping_Agent_Code'),
      TrackingCode: getValue('Tracking_Code_last'),
      TrackingLink: getValue('Tracking_Link_last'),
      OrderAmount: getValue('OrderAmount_Info') ? parseFloat(getValue('OrderAmount_Info')!) : undefined,
      PostedShipmentDate: getValue('Posted_Shipmnt_Date'),
      PostedInvoiceDate: getValue('Posted_Invoice_Date'),
      ShipmentStatus: getValue('Shipment_Status'),
      ReturnStatus: getValue('Return_Status'), // Extract Return_Status for Header Status Code mapping
      Lines: [],
    };

    // Parse order lines
    const linesRegex = /<IF_OrdResp_NavOrd_Lines_Sub>([\s\S]*?)<\/IF_OrdResp_NavOrd_Lines_Sub>/gi;
    let lineMatch;

    while ((lineMatch = linesRegex.exec(orderContent)) !== null) {
      const lineContent = lineMatch[1];
      if (lineContent.includes('<IF_OrdResp_NavOrd_Lines_Sub>')) continue;

      const getLineValue = (tag: string): string | undefined => {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const match = lineContent.match(regex);
        return match ? match[1].trim() : undefined;
      };

      const lineNo = getLineValue('No');
      if (lineNo) {
        order.Lines.push({
          No: lineNo,
          Description: getLineValue('Description') || '',
          Quantity: parseInt(getLineValue('Qty') || '1', 10),
          UnitPrice: parseFloat(getLineValue('Unit_Price') || '0'),
          QtyReturnedCalc: parseFloat(getLineValue('QTY_Returned_Calc') || '0'), // For Position Status Code mapping
          ShipmentStatus: getLineValue('Shipment_Status') || order.ShipmentStatus, // Line-level or fallback to order-level
        });
      }
    }

    if (order.SourceNo) {
      orders.push(order);
    }
  }

  return orders;
}

// Parse Inventory XML
interface ParsedInventoryItem {
  CompanyId: string;
  ItemNo: string;
  Name: string;
  CalculatedQty: number;
  Reserved: number;
  OnHand: number;
  Blocked: boolean;
}

function parseInventoryXML(xmlString: string): ParsedInventoryItem[] {
  const items: ParsedInventoryItem[] = [];
  
  // Try MS Direct format first (productStockItem)
  const msDirectMatch = xmlString.match(/<productStockItems>([\s\S]*?)<\/productStockItems>/i);
  if (msDirectMatch) {
    const itemsContent = msDirectMatch[1];
    const productMatches = itemsContent.matchAll(/<productStockItem>([\s\S]*?)<\/productStockItem>/gi);
    
    // Extract company ID from messageHeader
    const clientIdMatch = xmlString.match(/<clientId>([\s\S]*?)<\/clientId>/i);
    const companyId = clientIdMatch ? clientIdMatch[1].trim() : '';
    
    for (const match of productMatches) {
      const itemContent = match[1];
      
      const getValue = (tag: string): string | undefined => {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const m = itemContent.match(regex);
        return m ? m[1].trim() : undefined;
      };
      
      const itemNo = getValue('itemNo');
      if (!itemNo) continue;
      
      const calculatetQuantity = parseFloat(getValue('calculatetQuantity') || '0');
      const qtyOnLocalStock = parseFloat(getValue('qtyOnLocalStock') || '0');
      const qtyOnSalesOrder = parseFloat(getValue('qtyOnSalesOrder') || '0');
      const blocked = parseInt(getValue('blocked') || '0', 10);
      
      // Calculate: onHand = qtyOnLocalStock, reserved = qtyOnSalesOrder
      const onHand = Math.max(0, qtyOnLocalStock);
      const reserved = Math.max(0, qtyOnSalesOrder);
      
      items.push({
        CompanyId: companyId,
        ItemNo: itemNo,
        Name: getValue('description') || getValue('itemDescription') || itemNo,
        CalculatedQty: calculatetQuantity,
        Reserved: reserved,
        OnHand: onHand,
        Blocked: blocked > 0,
      });
    }
    
    if (items.length > 0) {
      return items;
    }
  }
  
  // Fallback to Business Central format (WSIFProductStockItems)
  const itemRegex = /<WSIFProductStockItems>([\s\S]*?)<\/WSIFProductStockItems>/gi;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xmlString)) !== null) {
    const itemContent = itemMatch[1];

    const getValue = (tag: string): string | undefined => {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const match = itemContent.match(regex);
      return match ? match[1].trim() : undefined;
    };

    const itemNo = getValue('Item_No');
    if (!itemNo) continue;

    const calculatedQty = parseInt(getValue('Calculated_Qty') || '0', 10);
    const reserved = parseInt(getValue('Qty_Reserved') || '0', 10);
    const internalInventory = parseInt(getValue('Internal_Inventory') || '0', 10);

    items.push({
      CompanyId: getValue('Company_Identification_Code') || '',
      ItemNo: itemNo,
      Name: getValue('Description') || itemNo,
      CalculatedQty: calculatedQty,
      Reserved: reserved,
      OnHand: internalInventory,
      Blocked: getValue('Blocked') === 'true',
    });
  }

  return items;
}

// Parse Returns XML - Extract returns from OrderState data
interface ParsedReturn {
  ReturnNo: string; // Use order source_no + '-RET' or tracking code
  OrderSourceNo: string; // Original order source number
  CompanyId: string;
  CompanyName: string;
  ReturnDate: string;
  Status: string; // Map Return_Status to return_status enum
  Amount?: number;
  Reason?: string;
  TrackingCode?: string;
  TrackingLink?: string;
  PostedReturnShipmentDate?: string;
  PostedCrMemoDate?: string;
  PostedCrMemoAmount?: number;
  Lines: { Sku: string; Name: string; Quantity: number; Reason?: string; Quality?: string }[];
}

function parseReturnsXML(xmlString: string): ParsedReturn[] {
  const returns: ParsedReturn[] = [];
  const orderRegex = /<WSIFOrdRespEshop>([\s\S]*?)<\/WSIFOrdRespEshop>/gi;
  let orderMatch;

  while ((orderMatch = orderRegex.exec(xmlString)) !== null) {
    const orderContent = orderMatch[1];

    const getValue = (tag: string): string | undefined => {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const match = orderContent.match(regex);
      return match ? match[1].trim() : undefined;
    };

    const sourceNo = getValue('Source_No');
    if (!sourceNo) continue;

    // Check if this order has return data
    const returnTrackingCode = getValue('Return_Tracking_Code_last');
    const returnOrderDate = getValue('ReturnOrder_Date');
    const returnStatus = getValue('Return_Status');
    const qtyReturned = getValue('QTY_Returned'); // Check in lines

    // Parse order lines to check for returned quantities
    const linesRegex = /<IF_OrdResp_NavOrd_Lines_Sub>([\s\S]*?)<\/IF_OrdResp_NavOrd_Lines_Sub>/gi;
    let lineMatch;
    const returnLines: { Sku: string; Name: string; Quantity: number; Reason?: string; Quality?: string }[] = [];
    let hasReturnedItems = false;

    while ((lineMatch = linesRegex.exec(orderContent)) !== null) {
      const lineContent = lineMatch[1];
      if (lineContent.includes('<IF_OrdResp_NavOrd_Lines_Sub>')) continue;

      const getLineValue = (tag: string): string | undefined => {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const match = lineContent.match(regex);
        return match ? match[1].trim() : undefined;
      };

      const qtyReturnedLine = parseFloat(getLineValue('QTY_Returned') || '0');
      const qtyReturnedCalc = parseFloat(getLineValue('QTY_Returned_Calc') || '0');
      const qtyReturnedTotal = Math.max(qtyReturnedLine, qtyReturnedCalc);

      if (qtyReturnedTotal > 0) {
        hasReturnedItems = true;
        const lineNo = getLineValue('No');
        if (lineNo) {
          returnLines.push({
            Sku: lineNo,
            Name: getLineValue('Description') || '',
            Quantity: Math.round(qtyReturnedTotal),
            Reason: getLineValue('Return_Reason'),
            Quality: getLineValue('Return_Quality'),
          });
        }
      }
    }

    // Create return if there's ACTUAL return data:
    // 1. Has return order date (not empty/default), OR
    // 2. Has returned items in lines (QTY_Returned > 0), OR
    // 3. Has return status (not blank)
    // NOTE: NOT just Return_Tracking_Code, as it's present in almost all orders
    const hasReturnDate = returnOrderDate && returnOrderDate !== '0001-01-01' && returnOrderDate !== '';
    const hasReturnStatus = returnStatus && returnStatus !== '_blank_' && returnStatus !== '';
    const returnAmount = getValue('ReturnOrderAmount_Info') ? parseFloat(getValue('ReturnOrderAmount_Info')!) : undefined;

    // Only create return if there's ACTUAL return data (Date, Status, or Qty)
    // Return_Tracking_Code alone is NOT sufficient
    if (hasReturnDate || hasReturnedItems || hasReturnStatus) {
      // Use return tracking code as return number, or generate one
      const returnNo = returnTrackingCode || `${sourceNo}-RET`;

      // Determine return date
      let returnDate = returnOrderDate;
      if (!returnDate || returnDate === '0001-01-01' || returnDate === '') {
        // Use posted return shipment date, or posted cr memo date, or order date
        returnDate = getValue('Posted_RtrnShipmnt_Date') || 
                    getValue('Posted_CrMemo_Date') || 
                    getValue('OrderDate') || 
                    new Date().toISOString().split('T')[0];
      }

      // Map return status
      let status = 'initiated';
      if (returnStatus && returnStatus !== '_blank_') {
        const statusLower = returnStatus.toLowerCase();
        if (statusLower.includes('returned') || statusLower.includes('completed') || statusLower.includes('done')) {
          status = 'completed';
        } else if (statusLower.includes('received')) {
          status = 'received';
        } else if (statusLower.includes('processing') || statusLower.includes('process')) {
          status = 'processing';
        } else if (statusLower.includes('transit') || statusLower.includes('shipped')) {
          status = 'in_transit';
        }
      } else if (getValue('Posted_RtrnShipmnt_Date') && getValue('Posted_RtrnShipmnt_Date') !== '0001-01-01') {
        status = 'received';
      }

      // If no return lines but has return data, create a placeholder line
      if (returnLines.length === 0 && (returnTrackingCode || hasReturnDate || returnAmount)) {
        // Try to get order lines as return lines
        const orderLinesRegex = /<IF_OrdResp_NavOrd_Lines_Sub>([\s\S]*?)<\/IF_OrdResp_NavOrd_Lines_Sub>/gi;
        let orderLineMatch;
        while ((orderLineMatch = orderLinesRegex.exec(orderContent)) !== null) {
          const orderLineContent = orderLineMatch[1];
          if (orderLineContent.includes('<IF_OrdResp_NavOrd_Lines_Sub>')) continue;

          const getOrderLineValue = (tag: string): string | undefined => {
            const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
            const match = orderLineContent.match(regex);
            return match ? match[1].trim() : undefined;
          };

          const lineNo = getOrderLineValue('No');
          if (lineNo) {
            returnLines.push({
              Sku: lineNo,
              Name: getOrderLineValue('Description') || '',
              Quantity: parseInt(getOrderLineValue('Qty') || '1', 10),
            });
          }
        }
      }

      returns.push({
        ReturnNo: returnNo,
        OrderSourceNo: sourceNo,
        CompanyId: getValue('Company_ID') || '',
        CompanyName: getValue('Company_Name') || '',
        ReturnDate: returnDate,
        Status: status,
        Amount: returnAmount,
        Reason: getValue('Return_Reason') || undefined,
        TrackingCode: returnTrackingCode,
        TrackingLink: getValue('Return_Tracking_Link_last'),
        PostedReturnShipmentDate: getValue('Posted_RtrnShipmnt_Date'),
        PostedCrMemoDate: getValue('Posted_CrMemo_Date'),
        PostedCrMemoAmount: getValue('Posted_CrMemo_Amt_Total') ? parseFloat(getValue('Posted_CrMemo_Amt_Total')!) : undefined,
        Lines: returnLines,
      });
    }
  }

  logger.info('Parsed returns from OrderState', { count: returns.length });
  return returns;
}

// Chunked import functions with progress callback
async function importOrdersChunked(
  supabase: any, 
  orders: ParsedOrder[], 
  onProgress?: (current: number, total: number) => void
): Promise<ImportResults['orders']> {
  const results = { imported: 0, updated: 0, errors: [] as { id: string; error: string }[] };
  const total = orders.length;

  for (let i = 0; i < orders.length; i += CHUNK_SIZE) {
    const chunk = orders.slice(i, Math.min(i + CHUNK_SIZE, orders.length));
    
    for (const order of chunk) {
      try {
        const companyId = companyIdMap[order.CompanyId] || order.CompanyId;

        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('source_no', order.SourceNo)
          .eq('company_id', companyId)
          .maybeSingle();

        // Use enhanced status mapping with Return_Status and Shipment_Status
        // This implements the Header Status Code mapping logic from IT specification
        const mappedStatus = mapStatusWithReturnStatus(order.ReturnStatus, order.ShipmentStatus);

        const orderData = {
          source_no: order.SourceNo,
          external_document_no: order.ExternalDocumentNo,
          customer_no: order.CustomerNo,
          company_id: companyId,
          company_name: order.CompanyName,
          order_date: order.OrderDate,
          ship_to_name: order.ShipToName,
          ship_to_address: order.ShipToAddress,
          ship_to_postcode: order.ShipToPostCode,
          ship_to_city: order.ShipToCity,
          ship_to_country: order.ShipToCountry || 'CH',
          shipping_agent_code: order.ShippingAgentCode,
          tracking_code: order.TrackingCode,
          tracking_link: order.TrackingLink,
          order_amount: order.OrderAmount || 0,
          posted_shipment_date: parseDate(order.PostedShipmentDate),
          posted_invoice_date: parseDate(order.PostedInvoiceDate),
          status: mappedStatus, // Use enhanced status mapping
          source_system: 'business_central',
          updated_at: new Date().toISOString(),
        };

        let orderId: string;

        if (existingOrder) {
          const { error: updateError } = await supabase
            .from('orders')
            .update(orderData)
            .eq('id', existingOrder.id);

          if (updateError) throw updateError;
          orderId = existingOrder.id;
          results.updated++;
        } else {
          const { data: newOrder, error: insertError } = await supabase
            .from('orders')
            .insert(orderData)
            .select('id')
            .single();

          if (insertError) throw insertError;
          orderId = newOrder.id;
          results.imported++;
        }

        // Handle order lines
        if (order.Lines && order.Lines.length > 0) {
          if (existingOrder) {
            await supabase.from('order_lines').delete().eq('order_id', orderId);
          }

          const orderLines = order.Lines.map(line => ({
            order_id: orderId,
            sku: line.No,
            name: line.Description,
            quantity: line.Quantity,
            price: line.UnitPrice,
          }));

          await supabase.from('order_lines').insert(orderLines);
        }
      } catch (err) {
        logger.error('Error importing order', err instanceof Error ? err : new Error(String(err)), { orderNo: order.SourceNo });
        results.errors.push({
          id: order.SourceNo,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Report progress after each chunk
    const processed = Math.min(i + chunk.length, total);
    onProgress?.(processed, total);
  }

  return results;
}

async function importInventoryChunked(
  supabase: any, 
  items: ParsedInventoryItem[],
  onProgress?: (current: number, total: number) => void
): Promise<ImportResults['inventory']> {
  const results = { imported: 0, updated: 0, lowStockAlerts: 0, errors: [] as { sku: string; error: string }[] };
  const total = items.length;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, Math.min(i + CHUNK_SIZE, items.length));

    for (const item of chunk) {
      try {
        const mappedCompanyId = companyIdMap[item.CompanyId] || item.CompanyId;

        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('id', mappedCompanyId)
          .maybeSingle();

        if (!company) {
          results.errors.push({
            sku: item.ItemNo,
            error: `Company not found: ${item.CompanyId}`,
          });
          continue;
        }

        const { data: existingItem } = await supabase
          .from('inventory')
          .select('id, low_stock_threshold')
          .eq('sku', item.ItemNo)
          .eq('company_id', mappedCompanyId)
          .maybeSingle();

        const inventoryData = {
          sku: item.ItemNo,
          name: item.Name,
          company_id: mappedCompanyId,
          on_hand: item.OnHand,
          reserved: item.Reserved,
          updated_at: new Date().toISOString(),
        };

        if (existingItem) {
          const { error: updateError } = await supabase
            .from('inventory')
            .update(inventoryData)
            .eq('id', existingItem.id);

          if (updateError) throw updateError;
          results.updated++;

          if (existingItem.low_stock_threshold && item.CalculatedQty <= existingItem.low_stock_threshold) {
            results.lowStockAlerts++;
          }
        } else {
          const { error: insertError } = await supabase
            .from('inventory')
            .insert({
              ...inventoryData,
              low_stock_threshold: 10,
            });

          if (insertError) throw insertError;
          results.imported++;
        }
      } catch (err) {
        logger.error('Error importing inventory item', err instanceof Error ? err : new Error(String(err)), { sku: item.ItemNo });
        results.errors.push({
          sku: item.ItemNo,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Report progress after each chunk
    const processed = Math.min(i + chunk.length, total);
    onProgress?.(processed, total);
  }

  return results;
}

async function importReturnsChunked(
  supabase: any, 
  returns: ParsedReturn[],
  onProgress?: (current: number, total: number) => void
): Promise<ImportResults['returns']> {
  const results = { imported: 0, updated: 0, errors: [] as { id: string; error: string }[] };
  const total = returns.length;

  for (let i = 0; i < returns.length; i += CHUNK_SIZE) {
    const chunk = returns.slice(i, Math.min(i + CHUNK_SIZE, returns.length));

    for (const returnData of chunk) {
      try {
        const mappedCompanyId = companyIdMap[returnData.CompanyId] || returnData.CompanyId;

        // Find the associated order by source_no
        let orderId: string | null = null;
        if (returnData.OrderSourceNo) {
          const { data: order } = await supabase
            .from('orders')
            .select('id')
            .eq('source_no', returnData.OrderSourceNo)
            .eq('company_id', mappedCompanyId)
            .maybeSingle();
          
          if (order) {
            orderId = order.id;
          }
        }

        // Check if return already exists (by order_id)
        let existingReturn: { id: string } | null = null;
        
        if (orderId) {
          const { data: returnByOrder } = await supabase
            .from('returns')
            .select('id')
            .eq('order_id', orderId)
            .eq('company_id', mappedCompanyId)
            .maybeSingle();
          
          if (returnByOrder) {
            existingReturn = returnByOrder;
          }
        }
        
        // If no return found by order_id, try to find by matching order source_no
        if (!existingReturn && returnData.OrderSourceNo) {
          const { data: matchingOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('source_no', returnData.OrderSourceNo)
            .eq('company_id', mappedCompanyId)
            .maybeSingle();
          
          if (matchingOrder) {
            const { data: returnByOrder } = await supabase
              .from('returns')
              .select('id')
              .eq('order_id', matchingOrder.id)
              .eq('company_id', mappedCompanyId)
              .maybeSingle();
            
            if (returnByOrder) {
              existingReturn = returnByOrder;
            }
          }
        }

        const returnRecord = {
          order_id: orderId,
          company_id: mappedCompanyId,
          return_date: parseDate(returnData.ReturnDate) || new Date().toISOString().split('T')[0],
          status: mapReturnStatus(returnData.Status),
          amount: returnData.Amount || returnData.PostedCrMemoAmount || 0,
          reason: returnData.Reason || undefined,
          updated_at: new Date().toISOString(),
        };

        let returnId: string;

        if (existingReturn) {
          const { error: updateError } = await supabase
            .from('returns')
            .update(returnRecord)
            .eq('id', existingReturn.id);

          if (updateError) throw updateError;
          returnId = existingReturn.id;
          results.updated++;
        } else {
          const { data: newReturn, error: insertError } = await supabase
            .from('returns')
            .insert(returnRecord)
            .select('id')
            .single();

          if (insertError) throw insertError;
          returnId = newReturn.id;
          results.imported++;
        }

        // Handle return lines
        if (returnData.Lines && returnData.Lines.length > 0) {
          // Delete existing return lines if updating
          if (existingReturn) {
            await supabase.from('return_lines').delete().eq('return_id', returnId);
          }

          const returnLines = returnData.Lines
            .filter(line => line.Quantity > 0) // Only include lines with returned quantity
            .map(line => ({
              return_id: returnId,
              sku: line.Sku,
              name: line.Name,
              quantity: line.Quantity,
            }));

          if (returnLines.length > 0) {
            const { error: linesError } = await supabase
              .from('return_lines')
              .insert(returnLines);

            if (linesError) throw linesError;
          }
        }
      } catch (err) {
        logger.error('Error importing return', err instanceof Error ? err : new Error(String(err)), { returnNo: returnData.ReturnNo });
        results.errors.push({
          id: returnData.ReturnNo,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Report progress after each chunk
    const processed = Math.min(i + chunk.length, total);
    onProgress?.(processed, total);
  }

  return results;
}

// Helper function to map return status string to enum
function mapReturnStatus(status: string): 'initiated' | 'in_transit' | 'received' | 'processing' | 'completed' {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('completed') || statusLower.includes('done')) {
    return 'completed';
  }
  if (statusLower.includes('processing') || statusLower.includes('process')) {
    return 'processing';
  }
  if (statusLower.includes('received') || statusLower.includes('receive')) {
    return 'received';
  }
  if (statusLower.includes('transit') || statusLower.includes('shipped')) {
    return 'in_transit';
  }
  return 'initiated';
}

// Helper to create SSE message
function createSSEMessage(data: ProgressUpdate | ImportResults & { success: boolean; message: string }): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 5, windowMs: 60000 });

  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', { clientId });
    return rateLimitResponse(corsHeaders, rateLimit.resetIn);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contentType = req.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const body = await req.text();
    const isLargeFile = body.length > LARGE_FILE_THRESHOLD;
    const useStreaming = req.headers.get('accept')?.includes('text/event-stream') && isLargeFile;
    
    logger.info('Received universal import', { 
      bodyLength: body.length, 
      isLargeFile, 
      useStreaming,
      isJson,
    });

    if (!body || body.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Empty request body',
          detectedType: 'unknown',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON if applicable
    let jsonData: unknown = null;
    if (isJson) {
      try {
        jsonData = JSON.parse(body);
      } catch (e) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Invalid JSON format',
            detectedType: 'unknown',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Detect data type
    const detection = isJson ? detectDataTypeFromJson(jsonData) : detectDataTypeFromXml(body);
    logger.info('Detected data type', { detection });

    if (detection.dataType === 'unknown') {
      return new Response(
        JSON.stringify({
          success: false,
          message: isJson 
            ? 'Could not detect data type from JSON. Expected array of orders/inventory or object with orders/inventory arrays.'
            : 'Could not detect data type from XML. Supported formats: Orders (WSIFOrdRespEshop), Inventory (WSIFProductStockItems or productStockItem)',
          detectedType: 'unknown',
          counts: detection.counts,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For streaming responses (large files)
    if (useStreaming) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send initial detection progress
            controller.enqueue(encoder.encode(createSSEMessage({
              phase: 'detecting',
              progress: 10,
              current: 0,
              total: 0,
              message: `Erkannt: ${detection.dataType}`,
            })));

            const results: ImportResults = {
              dataType: detection.dataType,
              orders: { imported: 0, updated: 0, errors: [] },
              inventory: { imported: 0, updated: 0, lowStockAlerts: 0, errors: [] },
              returns: { imported: 0, updated: 0, errors: [] },
            };

            let overallProgress = 10;
            const totalItems = detection.counts.orders + detection.counts.inventory + detection.counts.returns;
            let processedItems = 0;

            // Process orders
            if (detection.counts.orders > 0) {
              controller.enqueue(encoder.encode(createSSEMessage({
                phase: 'parsing',
                progress: 15,
                current: 0,
                total: detection.counts.orders,
                message: 'Parse Aufträge...',
              })));

              const orders = isJson ? parseOrdersFromJson(jsonData) : parseOrdersXML(body);
              
              controller.enqueue(encoder.encode(createSSEMessage({
                phase: 'importing',
                progress: 20,
                current: 0,
                total: orders.length,
                message: `Importiere ${orders.length} Aufträge...`,
              })));

              results.orders = await importOrdersChunked(supabase, orders, (current, total) => {
                const itemProgress = (current / total) * (detection.counts.orders / totalItems) * 70;
                controller.enqueue(encoder.encode(createSSEMessage({
                  phase: 'importing',
                  progress: Math.round(20 + itemProgress),
                  current,
                  total,
                  message: `Aufträge: ${current}/${total}`,
                })));
              });
              processedItems += detection.counts.orders;
            }

            // Process inventory
            if (detection.counts.inventory > 0) {
              const baseProgress = 20 + (processedItems / totalItems) * 70;
              
              controller.enqueue(encoder.encode(createSSEMessage({
                phase: 'parsing',
                progress: Math.round(baseProgress),
                current: 0,
                total: detection.counts.inventory,
                message: 'Parse Inventar...',
              })));

              const items = parseInventoryXML(body); // JSON inventory parsing not implemented yet
              
              controller.enqueue(encoder.encode(createSSEMessage({
                phase: 'importing',
                progress: Math.round(baseProgress + 5),
                current: 0,
                total: items.length,
                message: `Importiere ${items.length} Inventar-Artikel...`,
              })));

              results.inventory = await importInventoryChunked(supabase, items, (current, total) => {
                const startProgress = baseProgress + 5;
                const itemProgress = (current / total) * (detection.counts.inventory / totalItems) * 70;
                controller.enqueue(encoder.encode(createSSEMessage({
                  phase: 'importing',
                  progress: Math.round(startProgress + itemProgress),
                  current,
                  total,
                  message: `Inventar: ${current}/${total}`,
                })));
              });
              processedItems += detection.counts.inventory;
            }

            // Process returns
            if (detection.counts.returns > 0) {
              const baseProgress = 20 + (processedItems / totalItems) * 70;
              
              controller.enqueue(encoder.encode(createSSEMessage({
                phase: 'parsing',
                progress: Math.round(baseProgress),
                current: 0,
                total: detection.counts.returns,
                message: 'Parse Retouren...',
              })));

              const returnData = parseReturnsXML(body);
              
              controller.enqueue(encoder.encode(createSSEMessage({
                phase: 'importing',
                progress: Math.round(baseProgress + 5),
                current: 0,
                total: returnData.length,
                message: `Importiere ${returnData.length} Retouren...`,
              })));

              results.returns = await importReturnsChunked(supabase, returnData, (current, total) => {
                const startProgress = baseProgress + 5;
                const itemProgress = (current / total) * (detection.counts.returns / totalItems) * 70;
                controller.enqueue(encoder.encode(createSSEMessage({
                  phase: 'importing',
                  progress: Math.round(startProgress + itemProgress),
                  current,
                  total,
                  message: `Retouren: ${current}/${total}`,
                })));
              });
              processedItems += detection.counts.returns;
            }

            // Build summary
            const summaryParts: string[] = [];
            if (results.orders.imported + results.orders.updated > 0) {
              summaryParts.push(`Aufträge: ${results.orders.imported} neu, ${results.orders.updated} aktualisiert`);
            }
            if (results.inventory.imported + results.inventory.updated > 0) {
              summaryParts.push(`Inventar: ${results.inventory.imported} neu, ${results.inventory.updated} aktualisiert`);
            }
            if (results.returns.imported + results.returns.updated > 0) {
              summaryParts.push(`Retouren: ${results.returns.imported} neu, ${results.returns.updated} aktualisiert`);
            }

            const totalErrors = results.orders.errors.length + results.inventory.errors.length + results.returns.errors.length;
            if (totalErrors > 0) {
              summaryParts.push(`${totalErrors} Fehler`);
            }

            // Send final result
            controller.enqueue(encoder.encode(createSSEMessage({
              phase: 'complete',
              progress: 100,
              current: totalItems,
              total: totalItems,
              message: summaryParts.join('. ') || 'Keine Daten importiert',
            })));

            // Send final data
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              success: true,
              message: summaryParts.join('. ') || 'Keine Daten importiert',
              detectedType: detection.dataType,
              counts: detection.counts,
              results,
              complete: true,
            })}\n\n`));

            controller.close();
          } catch (error) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Import error',
              complete: true,
            })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Standard non-streaming response for smaller files
    const results: ImportResults = {
      dataType: detection.dataType,
      orders: { imported: 0, updated: 0, errors: [] },
      inventory: { imported: 0, updated: 0, lowStockAlerts: 0, errors: [] },
      returns: { imported: 0, updated: 0, errors: [] },
    };

    // Process based on detected type
    // Note: Returns are extracted from OrderState data, so we parse them when orders are present
    if (detection.counts.orders > 0) {
      const orders = isJson ? parseOrdersFromJson(jsonData) : parseOrdersXML(body);
      logger.info('Parsed orders', { count: orders.length });
      results.orders = await importOrdersChunked(supabase, orders);
      
      // Also extract returns from the same OrderState data
      // Check if there are return indicators in the XML
      if (body.includes('Return_Tracking_Code_last') || 
          body.includes('QTY_Returned') || 
          body.includes('ReturnOrder_Date') ||
          detection.counts.returns > 0) {
        const returnData = parseReturnsXML(body);
        if (returnData.length > 0) {
          logger.info('Parsed returns from OrderState', { count: returnData.length });
          results.returns = await importReturnsChunked(supabase, returnData);
        }
      }
    }

    if (detection.counts.inventory > 0) {
      const items = parseInventoryXML(body);
      logger.info('Parsed inventory items', { count: items.length });
      results.inventory = await importInventoryChunked(supabase, items);
    }

    // Process returns separately if not already processed with orders
    if (detection.counts.returns > 0 && results.returns.imported === 0 && results.returns.updated === 0) {
      const returnData = parseReturnsXML(body);
      logger.info('Parsed returns', { count: returnData.length });
      results.returns = await importReturnsChunked(supabase, returnData);
    }

    // Build summary message
    const summaryParts: string[] = [];
    if (results.orders.imported + results.orders.updated > 0) {
      summaryParts.push(`Aufträge: ${results.orders.imported} neu, ${results.orders.updated} aktualisiert`);
    }
    if (results.inventory.imported + results.inventory.updated > 0) {
      summaryParts.push(`Inventar: ${results.inventory.imported} neu, ${results.inventory.updated} aktualisiert`);
      if (results.inventory.lowStockAlerts > 0) {
        summaryParts.push(`${results.inventory.lowStockAlerts} Low-Stock Warnungen`);
      }
    }
    if (results.returns.imported + results.returns.updated > 0) {
      summaryParts.push(`Retouren: ${results.returns.imported} neu, ${results.returns.updated} aktualisiert`);
    }

    const totalErrors = results.orders.errors.length + results.inventory.errors.length + results.returns.errors.length;
    if (totalErrors > 0) {
      summaryParts.push(`${totalErrors} Fehler`);
    }

    logger.info('Universal import completed', { results });

    return new Response(
      JSON.stringify({
        success: true,
        message: summaryParts.join('. ') || 'Keine Daten importiert',
        detectedType: detection.dataType,
        counts: detection.counts,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Universal import failed', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        detectedType: 'unknown',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
