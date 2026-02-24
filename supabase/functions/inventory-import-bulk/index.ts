import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('inventory-import-bulk');

interface BCInventoryItem {
  CompanyId: string;
  ItemNo: string;
  Name: string;
  CalculatedQty: number;
  Reserved: number;
  OnHand: number;
  Blocked: boolean;
}

// Company ID mapping from BC to our internal IDs
const companyIdMap: Record<string, string> = {
  'GT': 'GT',
  'NK': 'NAM',
  'AV': 'AVI',
  'E1': 'GF',
};

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
      Name: getValue('Description') || itemNo,
      CalculatedQty: calculatedQty,
      Reserved: reserved,
      OnHand: internalInventory,
      Blocked: getValue('Blocked') === 'true',
    });
  }
  
  return items;
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
    logger.info('Received bulk inventory import', { bodyLength: xmlBody.length });
    
    if (!xmlBody || xmlBody.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Leerer Request-Body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const items = parseSOAPInventoryXML(xmlBody);
    logger.info('Parsed inventory items', { itemCount: items.length });
    
    if (items.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Keine gültigen Bestandsartikel im XML gefunden' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const results = {
      imported: 0,
      updated: 0,
      lowStockAlerts: 0,
      errors: [] as { sku: string; error: string }[],
    };
    
    // Process items in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      
      for (const item of batch) {
        try {
          const mappedCompanyId = companyIdMap[item.CompanyId] || item.CompanyId;
          
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('id', mappedCompanyId)
            .maybeSingle();
          
          if (!company) {
            logger.warn('Company not found', { bcCompanyId: item.CompanyId, mappedId: mappedCompanyId });
            results.errors.push({
              sku: item.ItemNo,
              error: `Firma nicht gefunden: ${item.CompanyId}`,
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
          logger.error('Error processing item', err instanceof Error ? err : new Error(String(err)), { sku: item.ItemNo });
          results.errors.push({
            sku: item.ItemNo,
            error: err instanceof Error ? err.message : 'Unbekannter Fehler',
          });
        }
      }
    }
    
    logger.info('Bulk import completed', { results });
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `${results.imported} neue Artikel importiert, ${results.updated} aktualisiert.${results.lowStockAlerts > 0 ? ` ${results.lowStockAlerts} Low-Stock Warnungen.` : ''}`,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    logger.error('Bulk import failed', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error instanceof Error ? error.message : 'Interner Server-Fehler',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
