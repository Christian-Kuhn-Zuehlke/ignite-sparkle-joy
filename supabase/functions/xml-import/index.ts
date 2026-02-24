import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';
import { mapStatus, companyIdMap, parseDate } from '../_shared/orderUtils.ts';

const logger = new Logger('xml-import');

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

// Parse BC SOAP XML format
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
    
    const xmlBody = await req.text();
    logger.info('Received XML import', { bodyLength: xmlBody.length });
    
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
        JSON.stringify({ error: 'No valid orders found in XML' }),
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
        const companyId = companyIdMap[order.CompanyId] || order.CompanyId;
        
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('source_no', order.SourceNo)
          .eq('company_id', companyId)
          .maybeSingle();
        
        const parseLocalDate = (dateStr?: string): string | null => {
          return parseDate(dateStr);
        };
        
        
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
          posted_shipment_date: parseLocalDate(order.PostedShipmentDate),
          posted_invoice_date: parseLocalDate(order.PostedInvoiceDate),
          status: mapStatus(order.ShipmentStatus),
          source_system: 'business_central', // BC is master
          updated_at: new Date().toISOString(),
        };
        
        // Add MS OrderState fields if available
        if (order.ReturnTrackingCode) {
          orderData.track_and_trace_id_return = order.ReturnTrackingCode;
        }
        if (order.ReturnTrackingLink) {
          orderData.track_and_trace_url_return = order.ReturnTrackingLink;
        }
        if (order.PostedInvoiceNo) {
          orderData.invoice_no = order.PostedInvoiceNo;
        }
        if (order.PostedInvoiceAmount !== undefined) {
          orderData.invoice_amount = order.PostedInvoiceAmount;
        }
        
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
        logger.error('Error processing order', err instanceof Error ? err : new Error(String(err)), { orderNo: order.SourceNo });
        results.errors.push({
          orderNo: order.SourceNo,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
    
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
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
