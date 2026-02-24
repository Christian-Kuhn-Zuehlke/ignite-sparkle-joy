import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Company configurations - tokens will be loaded from environment
const COMPANIES = [
  { id: 'SLK', bcId: 'SK', name: 'Stadtlandkind', tokenEnvKey: 'MSDIRECT_TOKEN_SLK' },
  { id: 'NAM', bcId: 'NK', name: 'Namuk', tokenEnvKey: 'MSDIRECT_TOKEN_NAM' },
  { id: 'GF', bcId: 'E1', name: 'Golfyr', tokenEnvKey: 'MSDIRECT_TOKEN_GF' },
  { id: 'GT', bcId: 'GT', name: 'GetSA', tokenEnvKey: 'MSDIRECT_TOKEN_GT' },
];

// MS Direct API configuration
const MS_DYNAMIC_LOV_URLS = [
  'https://soap.ms-direct.ch/services/MS_DynamicLov/msDynamicLov',
  'http://soap.ms-direct.ch/services/MS_DynamicLov/msDynamicLov',
];
const MS_DYNAMIC_LOV_AUTH = {
  username: 'mp@msoPRD',
  password: 'owWehEaIng3bR4UjdMSa',
};

const API_TIMEOUT_MS = 60000; // 60 seconds for batch operations

interface SyncResult {
  company: string;
  companyId: string;
  orders: { imported: number; updated: number; errors: number; errorMessages: string[] };
  inventory: { imported: number; updated: number; errors: number; errorMessages: string[] };
  status: 'success' | 'partial' | 'failed';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = SupabaseClient<any, any, any>;

// Fetch with timeout
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

// Build SOAP request for productStock
function buildProductStockSOAPRequest(clientId: string, clientName: string, token: string): string {
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
        </tns:request>
      </tns:productStockRequest>
    </tns:productStock>
  </soap:Body>
</soap:Envelope>`;
}

// Parse productStock response
function parseProductStockResponse(xmlString: string): { items: Array<{sku: string; name: string; onHand: number; reserved: number; available: number}>; error?: string } {
  const items: Array<{sku: string; name: string; onHand: number; reserved: number; available: number}> = [];
  
  try {
    // Check for error
    const errorMatch = xmlString.match(/<(?:tns:)?error>([\s\S]*?)<\/(?:tns:)?error>/i);
    if (errorMatch) {
      const errorMessage = errorMatch[1].match(/<(?:tns:)?errorMessage>([^<]+)<\/(?:tns:)?errorMessage>/i);
      return { items: [], error: errorMessage ? errorMessage[1] : 'Unknown API error' };
    }
    
    // Extract productStockItems
    const productStockItemsMatch = xmlString.match(/<productStockItems>([\s\S]*?)<\/productStockItems>/i);
    if (productStockItemsMatch) {
      const itemsContent = productStockItemsMatch[1];
      const productMatches = itemsContent.matchAll(/<productStockItem>([\s\S]*?)<\/productStockItem>/gi);
      
      for (const match of productMatches) {
        const productContent = match[1];
        
        const getValue = (tag: string): string | undefined => {
          const regex = new RegExp(`<${tag}>([^<]*)<\\/${tag}>`, 'i');
          const m = productContent.match(regex);
          return m ? m[1].trim() : undefined;
        };
        
        const itemNo = getValue('itemNo');
        if (!itemNo) continue;
        
        const qtyOnLocalStock = parseFloat(getValue('qtyOnLocalStock') || '0');
        const qtyOnSalesOrder = parseFloat(getValue('qtyOnSalesOrder') || '0');
        const blocked = parseInt(getValue('blocked') || '0', 10);
        
        const onHand = Math.max(0, qtyOnLocalStock);
        const reserved = Math.max(0, qtyOnSalesOrder);
        const available = Math.max(0, onHand - reserved - blocked);
        
        items.push({
          sku: itemNo,
          name: getValue('description') || itemNo,
          onHand: Math.floor(onHand),
          reserved: Math.floor(reserved),
          available: Math.floor(available),
        });
      }
    }
    
    return { items };
  } catch (err) {
    return { items: [], error: err instanceof Error ? err.message : String(err) };
  }
}

// Sync inventory for a company
async function syncInventory(
  supabase: SupabaseClientAny,
  companyId: string,
  bcId: string,
  companyName: string,
  token: string
): Promise<{ imported: number; updated: number; errors: number; errorMessages: string[] }> {
  const result = { imported: 0, updated: 0, errors: 0, errorMessages: [] as string[] };
  
  if (!token) {
    result.errorMessages.push('No API token configured');
    result.errors = 1;
    return result;
  }
  
  const soapRequest = buildProductStockSOAPRequest(bcId, companyName, token);
  const basicAuth = btoa(`${MS_DYNAMIC_LOV_AUTH.username}:${MS_DYNAMIC_LOV_AUTH.password}`);
  
  // Try each URL
  for (const url of MS_DYNAMIC_LOV_URLS) {
    try {
      console.log(`[${companyName}] Querying productStock via ${url.startsWith('https') ? 'HTTPS' : 'HTTP'}`);
      
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
        result.errorMessages.push(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
        continue;
      }
      
      const xmlResponse = await response.text();
      const parsed = parseProductStockResponse(xmlResponse);
      
      if (parsed.error) {
        result.errorMessages.push(parsed.error);
        result.errors = 1;
        return result;
      }
      
      console.log(`[${companyName}] Received ${parsed.items.length} stock items`);
      
      // Sync items to database
      for (const item of parsed.items) {
        try {
          const { data: existing } = await supabase
            .from('inventory')
            .select('id')
            .eq('company_id', companyId)
            .eq('sku', item.sku)
            .single();
          
          if (existing) {
            const { error: updateError } = await supabase
              .from('inventory')
              .update({
                on_hand: item.onHand,
                reserved: item.reserved,
                available: item.available,
                name: item.name,
                source_system: 'ms_direct_sync',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
            
            if (updateError) {
              result.errors++;
              result.errorMessages.push(`Update ${item.sku}: ${updateError.message}`);
            } else {
              result.updated++;
            }
          } else {
            const { error: insertError } = await supabase
              .from('inventory')
              .insert({
                company_id: companyId,
                sku: item.sku,
                name: item.name,
                on_hand: item.onHand,
                reserved: item.reserved,
                available: item.available,
                source_system: 'ms_direct_sync',
              });
            
            if (insertError) {
              result.errors++;
              result.errorMessages.push(`Insert ${item.sku}: ${insertError.message}`);
            } else {
              result.imported++;
            }
          }
        } catch (err) {
          result.errors++;
          result.errorMessages.push(`${item.sku}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      result.errorMessages.push(`${url}: ${errorMessage}`);
      continue;
    }
  }
  
  result.errors = 1;
  return result;
}

// Sync orders for a company (placeholder - uses existing ms-order-state-sync or similar)
async function syncOrders(
  supabase: SupabaseClientAny,
  companyId: string,
  _bcId: string,
  companyName: string,
  token: string,
  _fromDate: Date
): Promise<{ imported: number; updated: number; errors: number; errorMessages: string[] }> {
  const result = { imported: 0, updated: 0, errors: 0, errorMessages: [] as string[] };
  
  if (!token) {
    result.errorMessages.push('No API token configured - Order sync skipped');
    return result;
  }
  
  // Note: Order sync requires calling the orderState API for each order
  // For now, we just update existing orders that need status updates
  // A full implementation would iterate through orders needing updates
  
  try {
    // Get orders that haven't been updated in the last 24 hours
    const { data: ordersToUpdate, error: fetchError } = await supabase
      .from('orders')
      .select('id, source_no')
      .eq('company_id', companyId)
      .in('status', ['received', 'processing', 'shipped'])
      .lt('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(50);
    
    if (fetchError) {
      result.errorMessages.push(`Fetch orders: ${fetchError.message}`);
      result.errors = 1;
      return result;
    }
    
    console.log(`[${companyName}] Found ${ordersToUpdate?.length || 0} orders to potentially update`);
    
    // For now, just log - full orderState API integration would go here
    // This is a placeholder for the actual order sync implementation
    result.updated = 0;
    
  } catch (err) {
    result.errors = 1;
    result.errorMessages.push(err instanceof Error ? err.message : String(err));
  }
  
  return result;
}

// Log sync result to database
async function logSyncResult(
  supabase: SupabaseClientAny,
  result: SyncResult
): Promise<void> {
  try {
    await supabase.from('sync_logs').insert({
      company_id: result.companyId,
      sync_type: 'daily_auto',
      status: result.status,
      orders_imported: result.orders.imported,
      orders_updated: result.orders.updated,
      orders_errors: result.orders.errors,
      inventory_imported: result.inventory.imported,
      inventory_updated: result.inventory.updated,
      inventory_errors: result.inventory.errors,
      error_messages: [...result.orders.errorMessages, ...result.inventory.errorMessages],
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`Failed to log sync result for ${result.company}:`, err);
  }
}

// Send sync report email
async function sendSyncReport(
  supabaseUrl: string,
  supabaseAnonKey: string,
  results: SyncResult[]
): Promise<void> {
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (!adminEmail) {
    console.log('No ADMIN_EMAIL configured, skipping report email');
    return;
  }
  
  const totalOrders = results.reduce((sum, r) => sum + r.orders.imported + r.orders.updated, 0);
  const totalInventory = results.reduce((sum, r) => sum + r.inventory.imported + r.inventory.updated, 0);
  const hasErrors = results.some(r => r.orders.errors > 0 || r.inventory.errors > 0);
  
  const subject = hasErrors 
    ? `⚠️ Daily Sync Report - ${new Date().toLocaleDateString('de-CH')} - Mit Fehlern`
    : `✅ Daily Sync Report - ${new Date().toLocaleDateString('de-CH')}`;
  
  let body = `Daily Data Sync Report\n`;
  body += `${'='.repeat(40)}\n\n`;
  body += `Datum: ${new Date().toLocaleString('de-CH')}\n\n`;
  
  for (const result of results) {
    const statusIcon = result.status === 'success' ? '✅' : result.status === 'partial' ? '⚠️' : '❌';
    body += `${statusIcon} ${result.company}\n`;
    body += `   Orders: ${result.orders.imported} neu, ${result.orders.updated} aktualisiert, ${result.orders.errors} Fehler\n`;
    body += `   Inventory: ${result.inventory.imported} neu, ${result.inventory.updated} aktualisiert, ${result.inventory.errors} Fehler\n`;
    
    const errors = [...result.orders.errorMessages, ...result.inventory.errorMessages];
    if (errors.length > 0) {
      body += `   Fehler:\n`;
      for (const error of errors.slice(0, 5)) {
        body += `     - ${error}\n`;
      }
      if (errors.length > 5) {
        body += `     ... und ${errors.length - 5} weitere\n`;
      }
    }
    body += `\n`;
  }
  
  body += `${'='.repeat(40)}\n`;
  body += `Gesamt: ${totalOrders} Orders, ${totalInventory} Inventory Items\n`;
  
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-email-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        to: adminEmail,
        subject,
        body,
      }),
    });
    console.log('Sync report email sent');
  } catch (err) {
    console.error('Failed to send sync report email:', err);
  }
}

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  console.log('🚀 Starting Daily Data Sync...');
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const results: SyncResult[] = [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Sync each company
    for (const company of COMPANIES) {
      console.log(`\n🔄 Syncing ${company.name} (${company.id})...`);
      
      const token = Deno.env.get(company.tokenEnvKey) || '';
      
      if (!token) {
        console.log(`   ⚠️ No token found for ${company.tokenEnvKey}`);
      }
      
      // Sync orders
      const orderResult = await syncOrders(
        supabase,
        company.id,
        company.bcId,
        company.name,
        token,
        yesterday
      );
      console.log(`   📦 Orders: ${orderResult.imported} new, ${orderResult.updated} updated, ${orderResult.errors} errors`);
      
      // Sync inventory
      const inventoryResult = await syncInventory(
        supabase,
        company.id,
        company.bcId,
        company.name,
        token
      );
      console.log(`   📦 Inventory: ${inventoryResult.imported} new, ${inventoryResult.updated} updated, ${inventoryResult.errors} errors`);
      
      // Determine overall status
      let status: 'success' | 'partial' | 'failed' = 'success';
      if (orderResult.errors > 0 || inventoryResult.errors > 0) {
        if ((orderResult.imported + orderResult.updated > 0) || (inventoryResult.imported + inventoryResult.updated > 0)) {
          status = 'partial';
        } else {
          status = 'failed';
        }
      }
      
      const result: SyncResult = {
        company: company.name,
        companyId: company.id,
        orders: orderResult,
        inventory: inventoryResult,
        status,
      };
      
      results.push(result);
      
      // Log to database
      await logSyncResult(supabase, result);
    }
    
    // Send email report
    await sendSyncReport(supabaseUrl, supabaseAnonKey, results);
    
    console.log('\n✅ Daily Data Sync completed');
    
    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results: results.map(r => ({
          company: r.company,
          status: r.status,
          orders: { imported: r.orders.imported, updated: r.orders.updated, errors: r.orders.errors },
          inventory: { imported: r.inventory.imported, updated: r.inventory.updated, errors: r.inventory.errors },
        })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
