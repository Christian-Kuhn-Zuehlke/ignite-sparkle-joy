import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';
import { mapStatus, companyIdMap, parseDate } from '../_shared/orderUtils.ts';

const logger = new Logger('xml-import-bulk');

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
  ReturnTrackingCode?: string;
  ReturnTrackingLink?: string;
  OrderAmount?: number;
  PostedShipmentDate?: string;
  PostedInvoiceDate?: string;
  PostedInvoiceNo?: string;
  PostedInvoiceAmount?: number;
  ShipmentStatus?: string;
  Lines: { No: string; Description: string; Quantity: number; UnitPrice: number }[];
}

// Parse BC SOAP XML format - optimized for large files
function parseSOAPOrdersXML(xmlString: string): BCOrder[] {
  const orders: BCOrder[] = [];
  
  const orderBlocks = xmlString.split('<WSIFOrdRespEshop>').slice(1);
  
  for (const block of orderBlocks) {
    const orderContent = block.split('</WSIFOrdRespEshop>')[0];
    if (!orderContent) continue;
    
    const getValue = (tag: string): string | undefined => {
      const startTag = `<${tag}>`;
      const endTag = `</${tag}>`;
      const startIdx = orderContent.indexOf(startTag);
      if (startIdx === -1) return undefined;
      const valueStart = startIdx + startTag.length;
      const endIdx = orderContent.indexOf(endTag, valueStart);
      if (endIdx === -1) return undefined;
      return orderContent.substring(valueStart, endIdx).trim();
    };
    
    const sourceNo = getValue('Source_No');
    if (!sourceNo) continue;
    
    const order: BCOrder = {
      SourceNo: sourceNo,
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
      ReturnTrackingCode: getValue('Return_Tracking_Code_last'),
      ReturnTrackingLink: getValue('Return_Tracking_Link_last'),
      OrderAmount: getValue('OrderAmount_Info') ? parseFloat(getValue('OrderAmount_Info')!) : undefined,
      PostedShipmentDate: getValue('Posted_Shipmnt_Date'),
      PostedInvoiceDate: getValue('Posted_Invoice_Date'),
      PostedInvoiceNo: getValue('Posted_Invoice_Last_No'),
      PostedInvoiceAmount: getValue('Posted_Invoice_Amt_Total') ? parseFloat(getValue('Posted_Invoice_Amt_Total')!) : undefined,
      ShipmentStatus: getValue('Shipment_Status'),
      Lines: [],
    };
    
    // Parse order lines
    const linesStart = orderContent.indexOf('<IF_OrdResp_NavOrd_Lines_Sub>');
    if (linesStart !== -1) {
      const linesContent = orderContent.substring(linesStart);
      const lineBlocks = linesContent.split('<IF_OrdResp_NavOrd_Lines_Sub>').slice(2);
      
      for (const lineBlock of lineBlocks) {
        const lineContent = lineBlock.split('</IF_OrdResp_NavOrd_Lines_Sub>')[0];
        
        const getLineValue = (tag: string): string | undefined => {
          const startTag = `<${tag}>`;
          const endTag = `</${tag}>`;
          const startIdx = lineContent.indexOf(startTag);
          if (startIdx === -1) return undefined;
          const valueStart = startIdx + startTag.length;
          const endIdx = lineContent.indexOf(endTag, valueStart);
          if (endIdx === -1) return undefined;
          return lineContent.substring(valueStart, endIdx).trim();
        };
        
        const lineNo = getLineValue('No');
        const docType = getLineValue('Document_Type_NAV');
        
        if (lineNo && (!docType || docType === 'Order')) {
          const qty = parseInt(getLineValue('Qty') || '1', 10);
          if (qty > 0) {
            order.Lines.push({
              No: lineNo,
              Description: getLineValue('Description') || '',
              Quantity: qty,
              UnitPrice: parseFloat(getLineValue('Unit_Price') || '0'),
            });
          }
        }
      }
    }
    
    orders.push(order);
  }
  
  return orders;
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
    
    const xmlBody = await req.text();
    logger.info('Received bulk XML import', { bodyLength: xmlBody.length });
    
    if (!xmlBody || xmlBody.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Empty request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const orders = parseSOAPOrdersXML(xmlBody);
    logger.info('Parsed orders', { orderCount: orders.length });
    
    if (orders.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid orders found in XML', bodyLength: xmlBody.length }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const results = {
      imported: 0,
      updated: 0,
      linesInserted: 0,
      errors: [] as { orderNo: string; error: string }[],
    };
    
    const batchSize = 50;
    for (let i = 0; i < orders.length; i += batchSize) {
      const batch = orders.slice(i, i + batchSize);
      
      for (const order of batch) {
        try {
          const companyId = companyIdMap[order.CompanyId] || order.CompanyId;
          
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('source_no', order.SourceNo)
            .eq('company_id', companyId)
            .maybeSingle();
          
          
          
          const orderData: Record<string, any> = {
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
            updated_at: new Date().toISOString(),
          };
          
          // Note: Extra MS OrderState fields (track_and_trace_id_return, invoice_no, etc.)
          // are not stored as they don't exist in the orders table schema
          
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
              await supabase.from('order_lines').delete().eq('order_id', orderId);
            }
            
            const orderLines = order.Lines.map(line => ({
              order_id: orderId,
              sku: line.No,
              name: line.Description,
              quantity: line.Quantity,
              price: line.UnitPrice,
            }));
            
            const { error: linesError } = await supabase.from('order_lines').insert(orderLines);
            if (!linesError) {
              results.linesInserted += orderLines.length;
            }
          }
          
        } catch (err) {
          const errorMessage = err && typeof err === 'object' && 'message' in err 
            ? (err as { message: string }).message 
            : typeof err === 'object' 
              ? JSON.stringify(err) 
              : String(err);
          logger.error('Error processing order', new Error(errorMessage), { orderNo: order.SourceNo, errorDetails: err });
          results.errors.push({
            orderNo: order.SourceNo,
            error: errorMessage,
          });
        }
      }
    }
    
    logger.info('Bulk import completed', { results });
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Imported ${results.imported} new orders, updated ${results.updated} existing orders, ${results.linesInserted} lines`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    logger.error('Bulk import failed', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
