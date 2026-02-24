import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('ms-order-state-query');

// Timeout for API requests (30 seconds - MS Direct can be slow)
const API_TIMEOUT_MS = 30000;

// Max retries for API requests
const MAX_RETRIES = 2;

// New msDynamicLov API configuration
const MS_DYNAMIC_LOV_URL = 'http://soap.ms-direct.ch/services/MS_DynamicLov/msDynamicLov';
const MS_DYNAMIC_LOV_AUTH = {
  username: 'mp@msoPRD',
  password: 'owWehEaIng3bR4UjdMSa',
};

interface MSOrderStateRequest {
  orderNo: string;
  companyId: string;
}

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

// Parse SOAP XML response from MS Direct OrderState API
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
    
    // Parse order fields
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

// Query MS Direct OrderState API via new msDynamicLov endpoint
async function queryOrderState(
  orderNo: string,
  clientId: string,
  clientName: string,
  token: string
): Promise<MSOrderStateResponse | null> {
  const soapRequest = buildSOAPRequest(clientId, clientName, token, orderNo);
  
  // Create Basic Auth header
  const basicAuth = btoa(`${MS_DYNAMIC_LOV_AUTH.username}:${MS_DYNAMIC_LOV_AUTH.password}`);
  
  // Retry logic
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info(`Querying msDynamicLov for order ${orderNo} (attempt ${attempt}/${MAX_RETRIES}, clientId: ${clientId})`);
      
      const response = await fetchWithTimeout(MS_DYNAMIC_LOV_URL, {
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
        logger.error(`HTTP ${response.status} for order ${orderNo}`, new Error(errorText.substring(0, 500)));
        
        // Retry on server errors
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          logger.info(`Retrying after server error...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          continue;
        }
        return null;
      }
      
      const xmlResponse = await response.text();
      logger.info(`Received response for order ${orderNo}, length: ${xmlResponse.length}`);
      
      const parsed = parseSOAPResponse(xmlResponse);
      
      if (parsed) {
        logger.info(`Successfully parsed order ${orderNo} state`);
        return parsed;
      }
      
      logger.warn(`Failed to parse response for order ${orderNo}`);
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      if (errorMessage.includes('aborted') || errorMessage.includes('abort')) {
        logger.error(`Timeout after ${API_TIMEOUT_MS}ms for order ${orderNo} (attempt ${attempt}/${MAX_RETRIES})`, new Error('Timeout'));
      } else {
        logger.error(`Error querying order ${orderNo} (attempt ${attempt}/${MAX_RETRIES})`, new Error(errorMessage));
      }
      
      // Retry on timeout or network errors
      if (attempt < MAX_RETRIES) {
        logger.info(`Retrying after error...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        continue;
      }
      
      return null;
    }
  }
  
  return null;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 100, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', { clientId });
    return rateLimitResponse(corsHeaders, rateLimit.resetIn);
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify user and get company info
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const { orderNo, companyId }: MSOrderStateRequest = await req.json();
    
    if (!orderNo || !companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing orderNo or companyId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get company MS Direct configuration
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, ms_client_id, ms_client_token')
      .eq('id', companyId)
      .single();
    
    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!company.ms_client_id || !company.ms_client_token) {
      return new Response(
        JSON.stringify({ error: 'MS Direct configuration not found for company' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Query MS Direct API
    const orderState = await queryOrderState(
      orderNo,
      company.ms_client_id,
      company.name,
      company.ms_client_token
    );
    
    if (!orderState) {
      return new Response(
        JSON.stringify({ error: 'Failed to query MS Direct API (timeout or connection error)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check for API errors
    if (orderState.error) {
      return new Response(
        JSON.stringify({ 
          error: 'MS Direct API error',
          errorCode: orderState.error.errorCode,
          errorMessage: orderState.error.errorMessage,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Find order in database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, source_no, company_id')
      .eq('source_no', orderNo)
      .eq('company_id', companyId)
      .single();
    
    if (orderError || !order) {
      // Order not found, but return the state anyway
      return new Response(
        JSON.stringify({ 
          success: true,
          orderState,
          message: 'Order not found in database, but state retrieved',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Update order in database
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
    
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id);
    
    if (updateError) {
      logger.error('Error updating order', new Error(updateError.message));
      return new Response(
        JSON.stringify({ error: 'Failed to update order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        orderState,
        updated: true,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('Unexpected error', new Error(errorMessage));
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});