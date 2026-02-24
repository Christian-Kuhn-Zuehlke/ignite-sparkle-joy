import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('bc-inventory-import');

interface BCInventoryItem {
  CompanyId: string;
  ItemNo: string;
  Name: string;
  CalculatedQty: number;
  Reserved: number;
  OnHand: number;
  Blocked: boolean;
  Barcode?: string;
  LowStockThreshold?: number;
}

// Parse BC SOAP XML format (WSIFProductStockItems)
function parseSOAPInventoryXML(xmlString: string): BCInventoryItem[] {
  const items: BCInventoryItem[] = [];
  
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
      Name: itemNo,
      CalculatedQty: calculatedQty,
      Reserved: reserved,
      OnHand: internalInventory,
      Blocked: getValue('Blocked') === 'true',
      Barcode: getValue('Barcode') !== 'N/A' ? getValue('Barcode') : undefined,
    });
  }
  
  return items;
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

  // Rate limiting - stricter for API imports
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
      logger.warn('Invalid API key');
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
    logger.info('Received inventory import', { bodyLength: xmlBody.length, companyId });
    
    if (!xmlBody || xmlBody.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Empty request body', code: 'EMPTY_BODY' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const items = parseSOAPInventoryXML(xmlBody);
    logger.info('Parsed inventory items', { itemCount: items.length });
    
    if (items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid inventory items found in XML', code: 'NO_ITEMS' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const results = {
      imported: 0,
      updated: 0,
      lowStockAlerts: [] as string[],
      errors: [] as { sku: string; error: string }[],
    };
    
    for (const item of items) {
      try {
        const { data: existingItem } = await supabase
          .from('inventory')
          .select('id, low_stock_threshold')
          .eq('sku', item.ItemNo)
          .eq('company_id', companyId)
          .maybeSingle();
        
        const inventoryData = {
          sku: item.ItemNo,
          name: item.Name,
          company_id: companyId,
          on_hand: item.OnHand,
          reserved: item.Reserved,
          available: item.CalculatedQty,
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
            results.lowStockAlerts.push(item.ItemNo);
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
        logger.error('Error processing inventory item', err instanceof Error ? err : new Error(String(err)), { sku: item.ItemNo });
        results.errors.push({
          sku: item.ItemNo,
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
        message: `Imported ${results.imported} new items, updated ${results.updated} existing items. ${results.lowStockAlerts.length} low stock alerts.`,
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
