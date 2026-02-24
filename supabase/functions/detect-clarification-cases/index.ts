import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { companyId } = await req.json();

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'companyId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Detecting clarification cases for company ${companyId}`);

    const cases: Array<{
      company_id: string;
      case_type: string;
      severity: string;
      title: string;
      description: string;
      ai_explanation: string;
      ai_confidence_score: number;
      recommended_action: string;
      related_sku?: string;
      related_order_id?: string;
      related_po_id?: string;
      expected_value?: number;
      actual_value?: number;
      discrepancy_value?: number;
      metadata: object;
    }> = [];

    // 1. Detect stock discrepancies (items with very low or negative stock)
    const { data: inventory } = await supabase
      .from('inventory')
      .select('*')
      .eq('company_id', companyId);

    if (inventory) {
      for (const item of inventory) {
        // Check for negative available stock
        if ((item.available ?? 0) < 0) {
          cases.push({
            company_id: companyId,
            case_type: 'stock_discrepancy',
            severity: 'critical',
            title: `Negativer Bestand: ${item.name}`,
            description: `SKU ${item.sku} zeigt ${item.available} verfügbare Einheiten (negativ). Dies deutet auf Buchungsfehler oder fehlende Wareneingänge hin.`,
            ai_explanation: `Negativer Bestand entsteht typischerweise durch: 1) Fehlende Wareneingangs-Buchungen, 2) Doppelte Ausbuchungen bei Bestellungen, 3) Synchronisationsprobleme mit dem WMS. Mit 85% Wahrscheinlichkeit liegt ein ausstehender Wareneingang vor.`,
            ai_confidence_score: 0.85,
            recommended_action: 'Offene Wareneingänge prüfen und fehlende Buchungen nachholen.',
            related_sku: item.sku,
            expected_value: 0,
            actual_value: item.available,
            discrepancy_value: item.available,
            metadata: { on_hand: item.on_hand, reserved: item.reserved }
          });
        }

        // Check for high reserved vs on_hand ratio (blocked items)
        if (item.on_hand > 0 && item.reserved > item.on_hand * 0.9) {
          cases.push({
            company_id: companyId,
            case_type: 'item_blocked',
            severity: 'high',
            title: `Hohe Reservierung: ${item.name}`,
            description: `${Math.round(item.reserved / item.on_hand * 100)}% des Bestands von SKU ${item.sku} ist reserviert. Nur ${item.available ?? 0} Einheiten verfügbar.`,
            ai_explanation: `Hohe Reservierungsquoten entstehen bei: 1) Vielen offenen Bestellungen, 2) Qualitätsblockaden, 3) Fehlenden Lieferungen. Prüfen Sie ob alle reservierenden Bestellungen valide sind.`,
            ai_confidence_score: 0.72,
            recommended_action: 'Offene Bestellungen und Reservierungsgründe prüfen.',
            related_sku: item.sku,
            metadata: { on_hand: item.on_hand, reserved: item.reserved, available: item.available }
          });
        }
      }
    }

    // 2. Detect stuck orders (orders in 'processing' status for too long)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const { data: stuckOrders } = await supabase
      .from('orders')
      .select('id, source_no, status, ship_to_name, order_date, updated_at')
      .eq('company_id', companyId)
      .in('status', ['new', 'processing', 'pending'])
      .lt('order_date', twoDaysAgo.toISOString());

    if (stuckOrders) {
      for (const order of stuckOrders) {
        const daysSinceOrder = Math.floor(
          (Date.now() - new Date(order.order_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        cases.push({
          company_id: companyId,
          case_type: 'order_stuck',
          severity: daysSinceOrder > 5 ? 'critical' : 'high',
          title: `Bestellung hängt: ${order.source_no}`,
          description: `Bestellung ${order.source_no} für ${order.ship_to_name} ist seit ${daysSinceOrder} Tagen im Status "${order.status}".`,
          ai_explanation: `Bestellungen die länger als 2 Tage nicht bearbeitet werden deuten auf: 1) Fehlende Lagerbestände (${daysSinceOrder > 5 ? '75%' : '60%'} Wahrscheinlichkeit), 2) Adressprobleme, 3) Zahlungsprobleme. Prüfen Sie Bestandsverfügbarkeit der Positionen.`,
          ai_confidence_score: daysSinceOrder > 5 ? 0.75 : 0.60,
          recommended_action: 'Bestandsverfügbarkeit und Bestelldetails prüfen, ggf. Kunden kontaktieren.',
          related_order_id: order.id,
          metadata: { 
            status: order.status, 
            order_date: order.order_date, 
            days_stuck: daysSinceOrder 
          }
        });
      }
    }

    // 3. Detect incomplete inbound (POs with partial receiving)
    const { data: incompletePOs } = await supabase
      .from('purchase_orders')
      .select(`
        id, po_number, supplier_name, status, eta,
        purchase_order_lines(qty_expected, qty_received)
      `)
      .eq('company_id', companyId)
      .in('status', ['receiving', 'partial']);

    if (incompletePOs) {
      for (const po of incompletePOs) {
        const lines = po.purchase_order_lines || [];
        const totalExpected = lines.reduce((s: number, l: any) => s + (l.qty_expected || 0), 0);
        const totalReceived = lines.reduce((s: number, l: any) => s + (l.qty_received || 0), 0);
        const percentReceived = totalExpected > 0 ? (totalReceived / totalExpected) * 100 : 0;

        if (totalExpected > totalReceived) {
          cases.push({
            company_id: companyId,
            case_type: 'inbound_incomplete',
            severity: percentReceived < 50 ? 'high' : 'medium',
            title: `Wareneingang unvollständig: ${po.po_number}`,
            description: `PO ${po.po_number} von ${po.supplier_name}: ${totalReceived} von ${totalExpected} Einheiten erhalten (${Math.round(percentReceived)}%).`,
            ai_explanation: `Unvollständige Wareneingänge entstehen durch: 1) Teillieferungen vom Lieferanten, 2) Verzögerungen im Wareneingangs-Prozess, 3) Fehlmengen. Empfehlung: Lieferant kontaktieren für ausstehende Mengen.`,
            ai_confidence_score: 0.80,
            recommended_action: `Wareneingang abschliessen oder Lieferant wegen ${totalExpected - totalReceived} fehlender Einheiten kontaktieren.`,
            related_po_id: po.id,
            expected_value: totalExpected,
            actual_value: totalReceived,
            discrepancy_value: totalExpected - totalReceived,
            metadata: { supplier: po.supplier_name, eta: po.eta, percent_received: percentReceived }
          });
        }
      }
    }

    // Delete existing open cases for this company to avoid duplicates
    await supabase
      .from('clarification_cases')
      .delete()
      .eq('company_id', companyId)
      .eq('status', 'open');

    // Insert new cases
    if (cases.length > 0) {
      const { error: insertError } = await supabase
        .from('clarification_cases')
        .insert(cases);

      if (insertError) {
        console.error('Error inserting cases:', insertError);
        throw insertError;
      }
    }

    console.log(`Detected ${cases.length} clarification cases`);

    return new Response(
      JSON.stringify({
        success: true,
        casesDetected: cases.length,
        byType: {
          stock_discrepancy: cases.filter(c => c.case_type === 'stock_discrepancy').length,
          order_stuck: cases.filter(c => c.case_type === 'order_stuck').length,
          inbound_incomplete: cases.filter(c => c.case_type === 'inbound_incomplete').length,
          item_blocked: cases.filter(c => c.case_type === 'item_blocked').length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Detection error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});