import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('bc-order-import');

interface BCOrderLine {
  No: string;
  Description: string;
  Quantity: number;
  UnitPrice: number;
}

interface BCOrder {
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
  Lines: BCOrderLine[];
}

// Parse BC SOAP XML format (WSIFOrdRespEshop)
function parseSOAPOrdersXML(xmlString: string): BCOrder[] {
  const orders: BCOrder[] = [];
  
  const orderRegex = /<WSIFOrdRespEshop>([\s\S]*?)<\/WSIFOrdRespEshop>/gi;
  let orderMatch;
  
  while ((orderMatch = orderRegex.exec(xmlString)) !== null) {
    const orderContent = orderMatch[1];
    
    const getValue = (tag: string): string | undefined => {
      const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const match = orderContent.match(regex);
      return match ? match[1].trim() : undefined;
    };
    
    const order: BCOrder = {
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
        });
      }
    }
    
    if (order.SourceNo) {
      orders.push(order);
    }
  }
  
  return orders;
}

// Map BC status to our status enum
function mapStatus(bcStatus?: string): 'received' | 'putaway' | 'picking' | 'packing' | 'ready_to_ship' | 'shipped' | 'delivered' {
  if (!bcStatus) return 'received';
  
  const statusLower = bcStatus.toLowerCase();
  if (statusLower.includes('shipped') || statusLower.includes('delivered')) return 'shipped';
  if (statusLower.includes('ready')) return 'ready_to_ship';
  if (statusLower.includes('pack')) return 'packing';
  if (statusLower.includes('pick')) return 'picking';
  return 'received';
}

// Validate API key
async function validateApiKey(supabase: any, apiKey: string): Promise<{ valid: boolean; companyId?: string }> {
  if (!apiKey || !apiKey.startsWith('msd_')) {
    return { valid: false };
  }
  
  const keyPrefix = apiKey.substring(0, 12);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const { data: apiKeyData, error } = await supabase
    .from('api_keys')
    .select('company_id, is_active, expires_at')
    .eq('key_prefix', keyPrefix)
    .eq('key_hash', keyHash)
    .maybeSingle();
  
  if (error || !apiKeyData) {
    logger.warn('API key validation failed', { keyPrefix });
    return { valid: false };
  }
  
  if (!apiKeyData.is_active) {
    return { valid: false };
  }
  
  if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
    return { valid: false };
  }
  
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_prefix', keyPrefix)
    .eq('key_hash', keyHash);
  
  return { valid: true, companyId: apiKeyData.company_id };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 10, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', { clientId });
    return rateLimitResponse(corsHeaders, rateLimit.resetIn);
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      logger.warn('Missing API key');
      return new Response(
        JSON.stringify({ error: 'Missing API key', code: 'MISSING_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { valid, companyId } = await validateApiKey(supabase, apiKey);
    
    if (!valid) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired API key', code: 'INVALID_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { data: integration } = await supabase
      .from('integrations')
      .select('is_active')
      .eq('company_id', companyId)
      .eq('type', 'business_central')
      .maybeSingle();
    
    if (!integration?.is_active) {
      logger.warn('BC integration not active', { companyId });
      return new Response(
        JSON.stringify({ error: 'Business Central integration not active', code: 'INTEGRATION_INACTIVE' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const xmlBody = await req.text();
    logger.info('Received order import', { bodyLength: xmlBody.length, companyId });
    
    if (!xmlBody || xmlBody.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Empty request body', code: 'EMPTY_BODY' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const orders = parseSOAPOrdersXML(xmlBody);
    logger.info('Parsed orders', { orderCount: orders.length });
    
    if (orders.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid orders found in XML', code: 'NO_ORDERS' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const results = {
      imported: 0,
      updated: 0,
      errors: [] as { orderNo: string; error: string }[],
    };
    
    for (const order of orders) {
      try {
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('source_no', order.SourceNo)
          .eq('company_id', companyId)
          .maybeSingle();
        
        const parseDate = (dateStr?: string): string | null => {
          if (!dateStr || dateStr.startsWith('0001')) return null;
          return dateStr;
        };
        
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
          status: mapStatus(order.ShipmentStatus),
          source_system: 'business_central', // BC is always master
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
        
        if (order.Lines && order.Lines.length > 0) {
          if (existingOrder) {
            await supabase
              .from('order_lines')
              .delete()
              .eq('order_id', orderId);
          }
          
          const orderLines = order.Lines.map(line => ({
            order_id: orderId,
            sku: line.No,
            name: line.Description,
            quantity: line.Quantity,
            price: line.UnitPrice,
          }));
          
          const { error: linesError } = await supabase
            .from('order_lines')
            .insert(orderLines);
          
          if (linesError) {
            logger.warn('Error inserting order lines', { orderId, error: linesError.message });
          }
        }
        
      } catch (err) {
        logger.error('Error processing order', err instanceof Error ? err : new Error(String(err)), { orderNo: order.SourceNo });
        results.errors.push({
          orderNo: order.SourceNo,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
    
    // Update last sync status
    await supabase
      .from('integrations')
      .update({ 
        last_sync_at: new Date().toISOString(),
        last_sync_status: results.errors.length > 0 ? 'partial' : 'success'
      })
      .eq('company_id', companyId)
      .eq('type', 'business_central');
    
    logger.info('Import completed', { results });
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Imported ${results.imported} new orders, updated ${results.updated} existing orders`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    logger.error('Import failed', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
