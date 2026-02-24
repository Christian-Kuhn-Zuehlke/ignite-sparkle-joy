import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('ecommerce-order-import');

type SourceSystem = 'shopify' | 'woocommerce';

interface EcommerceOrder {
  order_id: string;
  external_id?: string;
  customer_email?: string;
  order_date: string;
  ship_to_name: string;
  ship_to_address?: string;
  ship_to_postcode?: string;
  ship_to_city?: string;
  ship_to_country?: string;
  order_amount?: number;
  status?: string;
  tracking_code?: string;
  tracking_link?: string;
  lines: {
    sku: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}

// Map e-commerce status to our status enum
function mapStatus(status?: string): 'received' | 'putaway' | 'picking' | 'packing' | 'ready_to_ship' | 'shipped' | 'delivered' {
  if (!status) return 'received';
  
  const statusLower = status.toLowerCase();
  if (statusLower.includes('delivered') || statusLower.includes('completed')) return 'delivered';
  if (statusLower.includes('shipped') || statusLower.includes('fulfilled')) return 'shipped';
  if (statusLower.includes('ready')) return 'ready_to_ship';
  if (statusLower.includes('processing')) return 'picking';
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
  const rateLimit = checkRateLimit(clientId, { maxRequests: 20, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', { clientId });
    return rateLimitResponse(corsHeaders, rateLimit.resetIn);
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const apiKey = req.headers.get('x-api-key');
    const sourceSystem = req.headers.get('x-source-system') as SourceSystem;
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing API key', code: 'MISSING_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!sourceSystem || !['shopify', 'woocommerce'].includes(sourceSystem)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing x-source-system header. Use: shopify or woocommerce', code: 'INVALID_SOURCE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { valid, companyId } = await validateApiKey(supabase, apiKey);
    
    if (!valid) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired API key', code: 'INVALID_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if integration is active
    const { data: integration } = await supabase
      .from('integrations')
      .select('is_active')
      .eq('company_id', companyId)
      .eq('type', sourceSystem)
      .maybeSingle();
    
    if (!integration?.is_active) {
      logger.warn(`${sourceSystem} integration not active`, { companyId });
      return new Response(
        JSON.stringify({ error: `${sourceSystem} integration not active`, code: 'INTEGRATION_INACTIVE' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const body = await req.json();
    const orders: EcommerceOrder[] = Array.isArray(body) ? body : [body];
    
    logger.info('Received e-commerce import', { orderCount: orders.length, sourceSystem, companyId });
    
    const results = {
      imported: 0,
      updated: 0,
      skipped_bc_master: 0, // Orders skipped because BC already has them
      errors: [] as { orderId: string; error: string }[],
    };
    
    for (const order of orders) {
      try {
        // Generate source_no from e-commerce order ID
        const sourceNo = `${sourceSystem.toUpperCase()}-${order.order_id}`;
        
        // Check if BC (master) already has this order via external_document_no match
        const { data: bcOrder } = await supabase
          .from('orders')
          .select('id, source_system')
          .eq('company_id', companyId)
          .eq('source_system', 'business_central')
          .or(`external_document_no.eq.${order.order_id},external_document_no.eq.${order.external_id}`)
          .maybeSingle();
        
        if (bcOrder) {
          // BC has this order - skip to avoid duplicates (BC is master)
          logger.info('Skipping order - BC master already has it', { orderId: order.order_id, bcOrderId: bcOrder.id });
          results.skipped_bc_master++;
          continue;
        }
        
        // Check for existing e-commerce order
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id, source_system')
          .eq('source_no', sourceNo)
          .eq('company_id', companyId)
          .maybeSingle();
        
        const orderData = {
          source_no: sourceNo,
          external_document_no: order.external_id || order.order_id,
          customer_no: order.customer_email,
          company_id: companyId,
          company_name: companyId, // Will be enriched by BC later
          order_date: order.order_date,
          ship_to_name: order.ship_to_name,
          ship_to_address: order.ship_to_address,
          ship_to_postcode: order.ship_to_postcode,
          ship_to_city: order.ship_to_city,
          ship_to_country: order.ship_to_country || 'CH',
          tracking_code: order.tracking_code,
          tracking_link: order.tracking_link,
          order_amount: order.order_amount || 0,
          status: mapStatus(order.status),
          source_system: sourceSystem, // shopify or woocommerce
          updated_at: new Date().toISOString(),
        };
        
        let orderId: string;
        
        if (existingOrder) {
          // Only update if source_system matches (don't overwrite BC data)
          if (existingOrder.source_system === 'business_central') {
            logger.info('Skipping update - BC is master', { orderId: order.order_id });
            results.skipped_bc_master++;
            continue;
          }
          
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
        if (order.lines && order.lines.length > 0) {
          if (existingOrder) {
            await supabase.from('order_lines').delete().eq('order_id', orderId);
          }
          
          const orderLines = order.lines.map(line => ({
            order_id: orderId,
            sku: line.sku,
            name: line.name,
            quantity: line.quantity,
            price: line.price,
          }));
          
          await supabase.from('order_lines').insert(orderLines);
        }
        
      } catch (err) {
        logger.error('Error processing order', err instanceof Error ? err : new Error(String(err)), { orderId: order.order_id });
        results.errors.push({
          orderId: order.order_id,
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
      .eq('type', sourceSystem);
    
    logger.info('E-commerce import completed', { results, sourceSystem });
    
    return new Response(
      JSON.stringify({
        success: true,
        results,
        message: `Imported ${results.imported}, updated ${results.updated}, skipped ${results.skipped_bc_master} (BC master)`,
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
