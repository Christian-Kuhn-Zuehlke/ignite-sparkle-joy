import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('ms-product-stock');

// Timeout for API requests (15 seconds - stock queries can be larger)
const API_TIMEOUT_MS = 15000;

// msDynamicLov API configuration - try HTTPS first, fallback to HTTP
const MS_DYNAMIC_LOV_URLS = [
  'https://soap.ms-direct.ch/services/MS_DynamicLov/msDynamicLov',
  'http://soap.ms-direct.ch/services/MS_DynamicLov/msDynamicLov',
];
const MS_DYNAMIC_LOV_AUTH = {
  username: 'mp@msoPRD',
  password: 'owWehEaIng3bR4UjdMSa',
};

interface ProductStockItem {
  sku: string;
  productName?: string;
  onHand: number;
  reserved: number;
  available: number;
  blocked?: number;
  statusDate?: string;
  ean?: string;
  expectedReceiptDate?: string;
  qtyOnPurchOrder?: number;
}

interface ProductStockResponse {
  items: ProductStockItem[];
  error?: {
    errorCode?: string;
    errorMessage?: string;
  };
}

// Build SOAP request XML for productStock
function buildProductStockSOAPRequest(clientId: string, clientName: string, token: string, sku?: string): string {
  // If no SKU provided, request all products
  const skuFilter = sku ? `<tns:sku>${sku}</tns:sku>` : '';
  
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <tns:productStock xmlns:tns="http://ms-direct.ch/soap/msSoapDataHandling">
      <tns:productStockRequest>
        <tns:messageHeader>
          <tns:clientId>${clientId}</tns:clientId>
          <tns:clientName>${clientName}</tns:clientName>
          <tns:token>${token}</tns:token>
        </tns:messageHeader>
        <tns:request>
          ${skuFilter}
        </tns:request>
      </tns:productStockRequest>
    </tns:productStock>
  </soap:Body>
</soap:Envelope>`;
}

// Parse SOAP XML response from MS Direct productStock API
function parseProductStockResponse(xmlString: string): ProductStockResponse {
  const response: ProductStockResponse = { items: [] };
  
  try {
    // Check for error first (try both with and without namespace)
    const errorMatch = xmlString.match(/<(?:tns:)?error>([\s\S]*?)<\/(?:tns:)?error>/i);
    if (errorMatch) {
      const errorContent = errorMatch[1];
      const getValue = (tag: string): string | undefined => {
        const regex = new RegExp(`<(?:tns:)?${tag}>([\\s\\S]*?)<\\/(?:tns:)?${tag}>`, 'i');
        const match = errorContent.match(regex);
        return match ? match[1].trim() : undefined;
      };
      response.error = {
        errorCode: getValue('errorCode'),
        errorMessage: getValue('errorMessage'),
      };
      return response;
    }
    
    // Extract productStockItems container (actual structure from API)
    const productStockItemsMatch = xmlString.match(/<productStockItems>([\s\S]*?)<\/productStockItems>/i);
    if (!productStockItemsMatch) {
      // Fallback: try old structure with namespace
      const productMatches = xmlString.matchAll(/<tns:productStockData>([\s\S]*?)<\/tns:productStockData>/gi);
      for (const match of productMatches) {
        const productContent = match[1];
        const getValue = (tag: string): string | undefined => {
          const regex = new RegExp(`<tns:${tag}>([\\s\\S]*?)<\\/tns:${tag}>`, 'i');
          const m = productContent.match(regex);
          return m ? m[1].trim() : undefined;
        };
        const sku = getValue('sku') || getValue('productNo') || getValue('itemNo');
        if (!sku) continue;
        const onHand = parseInt(getValue('onHand') || getValue('quantityOnHand') || '0', 10);
        const reserved = parseInt(getValue('reserved') || getValue('quantityReserved') || '0', 10);
        response.items.push({
          sku,
          productName: getValue('productName') || getValue('description'),
          onHand: isNaN(onHand) ? 0 : onHand,
          reserved: isNaN(reserved) ? 0 : reserved,
          available: onHand - reserved,
        });
      }
      return response;
    }
    
    // Extract all productStockItem elements (actual structure)
    const itemsContent = productStockItemsMatch[1];
    const productMatches = itemsContent.matchAll(/<productStockItem>([\s\S]*?)<\/productStockItem>/gi);
    
    for (const match of productMatches) {
      const productContent = match[1];
      
      const getValue = (tag: string): string | undefined => {
        // Try without namespace first (actual structure), then with namespace
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const m = productContent.match(regex);
        if (m) return m[1].trim();
        // Fallback: try with namespace
        const regexNS = new RegExp(`<tns:${tag}>([\\s\\S]*?)<\\/tns:${tag}>`, 'i');
        const mNS = productContent.match(regexNS);
        return mNS ? mNS[1].trim() : undefined;
      };
      
      // Extract itemNo (SKU)
      const itemNo = getValue('itemNo');
      if (!itemNo) continue;
      
      // Extract quantities
      const calculatetQuantity = parseFloat(getValue('calculatetQuantity') || '0');
      const qtyOnLocalStock = parseFloat(getValue('qtyOnLocalStock') || '0');
      const qtyOnSalesOrder = parseFloat(getValue('qtyOnSalesOrder') || '0');
      const qtyOnPurchOrder = parseFloat(getValue('qtyOnPurchOrder') || '0');
      const blocked = parseInt(getValue('blocked') || '0', 10);
      
      // Calculate available: local stock - sales orders - blocked
      const onHand = Math.max(0, qtyOnLocalStock);
      const reserved = Math.max(0, qtyOnSalesOrder);
      const available = Math.max(0, onHand - reserved - blocked);
      
      const statusDatum = getValue('statusDatum');
      const ean = getValue('ean');
      const expectedReceiptDate = getValue('expectedReceiptDate');
      
      response.items.push({
        sku: itemNo,
        productName: getValue('description') || getValue('itemDescription') || itemNo,
        onHand: isNaN(onHand) ? 0 : Math.floor(onHand),
        reserved: isNaN(reserved) ? 0 : Math.floor(reserved),
        available: isNaN(available) ? 0 : Math.floor(available),
        blocked: blocked || 0,
        statusDate: statusDatum || undefined,
        ean: ean && ean !== 'N/A' ? ean : undefined,
        expectedReceiptDate: expectedReceiptDate || undefined,
        qtyOnPurchOrder: isNaN(qtyOnPurchOrder) ? 0 : Math.floor(qtyOnPurchOrder),
      });
    }
    
    return response;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('Error parsing SOAP response', new Error(errorMessage));
    return { items: [], error: { errorCode: 'PARSE_ERROR', errorMessage } };
  }
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

// Query MS Direct productStock API with HTTPS/HTTP fallback
async function queryProductStock(
  clientId: string,
  clientName: string,
  token: string,
  sku?: string
): Promise<ProductStockResponse> {
  const soapRequest = buildProductStockSOAPRequest(clientId, clientName, token, sku);
  
  // Create Basic Auth header
  const basicAuth = btoa(`${MS_DYNAMIC_LOV_AUTH.username}:${MS_DYNAMIC_LOV_AUTH.password}`);
  
  let lastError: string = '';
  
  // Try each URL (HTTPS first, then HTTP)
  for (const url of MS_DYNAMIC_LOV_URLS) {
    try {
      logger.info(`Querying productStock for client ${clientId}${sku ? `, SKU: ${sku}` : ' (all products)'} via ${url.startsWith('https') ? 'HTTPS' : 'HTTP'}`);
      
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'document/http://localhost:6060/:productStock',
          'Authorization': `Basic ${basicAuth}`,
        },
        body: soapRequest,
      }, API_TIMEOUT_MS);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`HTTP ${response.status} for productStock`, new Error(errorText.substring(0, 500)));
        lastError = errorText.substring(0, 200);
        continue; // Try next URL
      }
      
      const xmlResponse = await response.text();
      logger.info(`Received productStock response, length: ${xmlResponse.length}`);
      
      return parseProductStockResponse(xmlResponse);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      if (errorMessage.includes('aborted') || errorMessage.includes('abort')) {
        logger.warn(`Timeout for ${url}, trying next...`);
        lastError = `Timeout after ${API_TIMEOUT_MS}ms`;
        continue; // Try next URL
      }
      
      logger.warn(`Connection error for ${url}: ${errorMessage}, trying next...`);
      lastError = errorMessage;
      continue; // Try next URL
    }
  }
  
  // All URLs failed
  logger.error('All API endpoints failed', new Error(lastError));
  return { items: [], error: { errorCode: 'CONNECTION_FAILED', errorMessage: `MS Direct API nicht erreichbar: ${lastError}` } };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Rate limiting
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 30, windowMs: 60000 });
  
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
    const body = await req.json().catch(() => ({}));
    const { companyId, sku, syncToDatabase = true } = body;
    
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing companyId' }),
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
    const stockResponse = await queryProductStock(
      company.ms_client_id,
      company.name,
      company.ms_client_token,
      sku
    );
    
    // Check for API errors
    if (stockResponse.error) {
      return new Response(
        JSON.stringify({ 
          error: 'MS Direct API error',
          errorCode: stockResponse.error.errorCode,
          errorMessage: stockResponse.error.errorMessage,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let syncResult = { inserted: 0, updated: 0, failed: 0 };
    
    // Sync to database if requested
    if (syncToDatabase && stockResponse.items.length > 0) {
      logger.info(`Syncing ${stockResponse.items.length} stock items to database`);
      
      for (const item of stockResponse.items) {
        try {
          // Check if item exists
          const { data: existing } = await supabase
            .from('inventory')
            .select('id')
            .eq('company_id', companyId)
            .eq('sku', item.sku)
            .single();
          
          if (existing) {
            // Update existing
            const { error: updateError } = await supabase
              .from('inventory')
              .update({
                on_hand: item.onHand,
                reserved: item.reserved,
                available: item.available,
                name: item.productName || item.sku,
                source_system: 'ms_direct',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
            
            if (updateError) {
              logger.error(`Failed to update SKU ${item.sku}`, new Error(updateError.message));
              syncResult.failed++;
            } else {
              syncResult.updated++;
            }
          } else {
            // Insert new
            const { error: insertError } = await supabase
              .from('inventory')
              .insert({
                company_id: companyId,
                sku: item.sku,
                name: item.productName || item.sku,
                on_hand: item.onHand,
                reserved: item.reserved,
                available: item.available,
                source_system: 'ms_direct',
              });
            
            if (insertError) {
              logger.error(`Failed to insert SKU ${item.sku}`, new Error(insertError.message));
              syncResult.failed++;
            } else {
              syncResult.inserted++;
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          logger.error(`Error processing SKU ${item.sku}`, new Error(errorMessage));
          syncResult.failed++;
        }
      }
      
      logger.info(`Sync complete: ${syncResult.inserted} inserted, ${syncResult.updated} updated, ${syncResult.failed} failed`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        items: stockResponse.items,
        count: stockResponse.items.length,
        syncResult: syncToDatabase ? syncResult : undefined,
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
