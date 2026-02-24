import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Logger } from '../_shared/security.ts';

const logger = new Logger('ms-order-state-sync');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeout for API requests (10 seconds)
const API_TIMEOUT_MS = 10000;

// Batch size for orders per sync
const BATCH_SIZE = 10;

// Only sync orders not synced in the last 15 minutes
const MIN_SYNC_INTERVAL_MS = 15 * 60 * 1000;

// MS Direct API configuration - try HTTPS first, fallback to HTTP
const MS_DYNAMIC_LOV_URLS = [
  'https://soap.ms-direct.ch/services/MS_DynamicLov/msDynamicLov',
  'http://soap.ms-direct.ch/services/MS_DynamicLov/msDynamicLov',
];
const MS_DYNAMIC_LOV_AUTH = {
  username: 'mp@msoPRD',
  password: 'owWehEaIng3bR4UjdMSa',
};

interface MSOrderStateResponse {
  orderState?: number;
  trackAndTraceId?: string;
  trackAndTraceUrl?: string;
  trackAndTraceIdReturn?: string;
  trackAndTraceUrlReturn?: string;
  shippingAgent?: string;
  invoiceNo?: string;
  invoiceAmount?: number;
  paymentState?: boolean;
  postingDate?: string;
  lastModified?: string;
  error?: {
    errorCode?: string;
    errorMessage?: string;
  };
}

// Parse SOAP XML response (same as query function)
function parseSOAPResponse(xmlString: string): MSOrderStateResponse | null {
  try {
    const response: MSOrderStateResponse = {};
    
    // Extract orderStateData (try with namespace first, then without)
    let orderStateDataMatch = xmlString.match(/<tns:orderStateData>([\s\S]*?)<\/tns:orderStateData>/i);
    if (!orderStateDataMatch) {
      // Fallback: try without namespace
      orderStateDataMatch = xmlString.match(/<orderStateData>([\s\S]*?)<\/orderStateData>/i);
    }
    
    if (!orderStateDataMatch) {
      // Check for error (try both with and without namespace)
      let errorMatch = xmlString.match(/<tns:error>([\s\S]*?)<\/tns:error>/i);
      if (!errorMatch) {
        errorMatch = xmlString.match(/<error>([\s\S]*?)<\/error>/i);
      }
      if (errorMatch) {
        const errorContent = errorMatch[1];
        const getValue = (tag: string): string | undefined => {
          // Try with namespace first, then without
          let regex = new RegExp(`<tns:${tag}>([\\s\\S]*?)<\\/tns:${tag}>`, 'i');
          let match = errorContent.match(regex);
          if (match) return match[1].trim();
          regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
          match = errorContent.match(regex);
          return match ? match[1].trim() : undefined;
        };
        response.error = {
          errorCode: getValue('errorCode'),
          errorMessage: getValue('errorMessage'),
        };
        return response;
      }
      return null;
    }
    
    const orderContent = orderStateDataMatch[1];
    
    const getValue = (tag: string): string | undefined => {
      // Try with namespace first (standard SOAP format), then without (fallback)
      let regex = new RegExp(`<tns:${tag}>([\\s\\S]*?)<\\/tns:${tag}>`, 'i');
      let match = orderContent.match(regex);
      if (match) return match[1].trim();
      // Fallback: try without namespace
      regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
      match = orderContent.match(regex);
      return match ? match[1].trim() : undefined;
    };
    
    const orderState = getValue('orderState');
    if (orderState) {
      response.orderState = parseInt(orderState, 10);
    }
    
    response.trackAndTraceId = getValue('trackAndTraceId');
    response.trackAndTraceUrl = getValue('trackAndTraceUrl');
    response.trackAndTraceIdReturn = getValue('trackAndTraceIdReturn');
    response.trackAndTraceUrlReturn = getValue('trackAndTraceUrlReturn');
    response.shippingAgent = getValue('shippingAgent');
    response.invoiceNo = getValue('invoiceNo');
    
    const invoiceAmount = getValue('invoiceAmount');
    if (invoiceAmount) {
      response.invoiceAmount = parseFloat(invoiceAmount);
    }
    
    const paymentState = getValue('paymentState');
    if (paymentState) {
      response.paymentState = paymentState.toLowerCase() === 'true';
    }
    
    response.postingDate = getValue('postingDate');
    response.lastModified = getValue('lastModified');
    
    return response;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('Error parsing SOAP response', new Error(errorMessage));
    return null;
  }
}

// Build SOAP request XML
function buildSOAPRequest(clientId: string, clientName: string, token: string, orderNo: string, requestDate?: string): string {
  const date = requestDate || new Date().toISOString().split('T')[0];
  
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <tns:orderState xmlns:tns="http://ms-direct.ch/soap/msSoapDataHandling">
      <tns:orderStateRequest>
        <tns:messageHeader>
          <tns:clientId>${clientId}</tns:clientId>
          <tns:clientName>${clientName}</tns:clientName>
          <tns:token>${token}</tns:token>
        </tns:messageHeader>
        <tns:request>
          <tns:orderNo>${orderNo}</tns:orderNo>
          <tns:requestDate>${date}</tns:requestDate>
        </tns:request>
      </tns:orderStateRequest>
    </tns:orderState>
  </soap:Body>
</soap:Envelope>`;
}

// Fetch with timeout using AbortController
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Query MS Direct OrderState API with HTTPS/HTTP fallback
async function queryOrderState(
  orderNo: string,
  clientId: string,
  clientName: string,
  token: string
): Promise<MSOrderStateResponse | null> {
  const soapRequest = buildSOAPRequest(clientId, clientName, token, orderNo);
  
  // Create Basic Auth header
  const basicAuth = btoa(`${MS_DYNAMIC_LOV_AUTH.username}:${MS_DYNAMIC_LOV_AUTH.password}`);
  
  let lastError = '';
  
  // Try each URL (HTTPS first, then HTTP)
  for (const url of MS_DYNAMIC_LOV_URLS) {
    try {
      logger.info(`Querying ${url.startsWith('https') ? 'HTTPS' : 'HTTP'} for order ${orderNo} (clientId: ${clientId})`);
      
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'document/http://localhost:6060/:orderState',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: soapRequest,
      }, API_TIMEOUT_MS);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(`HTTP ${response.status} for order ${orderNo} on ${url.startsWith('https') ? 'HTTPS' : 'HTTP'}`);
        lastError = errorText.substring(0, 200);
        continue; // Try next URL
      }
      
      const xmlResponse = await response.text();
      const parsed = parseSOAPResponse(xmlResponse);
      
      if (parsed) {
        logger.info(`Successfully parsed order ${orderNo} state`);
        return parsed;
      }
      
      logger.warn(`Failed to parse response for order ${orderNo}`);
      lastError = 'Failed to parse response';
      continue; // Try next URL
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      if (errorMessage.includes('aborted') || errorMessage.includes('abort')) {
        logger.warn(`Timeout for ${url.startsWith('https') ? 'HTTPS' : 'HTTP'} order ${orderNo}, trying next...`);
        lastError = `Timeout after ${API_TIMEOUT_MS}ms`;
      } else {
        logger.warn(`Connection error for order ${orderNo}: ${errorMessage}, trying next...`);
        lastError = errorMessage;
      }
      continue; // Try next URL
    }
  }
  
  // All URLs failed
  logger.error(`All API endpoints failed for order ${orderNo}: ${lastError}`);
  return null;
}

interface SyncResult {
  success: boolean;
  updated: boolean;
  error?: string;
}

// Sync order state for a single order
// deno-lint-ignore no-explicit-any
async function syncOrderState(
  order: { id: string; source_no: string; company_id: string },
  company: { ms_client_id: string; name: string; ms_client_token: string },
  // deno-lint-ignore no-explicit-any
  supabase: any
): Promise<SyncResult> {
  try {
    const orderState = await queryOrderState(
      order.source_no,
      company.ms_client_id,
      company.name,
      company.ms_client_token
    );
    
    if (!orderState) {
      return { success: false, updated: false, error: 'Failed to query API (timeout or connection error)' };
    }
    
    if (orderState.error) {
      logger.warn('MS Direct API error', { 
        orderNo: order.source_no,
        errorCode: orderState.error.errorCode,
        errorMessage: orderState.error.errorMessage,
      });
      return { success: false, updated: false, error: orderState.error.errorMessage };
    }
    
    // Build update data - only use existing columns in orders table
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (orderState.trackAndTraceId) {
      updateData.tracking_code = orderState.trackAndTraceId;
    }
    
    if (orderState.trackAndTraceUrl) {
      updateData.tracking_link = orderState.trackAndTraceUrl;
    }
    
    if (orderState.shippingAgent) {
      updateData.shipping_agent_code = orderState.shippingAgent;
    }
    
    // Only update if there are changes beyond updated_at
    const hasChanges = Object.keys(updateData).length > 1;
    
    if (hasChanges) {
      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id);
      
      if (updateError) {
        logger.error('Error updating order', new Error(`${updateError.message} for order ${order.id}`));
        return { success: false, updated: false, error: updateError.message };
      }
      
      return { success: true, updated: true };
    }
    
    return { success: true, updated: false };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('Error syncing order state', new Error(`${errorMessage} for order ${order.id}`));
    return { success: false, updated: false, error: errorMessage };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all companies with MS Direct configuration
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, ms_client_id, ms_client_token')
      .not('ms_client_id', 'is', null)
      .not('ms_client_token', 'is', null);
    
    if (companiesError) {
      logger.error('Error fetching companies', new Error(companiesError.message));
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch companies' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!companies || companies.length === 0) {
      logger.info('No companies with MS Direct configuration found');
      return new Response(
        JSON.stringify({ success: true, message: 'No companies to sync', totalOrders: 0, updatedOrders: 0, errors: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get active orders (not delivered) that haven't been synced recently
    const companyIds = companies.map(c => c.id);
    const cutoffTime = new Date(Date.now() - MIN_SYNC_INTERVAL_MS).toISOString();
    
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, source_no, company_id, updated_at')
      .in('company_id', companyIds)
      .neq('status', 'delivered')
      .or(`updated_at.lt.${cutoffTime},updated_at.is.null`)
      .order('created_at', { ascending: false })
      .limit(BATCH_SIZE);
    
    if (ordersError) {
      logger.error('Error fetching orders', new Error(ordersError.message));
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch orders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!orders || orders.length === 0) {
      logger.info('No orders to sync (all recently synced or none available)');
      return new Response(
        JSON.stringify({ success: true, message: 'No orders to sync', totalOrders: 0, updatedOrders: 0, errors: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    logger.info(`Starting sync for ${orders.length} orders`);
    
    // Group orders by company
    const ordersByCompany = new Map<string, typeof orders>();
    for (const order of orders) {
      if (!ordersByCompany.has(order.company_id)) {
        ordersByCompany.set(order.company_id, []);
      }
      ordersByCompany.get(order.company_id)!.push(order);
    }
    
    // Sync orders for each company
    let totalSynced = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    
    for (const company of companies) {
      const companyOrders = ordersByCompany.get(company.id) || [];
      
      if (companyOrders.length === 0) continue;
      
      logger.info(`Syncing ${companyOrders.length} orders for company ${company.name}`);
      
      for (const order of companyOrders) {
        const result = await syncOrderState(
          order,
          company,
          supabase
        );
        
        if (result.success) {
          totalSynced++;
          if (result.updated) {
            totalUpdated++;
          }
        } else {
          totalErrors++;
          logger.warn('Failed to sync order', { 
            orderNo: order.source_no,
            error: result.error,
          });
        }
        
        // Small delay to avoid rate limiting (reduced from 50ms to 25ms)
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    }
    
    logger.info('Sync completed', { 
      totalSynced,
      totalUpdated,
      totalErrors,
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync completed',
        totalOrders: totalSynced,
        updatedOrders: totalUpdated,
        errors: totalErrors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('Unexpected error', new Error(errorMessage));
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});