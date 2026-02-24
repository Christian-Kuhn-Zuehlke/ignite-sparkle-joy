import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders, checkRateLimit, rateLimitResponse, getClientIdentifier, Logger } from '../_shared/security.ts';

const logger = new Logger('fulfillment-ai');

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting - more generous for chat
  const clientId = getClientIdentifier(req);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 50, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', { clientId });
    return rateLimitResponse(corsHeaders, rateLimit.resetIn);
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch (parseError: unknown) {
      const err = parseError instanceof Error ? parseError : new Error(String(parseError));
      logger.error('Failed to parse request body', err);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { messages = [], companyId, language = 'de' } = body || {};
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    logger.debug('Request received', { 
      hasMessages: !!messages, 
      messagesLength: Array.isArray(messages) ? messages.length : 'not-array',
      companyId,
      language 
    });
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      logger.warn('Messages validation failed', { messages, bodyKeys: Object.keys(body || {}) });
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lastUserMessage = messages[messages.length - 1]?.content || '';
    
    const searchTerms = extractSearchTerms(lastUserMessage);
    logger.debug('Search terms extracted', { searchTerms });

    let contextData = '';
    let searchResults: any = {};

    // Try to detect company from user message if not provided
    let effectiveCompanyId = companyId;
    let companyName = '';
    
    // If no companyId provided, try to extract from message
    if (!effectiveCompanyId) {
      const detectedCompany = await detectCompanyFromMessage(supabase, lastUserMessage);
      if (detectedCompany) {
        effectiveCompanyId = detectedCompany.id;
        companyName = detectedCompany.name;
        logger.info('Company detected from message', { companyId: effectiveCompanyId, companyName });
      }
    } else {
      // Get company name if companyId provided
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', effectiveCompanyId)
        .single();
      companyName = company?.name || effectiveCompanyId;
    }

    // Parse time range from query
    const timeRange = parseTimeRange(lastUserMessage);
    
    if (effectiveCompanyId) {
      // ===== TIME-BASED ORDER ANALYTICS =====
      if (searchTerms.includesTrend || searchTerms.includesTimeAnalysis) {
        const analytics = await fetchOrderAnalytics(supabase, effectiveCompanyId, timeRange);
        searchResults.analytics = analytics;
        
        if (analytics) {
          contextData += `\n\n📊 ZEITRAUM-ANALYSE (${timeRange.label}):\n`;
          contextData += `- Zeitraum: ${analytics.periodStart} bis ${analytics.periodEnd}\n`;
          contextData += `- Bestellungen gesamt: ${analytics.totalOrders}\n`;
          contextData += `- Bestellwert gesamt: ${analytics.totalValue?.toFixed(2) || 0} CHF\n`;
          contextData += `- Durchschnittlicher Bestellwert: ${analytics.avgOrderValue?.toFixed(2) || 0} CHF\n`;
          contextData += `- Versendet: ${analytics.shippedOrders} (${analytics.shippedPercent?.toFixed(1)}%)\n`;
          contextData += `- Offen: ${analytics.pendingOrders}\n`;
          
          if (analytics.byStatus && Object.keys(analytics.byStatus).length > 0) {
            contextData += `\nNach Status:\n`;
            Object.entries(analytics.byStatus).forEach(([status, count]) => {
              contextData += `  - ${status}: ${count}\n`;
            });
          }
          
          if (analytics.trend) {
            contextData += `\nTrend vs. Vorperiode: ${analytics.trend > 0 ? '+' : ''}${analytics.trend.toFixed(1)}%\n`;
          }
        }
      }

      // ===== ARTICLE INTELLIGENCE (order_lines + returns) =====
      if (searchTerms.includesArticleAnalysis || searchTerms.includesTopArticles) {
        const articleAnalytics = await fetchArticleAnalytics(supabase, effectiveCompanyId, timeRange);
        searchResults.articleAnalytics = articleAnalytics;
        
        if (articleAnalytics) {
          contextData += `\n\n📦 ARTIKEL-ANALYSE (${timeRange.label}):\n`;
          
          if (articleAnalytics.topSellers?.length > 0) {
            contextData += `\nTop 10 meistverkaufte Artikel:\n`;
            articleAnalytics.topSellers.forEach((item: any, i: number) => {
              contextData += `  ${i + 1}. ${item.sku} - "${item.name}": ${item.totalQty} Stk, ${item.totalValue?.toFixed(2) || 0} CHF`;
              if (item.returnRate > 0) {
                contextData += ` (Retourenquote: ${item.returnRate.toFixed(1)}%)`;
              }
              contextData += '\n';
            });
          }
          
          if (articleAnalytics.highReturnArticles?.length > 0) {
            contextData += `\n⚠️ Artikel mit hoher Retourenquote:\n`;
            articleAnalytics.highReturnArticles.forEach((item: any) => {
              contextData += `  - ${item.sku} "${item.name}": ${item.returnRate.toFixed(1)}% (${item.returnedQty}/${item.soldQty} retourniert)\n`;
            });
          }
        }
      }

      // ===== GEOGRAPHIC INSIGHTS =====
      if (searchTerms.includesGeo || searchTerms.country || searchTerms.city) {
        const geoAnalytics = await fetchGeoAnalytics(supabase, effectiveCompanyId, timeRange, searchTerms);
        searchResults.geoAnalytics = geoAnalytics;
        
        if (geoAnalytics) {
          contextData += `\n\n🌍 GEOGRAFISCHE ANALYSE (${timeRange.label}):\n`;
          
          if (geoAnalytics.byCountry?.length > 0) {
            contextData += `\nNach Land:\n`;
            geoAnalytics.byCountry.slice(0, 10).forEach((item: any) => {
              contextData += `  - ${item.country}: ${item.orderCount} Bestellungen, ${item.totalValue?.toFixed(2) || 0} CHF`;
              if (item.returnRate > 0) {
                contextData += ` (Retourenquote: ${item.returnRate.toFixed(1)}%)`;
              }
              contextData += '\n';
            });
          }
          
          if (geoAnalytics.byCity?.length > 0) {
            contextData += `\nTop Städte:\n`;
            geoAnalytics.byCity.slice(0, 10).forEach((item: any) => {
              contextData += `  - ${item.city}, ${item.country}: ${item.orderCount} Bestellungen\n`;
            });
          }
        }
      }

      // ===== RETURNS ANALYTICS (combined from order_lines + returns table) =====
      if (searchTerms.includesReturns || searchTerms.includesReturnAnalysis) {
        const returnAnalytics = await fetchReturnAnalytics(supabase, effectiveCompanyId, timeRange);
        searchResults.returnAnalytics = returnAnalytics;
        
        if (returnAnalytics) {
          contextData += `\n\n🔄 RETOUREN-ANALYSE (${timeRange.label}):\n`;
          contextData += `- Retouren gesamt: ${returnAnalytics.totalReturns}\n`;
          contextData += `- Retourenwert: ${returnAnalytics.totalValue?.toFixed(2) || 0} CHF\n`;
          contextData += `- Retourenquote: ${returnAnalytics.returnRate?.toFixed(1) || 0}%\n`;
          
          if (returnAnalytics.byStatus && Object.keys(returnAnalytics.byStatus).length > 0) {
            contextData += `\nNach Status:\n`;
            Object.entries(returnAnalytics.byStatus).forEach(([status, count]) => {
              contextData += `  - ${status}: ${count}\n`;
            });
          }
          
          if (returnAnalytics.byReason?.length > 0) {
            contextData += `\nTop Gründe:\n`;
            returnAnalytics.byReason.slice(0, 5).forEach((item: any) => {
              contextData += `  - ${item.reason || 'Kein Grund'}: ${item.count}\n`;
            });
          }
          
          if (returnAnalytics.trend !== undefined) {
            contextData += `\nTrend vs. Vorperiode: ${returnAnalytics.trend > 0 ? '+' : ''}${returnAnalytics.trend.toFixed(1)}%\n`;
          }
        }
      }

      // ===== FULFILLMENT PERFORMANCE ANALYTICS =====
      if (searchTerms.includesFulfillment || searchTerms.includesProcessingTime || searchTerms.includesSLA) {
        const fulfillmentAnalytics = await fetchFulfillmentAnalytics(supabase, effectiveCompanyId, timeRange);
        searchResults.fulfillmentAnalytics = fulfillmentAnalytics;
        
        if (fulfillmentAnalytics) {
          contextData += `\n\n⚡ FULFILLMENT-PERFORMANCE (${timeRange.label}):\n`;
          
          if (fulfillmentAnalytics.processingTimes) {
            contextData += `\n📊 Durchlaufzeiten:\n`;
            contextData += `  - ∅ Gesamtzeit (Order → Shipped): ${fulfillmentAnalytics.processingTimes.avgTotalHours?.toFixed(1) || 'k.A.'} Stunden\n`;
            contextData += `  - ∅ Pick-Zeit: ${(fulfillmentAnalytics.processingTimes.avgPickHours as number | undefined)?.toFixed(1) || 'k.A.'} Stunden\n`;
            contextData += `  - ∅ Pack-Zeit: ${(fulfillmentAnalytics.processingTimes.avgPackHours as number | undefined)?.toFixed(1) || 'k.A.'} Stunden\n`;
            contextData += `  - Schnellste Bestellung: ${fulfillmentAnalytics.processingTimes.fastestHours?.toFixed(1) || 'k.A.'} Stunden\n`;
            contextData += `  - Langsamste Bestellung: ${fulfillmentAnalytics.processingTimes.slowestHours?.toFixed(1) || 'k.A.'} Stunden\n`;
          }
          
          if (fulfillmentAnalytics.slaPerformance) {
            contextData += `\n🎯 SLA-Performance:\n`;
            contextData += `  - On-Time: ${fulfillmentAnalytics.slaPerformance.onTimePercent?.toFixed(1) || 0}% (${fulfillmentAnalytics.slaPerformance.onTime || 0} von ${fulfillmentAnalytics.slaPerformance.total || 0})\n`;
            contextData += `  - At-Risk: ${fulfillmentAnalytics.slaPerformance.atRisk || 0} Bestellungen\n`;
            contextData += `  - Verspätet: ${fulfillmentAnalytics.slaPerformance.late || 0} Bestellungen\n`;
          }
          
          if (fulfillmentAnalytics.byStatus && Object.keys(fulfillmentAnalytics.byStatus).length > 0) {
            contextData += `\n📦 Aktuelle Pipeline:\n`;
            Object.entries(fulfillmentAnalytics.byStatus).forEach(([status, count]) => {
              contextData += `  - ${status}: ${count}\n`;
            });
          }
          
          if (fulfillmentAnalytics.byShippingAgent?.length > 0) {
            contextData += `\n🚚 Nach Versanddienstleister:\n`;
            fulfillmentAnalytics.byShippingAgent.forEach((agent: any) => {
              contextData += `  - ${agent.name || 'Unbekannt'}: ${agent.count} Sendungen`;
              if (agent.avgDeliveryDays) contextData += ` (∅ ${agent.avgDeliveryDays.toFixed(1)} Tage)`;
              contextData += '\n';
            });
          }
        }
      }

      // ===== INBOUND / WAREHOUSE RECEIVING =====
      if (searchTerms.includesInbound || searchTerms.includesPO) {
        const inboundAnalytics = await fetchInboundAnalytics(supabase, effectiveCompanyId, timeRange);
        searchResults.inboundAnalytics = inboundAnalytics;
        
        if (inboundAnalytics) {
          contextData += `\n\n📥 WARENEINGANG (${timeRange.label}):\n`;
          contextData += `- Purchase Orders gesamt: ${inboundAnalytics.totalPOs}\n`;
          contextData += `- Artikel empfangen: ${inboundAnalytics.totalItemsReceived}\n`;
          
          if (inboundAnalytics.byStatus && Object.keys(inboundAnalytics.byStatus).length > 0) {
            contextData += `\nNach Status:\n`;
            Object.entries(inboundAnalytics.byStatus).forEach(([status, count]) => {
              contextData += `  - ${status}: ${count}\n`;
            });
          }
          
          if (inboundAnalytics.pendingPOs?.length > 0) {
            contextData += `\n⏳ Offene Wareneingänge:\n`;
            inboundAnalytics.pendingPOs.slice(0, 5).forEach((po: any) => {
              contextData += `  - ${po.po_number}: ${po.supplier_name}, ETA: ${po.eta || 'k.A.'}, Status: ${po.status}\n`;
            });
          }
          
          if (inboundAnalytics.avgDockToStock) {
            contextData += `\n∅ Dock-to-Stock Zeit: ${inboundAnalytics.avgDockToStock.toFixed(1)} Stunden\n`;
          }
        }
      }

      // ===== PRODUCTIVITY METRICS =====
      if (searchTerms.includesProductivity || searchTerms.includesEfficiency) {
        const productivityData = await fetchProductivityMetrics(supabase, effectiveCompanyId, timeRange);
        searchResults.productivity = productivityData;
        
        if (productivityData) {
          contextData += `\n\n📈 PRODUKTIVITÄT (${timeRange.label}):\n`;
          if (productivityData.ordersPerHour) contextData += `- Orders/Stunde: ${productivityData.ordersPerHour.toFixed(1)}\n`;
          if (productivityData.unitsPerHour) contextData += `- Units/Stunde: ${productivityData.unitsPerHour.toFixed(1)}\n`;
          if (productivityData.packThroughput) contextData += `- Pack-Durchsatz: ${productivityData.packThroughput.toFixed(1)} Pakete/Stunde\n`;
          if (productivityData.backlogOrders) contextData += `- Rückstand: ${productivityData.backlogOrders} Bestellungen\n`;
        }
      }

      // ===== QUALITY METRICS =====
      if (searchTerms.includesQuality || searchTerms.includesErrors) {
        const qualityData = await fetchQualityMetrics(supabase, effectiveCompanyId, timeRange);
        searchResults.quality = qualityData;
        
        if (qualityData) {
          contextData += `\n\n✅ QUALITÄTS-METRIKEN (${timeRange.label}):\n`;
          if (qualityData.errorRate !== undefined) contextData += `- Fehlerquote: ${qualityData.errorRate.toFixed(2)}%\n`;
          if (qualityData.returnRate !== undefined) contextData += `- Retourenquote: ${qualityData.returnRate.toFixed(1)}%\n`;
          if (qualityData.shortPicks !== undefined) contextData += `- Short Picks: ${qualityData.shortPicks}\n`;
          if (qualityData.reworkRate !== undefined) contextData += `- Nacharbeit: ${qualityData.reworkRate.toFixed(2)}%\n`;
          
          if (qualityData.discrepancies?.length > 0) {
            contextData += `\n⚠️ Diskrepanzen:\n`;
            qualityData.discrepancies.forEach((d: any) => {
              contextData += `  - ${d.type}: ${d.count} Fälle\n`;
            });
          }
        }
      }

      // ===== PROACTIVE INSIGHTS =====
      if (searchTerms.includesProactive || (!contextData && !searchTerms.orderNumber && !searchTerms.sku)) {
        const proactiveInsights = await fetchProactiveInsights(supabase, effectiveCompanyId);
        
        if (proactiveInsights.hasIssues) {
          contextData += `\n\n💡 PROAKTIVE ERKENNTNISSE:\n`;
          
          if (proactiveInsights.stuckOrders?.length > 0) {
            contextData += `\n⚠️ Bestellungen mit längerer Wartezeit:\n`;
            proactiveInsights.stuckOrders.forEach((o: any) => {
              contextData += `  - ${o.source_no}: ${o.daysInStatus} Tage im Status "${o.status}"\n`;
            });
          }
          
          if (proactiveInsights.lowStockItems?.length > 0) {
            contextData += `\n⚠️ Niedrige Lagerbestände:\n`;
            proactiveInsights.lowStockItems.forEach((i: any) => {
              contextData += `  - ${i.sku} "${i.name}": nur ${i.available} verfügbar (Schwellwert: ${i.low_stock_threshold})\n`;
            });
          }
          
          if (proactiveInsights.highReturnRate) {
            contextData += `\n⚠️ Retourenquote ${proactiveInsights.returnRate?.toFixed(1)}% - höher als Durchschnitt\n`;
          }
          
          if (proactiveInsights.pendingReturns > 0) {
            contextData += `\n📋 ${proactiveInsights.pendingReturns} offene Retouren warten auf Bearbeitung\n`;
          }
        }
      }

      // ===== CUSTOMER SEGMENTATION ANALYSIS =====
      if (searchTerms.includesCustomerAnalysis || searchTerms.includesVIP || searchTerms.includesChurn) {
        const customerInsights = await fetchCustomerSegmentation(supabase, effectiveCompanyId, timeRange);
        searchResults.customerInsights = customerInsights;
        
        if (customerInsights) {
          contextData += `\n\n👥 KUNDEN-SEGMENTIERUNG (${timeRange.label}):\n`;
          contextData += `- Unique Kunden: ${customerInsights.totalCustomers}\n`;
          contextData += `- Wiederkäufer: ${customerInsights.repeatCustomers} (${customerInsights.repeatRate?.toFixed(1)}%)\n`;
          contextData += `- Durchschnittl. Bestellungen/Kunde: ${customerInsights.avgOrdersPerCustomer?.toFixed(2)}\n`;
          contextData += `- Durchschnittl. CLV: ${customerInsights.avgCLV?.toFixed(2)} CHF\n`;
          
          if (customerInsights.segments) {
            contextData += `\n📊 Segmente:\n`;
            contextData += `  - VIP (>500 CHF): ${customerInsights.segments.vip} Kunden (${customerInsights.segments.vipRevenue?.toFixed(2)} CHF)\n`;
            contextData += `  - Regular (100-500 CHF): ${customerInsights.segments.regular} Kunden\n`;
            contextData += `  - Occasional (<100 CHF): ${customerInsights.segments.occasional} Kunden\n`;
          }
          
          if (customerInsights.topCustomers?.length > 0) {
            contextData += `\n🌟 Top 10 Kunden nach Umsatz:\n`;
            customerInsights.topCustomers.forEach((c: any, i: number) => {
              contextData += `  ${i + 1}. ${c.customerNo || c.name}: ${c.totalSpent?.toFixed(2)} CHF (${c.orderCount} Bestellungen)\n`;
            });
          }
          
          if (customerInsights.churnRisk?.length > 0) {
            contextData += `\n⚠️ Churn-Risiko (>90 Tage inaktiv, früher aktiv):\n`;
            customerInsights.churnRisk.slice(0, 10).forEach((c: any) => {
              contextData += `  - ${c.customerNo || c.name}: Letzte Bestellung vor ${c.daysSinceLastOrder} Tagen, Umsatz: ${c.totalSpent?.toFixed(2)} CHF\n`;
            });
          }
        }
      }

      // ===== TREND WARNINGS / ANOMALY DETECTION =====
      if (searchTerms.includesTrendWarnings || searchTerms.includesAnomalies) {
        const trendWarnings = await fetchTrendWarnings(supabase, effectiveCompanyId);
        searchResults.trendWarnings = trendWarnings;
        
        if (trendWarnings && trendWarnings.warnings?.length > 0) {
          contextData += `\n\n🚨 TREND-WARNUNGEN:\n`;
          trendWarnings.warnings.forEach((w: any) => {
            contextData += `  - ${w.severity === 'critical' ? '🔴' : w.severity === 'warning' ? '🟡' : '🟢'} ${w.message}\n`;
            if (w.details) contextData += `    Details: ${w.details}\n`;
          });
        }
        
        if (trendWarnings?.aovTrend) {
          contextData += `\n📉 AOV-Trend (Avg Order Value):\n`;
          contextData += `  - Aktueller Monat: ${trendWarnings.aovTrend.current?.toFixed(2)} CHF\n`;
          contextData += `  - Vormonat: ${trendWarnings.aovTrend.previous?.toFixed(2)} CHF\n`;
          contextData += `  - Veränderung: ${trendWarnings.aovTrend.change > 0 ? '+' : ''}${trendWarnings.aovTrend.change?.toFixed(1)}%\n`;
        }
        
        if (trendWarnings?.seasonalPattern) {
          contextData += `\n📅 Saisonale Muster:\n`;
          contextData += `  - Stärkster Monat: ${trendWarnings.seasonalPattern.peakMonth} (+${trendWarnings.seasonalPattern.peakIncrease?.toFixed(0)}% vs. Durchschnitt)\n`;
          contextData += `  - Schwächster Monat: ${trendWarnings.seasonalPattern.lowMonth} (${trendWarnings.seasonalPattern.lowDecrease?.toFixed(0)}% vs. Durchschnitt)\n`;
        }
      }

      // ===== PRODUCT CORRELATION / CROSS-SELLING =====
      if (searchTerms.includesCrossSelling || searchTerms.includesProductCorrelation) {
        const productCorrelation = await fetchProductCorrelation(supabase, effectiveCompanyId, timeRange);
        searchResults.productCorrelation = productCorrelation;
        
        if (productCorrelation) {
          contextData += `\n\n🔗 PRODUKTKORRELATION & CROSS-SELLING (${timeRange.label}):\n`;
          
          if (productCorrelation.frequentlyBoughtTogether?.length > 0) {
            contextData += `\n🛒 Häufig zusammen gekauft:\n`;
            productCorrelation.frequentlyBoughtTogether.slice(0, 10).forEach((pair: any, i: number) => {
              contextData += `  ${i + 1}. "${pair.product1}" + "${pair.product2}": ${pair.count}x zusammen bestellt\n`;
            });
          }
          
          if (productCorrelation.categoryMix?.length > 0) {
            contextData += `\n📦 Kategorie-Mix in Bestellungen:\n`;
            productCorrelation.categoryMix.forEach((cat: any) => {
              contextData += `  - ${cat.category}: in ${cat.percentage?.toFixed(1)}% aller Bestellungen\n`;
            });
          }
          
          if (productCorrelation.avgItemsPerOrder) {
            contextData += `\n📊 Durchschnittl. Artikel pro Bestellung: ${productCorrelation.avgItemsPerOrder?.toFixed(2)}\n`;
          }
        }
      }

      // ===== STANDARD ORDER SEARCH =====
      if (searchTerms.includesOrder || searchTerms.orderNumber || searchTerms.customerName) {
        let orderQuery = supabase
          .from('orders')
          .select('id, source_no, external_document_no, status, order_date, ship_to_name, ship_to_city, ship_to_country, order_amount, tracking_code, tracking_link, customer_no')
          .eq('company_id', effectiveCompanyId);
        
        if (searchTerms.orderNumber) {
          orderQuery = orderQuery.or(`source_no.ilike.%${searchTerms.orderNumber}%,external_document_no.ilike.%${searchTerms.orderNumber}%`);
        }
        if (searchTerms.customerName) {
          orderQuery = orderQuery.ilike('ship_to_name', `%${searchTerms.customerName}%`);
        }
        if (searchTerms.status) {
          orderQuery = orderQuery.eq('status', searchTerms.status);
        }
        if (timeRange.startDate) {
          orderQuery = orderQuery.gte('order_date', timeRange.startDate);
        }
        if (timeRange.endDate) {
          orderQuery = orderQuery.lte('order_date', timeRange.endDate);
        }
        
        const { data: orders } = await orderQuery.order('created_at', { ascending: false }).limit(20);
        searchResults.orders = orders;
        
        if (orders && orders.length > 0) {
          contextData += `\n\nGEFUNDENE BESTELLUNGEN (${orders.length}):\n`;
          orders.forEach(o => {
            contextData += `- ${o.source_no}: Status=${o.status}, Datum=${o.order_date}, Kunde=${o.ship_to_name}`;
            if (o.ship_to_city) contextData += `, Stadt=${o.ship_to_city}`;
            if (o.ship_to_country) contextData += `, Land=${o.ship_to_country}`;
            contextData += `, Betrag=${o.order_amount}CHF`;
            if (o.tracking_code) contextData += `, Tracking=${o.tracking_code}`;
            if (o.tracking_link) contextData += `, Link=${o.tracking_link}`;
            contextData += '\n';
          });
        }
      }

      // ===== INVENTORY SEARCH =====
      const hasProductQuery = searchTerms.includesInventory || searchTerms.sku || searchTerms.productName || searchTerms.freeformSearch || searchTerms.lowStock;
      
      if (hasProductQuery) {
        const { data: allInventory } = await supabase
          .from('inventory')
          .select('sku, name, on_hand, reserved, available, low_stock_threshold')
          .eq('company_id', effectiveCompanyId);
        
        logger.debug('Inventory query result', { count: allInventory?.length || 0, lowStock: searchTerms.lowStock });
        
        let matchedInventory: any[] = [];
        const searchTermToUse = searchTerms.freeformSearch || searchTerms.productName || searchTerms.sku || '';
        
        if (searchTerms.lowStock && allInventory) {
          matchedInventory = allInventory.filter(i => {
            const available = i.available ?? (i.on_hand - i.reserved);
            return i.low_stock_threshold && available <= i.low_stock_threshold;
          });
        } else if (searchTermToUse && allInventory) {
          const searchLower = searchTermToUse.toLowerCase();
          matchedInventory = allInventory.filter(item => {
            const skuLower = (item.sku || '').toLowerCase();
            const nameLower = (item.name || '').toLowerCase();
            return skuLower.includes(searchLower) || 
                   nameLower.includes(searchLower) ||
                   searchLower.includes(skuLower.replace(/[^a-z0-9]/g, '')) ||
                   searchLower.includes(nameLower.replace(/[^a-z0-9]/g, ''));
          });
        } else if (allInventory) {
          matchedInventory = allInventory.slice(0, 30);
        }
        
        searchResults.inventory = matchedInventory;
        
        if (matchedInventory.length > 0) {
          contextData += `\n\nGEFUNDENE LAGERARTIKEL (${matchedInventory.length}):\n`;
          matchedInventory.forEach(i => {
            const available = i.available ?? (i.on_hand - i.reserved);
            contextData += `- ${i.sku} "${i.name}": Verfügbar=${available}, Reserviert=${i.reserved}, Gesamt=${i.on_hand}`;
            if (i.low_stock_threshold) {
              contextData += `, Schwellwert=${i.low_stock_threshold}`;
              if (available <= i.low_stock_threshold) contextData += ' ⚠️ NIEDRIG';
            }
            contextData += '\n';
          });
        } else if (searchTermToUse) {
          contextData += `\n\n⚠️ KEINE TREFFER für "${searchTermToUse}" im Lagerbestand gefunden.\n`;
        }
      }

      // ===== RETURNS SEARCH =====
      if (searchTerms.includesReturns && !searchTerms.includesReturnAnalysis) {
        let returnsQuery = supabase
          .from('returns')
          .select('id, status, return_date, reason, amount, order_id')
          .eq('company_id', effectiveCompanyId);
        
        if (searchTerms.status) {
          returnsQuery = returnsQuery.eq('status', searchTerms.status);
        }
        if (timeRange.startDate) {
          returnsQuery = returnsQuery.gte('return_date', timeRange.startDate);
        }
        
        const { data: returns } = await returnsQuery.order('created_at', { ascending: false }).limit(15);
        searchResults.returns = returns;
        
        if (returns && returns.length > 0) {
          contextData += `\n\nGEFUNDENE RETOUREN (${returns.length}):\n`;
          returns.forEach(r => {
            contextData += `- ID=${r.id.slice(0,8)}...: Status=${r.status}, Datum=${r.return_date}, Grund=${r.reason || 'k.A.'}, Betrag=${r.amount}CHF\n`;
          });
        }
      }

      // ===== KPI SEARCH =====
      if (searchTerms.includesKpi) {
        const { data: kpis } = await supabase
          .from('company_kpis')
          .select('id, name, target_value, unit, kpi_type, warning_threshold')
          .eq('company_id', effectiveCompanyId)
          .eq('is_active', true);

        const { data: measurements } = await supabase
          .from('kpi_measurements')
          .select('kpi_id, measured_value, period_end')
          .eq('company_id', effectiveCompanyId)
          .order('period_end', { ascending: false })
          .limit(20);

        if (kpis && kpis.length > 0) {
          contextData += `\n\nKPIs:\n`;
          kpis.forEach(k => {
            const latestMeasurement = measurements?.find(m => m.kpi_id === k.id);
            contextData += `- ${k.name}: Ziel=${k.target_value}${k.unit === 'percent' ? '%' : k.unit}`;
            if (latestMeasurement) {
              contextData += `, Aktuell=${latestMeasurement.measured_value.toFixed(1)}${k.unit === 'percent' ? '%' : k.unit}`;
            }
            contextData += '\n';
          });
        }
      }

      // ===== GENERAL OVERVIEW =====
      if (!contextData) {
        const { data: orders, count: orderCount } = await supabase
          .from('orders')
          .select('id, source_no, status, order_date, ship_to_name, order_amount', { count: 'exact' })
          .eq('company_id', effectiveCompanyId)
          .order('created_at', { ascending: false })
          .limit(10);

        const { data: inventory } = await supabase
          .from('inventory')
          .select('sku, name, on_hand, reserved, available, low_stock_threshold')
          .eq('company_id', effectiveCompanyId)
          .limit(20);

        const { count: returnCount } = await supabase
          .from('returns')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', effectiveCompanyId);

        contextData = `
ÜBERSICHT FÜR ${companyName}:

BESTELLUNGEN (letzte 10 von ${orderCount || 0} gesamt):
${orders?.map(o => `- ${o.source_no}: Status=${o.status}, Datum=${o.order_date}, Kunde=${o.ship_to_name}, Betrag=${o.order_amount}CHF`).join('\n') || 'Keine Bestellungen'}

LAGERBESTAND (${inventory?.length || 0} Artikel):
${inventory?.slice(0, 10).map(i => {
  const available = i.available ?? (i.on_hand - i.reserved);
  return `- ${i.sku} (${i.name}): Verfügbar=${available}, Reserviert=${i.reserved}`;
}).join('\n') || 'Keine Inventardaten'}

RETOUREN: ${returnCount || 0} gesamt
`;
      }
    }

    // Language-specific system prompts - Enhanced with analysis capabilities
    const systemPrompts: Record<string, string> = {
      de: `Du bist der MS Direct Fulfillment Hub AI-Assistent - ein spezialisierter Assistent für **Fulfillment-Operationen und Lagerlogistik**. 
${companyName ? `Du arbeitest aktuell mit Daten von: **${companyName}**` : ''}

DEIN FOKUS: FULFILLMENT & LAGERLOGISTIK
Du analysierst Daten, die Kunden NICHT in ihrem Shop-System (Shopify/WooCommerce) haben:

1. **Durchlaufzeiten**: Pick → Pack → Ship Zeiten, Engpässe erkennen
2. **SLA-Performance**: On-Time Delivery, At-Risk Bestellungen, Verspätungen
3. **Wareneingang (Inbound)**: Purchase Orders, Dock-to-Stock Zeit, offene Lieferungen
4. **Warehouse-Effizienz**: Orders/Stunde, Units/Stunde, Rückstau
5. **Qualität**: Fehlerquoten, Diskrepanzen, Short Picks, Nacharbeit
6. **Versand-Performance**: Nach Carrier, Lieferzeiten, Tracking

SEKUNDÄR (ergänzend zu Shop-Daten):
- Lagerbestände und Verfügbarkeit
- Retouren-Bearbeitung im Warehouse
- Artikel mit Fulfillment-Problemen

FULFILLMENT-SPEZIFISCHE FRAGEN die ich verstehe:
- "Wie lange dauert Pick to Ship?" → Durchlaufzeiten
- "Wie ist unsere SLA-Performance?" → On-Time Delivery Rate
- "Welche Bestellungen sind at-risk?" → SLA-Gefährdung
- "Was ist der aktuelle Rückstau?" → Backlog, Pipeline
- "Zeige Wareneingang-Status" → Purchase Orders, Receiving
- "Wie ist die Fehlerquote?" → Quality Metrics
- "Welcher Carrier ist am schnellsten?" → Shipping Performance

ZEIT-KEYWORDS:
- "letzte Woche", "letzte 7 Tage", "heute"
- "letzter Monat", "letzte 30 Tage"
- "dieses Jahr", "letzte 12 Monate"

REPORT-FORMATE:
- **Executive Summary**: 2-3 Sätze Zusammenfassung
- **Key Metrics**: Wichtigste Zahlen auf einen Blick
- **Detailanalyse**: Tiefere Einblicke
- **Empfehlungen**: Konkrete Optimierungen

WICHTIGE REGELN:
- Antworte IMMER auf Deutsch
- Fokus auf Fulfillment-Metriken, nicht auf Sales/Marketing
- Formatiere mit Markdown (### Überschriften, **fett**, Listen)
- Erfinde NIEMALS Daten - wenn Daten fehlen, sag es!
- Gib konkrete Empfehlungen zur Prozessoptimierung`,
      en: `You are the MS Direct Fulfillment Hub AI assistant - a specialized assistant for **Fulfillment Operations and Warehouse Logistics**.
${companyName ? `You are currently working with data from: **${companyName}**` : ''}

YOUR FOCUS: FULFILLMENT & WAREHOUSE LOGISTICS
You analyze data that customers DON'T have in their shop system (Shopify/WooCommerce):

1. **Processing Times**: Pick → Pack → Ship times, identify bottlenecks
2. **SLA Performance**: On-Time Delivery, At-Risk orders, delays
3. **Inbound/Receiving**: Purchase Orders, Dock-to-Stock time, pending deliveries
4. **Warehouse Efficiency**: Orders/hour, Units/hour, backlog
5. **Quality**: Error rates, discrepancies, short picks, rework
6. **Shipping Performance**: By carrier, delivery times, tracking

SECONDARY (complementing shop data):
- Inventory and availability
- Returns processing in warehouse
- Items with fulfillment issues

IMPORTANT RULES:
- ALWAYS respond in English
- Focus on fulfillment metrics, not sales/marketing
- Format with Markdown (### headers, **bold**, lists)
- NEVER invent data - if data is missing, say so!
- Provide concrete recommendations for process optimization`,
      fr: `Vous êtes l'assistant IA MS Direct Fulfillment Hub - un assistant spécialisé pour les **Opérations Fulfillment et Logistique d'Entrepôt**.
${companyName ? `Vous travaillez actuellement avec les données de: **${companyName}**` : ''}

VOTRE FOCUS: FULFILLMENT & LOGISTIQUE
Analysez les données que les clients N'ONT PAS dans leur système boutique.

RÈGLES IMPORTANTES:
- Répondez TOUJOURS en français
- Focus sur les métriques fulfillment
- N'inventez JAMAIS de données!`,
      it: `Sei l'assistente AI MS Direct Fulfillment Hub - un assistente specializzato per **Operazioni Fulfillment e Logistica di Magazzino**.
${companyName ? `Stai lavorando con i dati di: **${companyName}**` : ''}

IL TUO FOCUS: FULFILLMENT & LOGISTICA
Analizzi i dati che i clienti NON hanno nel loro sistema shop.

REGOLE IMPORTANTI:
- Rispondi SEMPRE in italiano
- Focus sulle metriche fulfillment
- Non inventare MAI dati!`,
      es: `Eres el asistente de IA MS Direct Fulfillment Hub - un asistente especializado para **Operaciones de Fulfillment y Logística de Almacén**.
${companyName ? `Estás trabajando con datos de: **${companyName}**` : ''}

TU ENFOQUE: FULFILLMENT & LOGÍSTICA
Analizas datos que los clientes NO tienen en su sistema de tienda.

REGLAS IMPORTANTES:
- Responde SIEMPRE en español
- Enfócate en métricas de fulfillment
- ¡NUNCA inventes datos!`,
    };
    
    const systemPrompt = (systemPrompts[language] || systemPrompts.en) + `\n\nAKTUELLE DATEN AUS DER DATENBANK:\n${contextData}`;

    logger.debug('Sending request to AI');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('AI Gateway error', new Error(errorText), { status: response.status });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit erreicht. Bitte warte einen Moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI-Fehler aufgetreten' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    logger.error('Fulfillment AI failed', error instanceof Error ? error : new Error(String(error)));
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ===== HELPER FUNCTIONS =====

interface TimeRange {
  startDate: string | null;
  endDate: string | null;
  label: string;
  previousStart?: string;
  previousEnd?: string;
}

function parseTimeRange(query: string): TimeRange {
  const lowerQuery = query.toLowerCase();
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Last 7 days / this week / last week
  if (lowerQuery.includes('letzte 7 tage') || lowerQuery.includes('last 7 days') || lowerQuery.includes('diese woche') || lowerQuery.includes('this week')) {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: today,
      label: 'Letzte 7 Tage',
      previousStart: prevStart.toISOString().split('T')[0],
      previousEnd: start.toISOString().split('T')[0],
    };
  }
  
  if (lowerQuery.includes('letzte woche') || lowerQuery.includes('last week') || lowerQuery.includes('vorige woche')) {
    const start = new Date(now);
    start.setDate(start.getDate() - 14);
    const end = new Date(now);
    end.setDate(end.getDate() - 7);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      label: 'Letzte Woche',
    };
  }
  
  // Last 30 days / this month / last month
  if (lowerQuery.includes('letzte 30 tage') || lowerQuery.includes('last 30 days') || lowerQuery.includes('dieser monat') || lowerQuery.includes('this month')) {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 30);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: today,
      label: 'Letzte 30 Tage',
      previousStart: prevStart.toISOString().split('T')[0],
      previousEnd: start.toISOString().split('T')[0],
    };
  }
  
  if (lowerQuery.includes('letzter monat') || lowerQuery.includes('last month') || lowerQuery.includes('voriger monat')) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      label: 'Letzter Monat',
    };
  }
  
  // This year / last year / last 12 months
  if (lowerQuery.includes('dieses jahr') || lowerQuery.includes('this year') || lowerQuery.includes('letzte 12 monate') || lowerQuery.includes('last 12 months')) {
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: today,
      label: 'Letzte 12 Monate',
    };
  }
  
  if (lowerQuery.includes('letztes jahr') || lowerQuery.includes('last year') || lowerQuery.includes('voriges jahr')) {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() - 1, 11, 31);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      label: 'Letztes Jahr',
    };
  }
  
  // Today / yesterday
  if (lowerQuery.includes('heute') || lowerQuery.includes('today')) {
    return { startDate: today, endDate: today, label: 'Heute' };
  }
  
  if (lowerQuery.includes('gestern') || lowerQuery.includes('yesterday')) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yDate = yesterday.toISOString().split('T')[0];
    return { startDate: yDate, endDate: yDate, label: 'Gestern' };
  }
  
  // Default: last 30 days
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: today,
    label: 'Letzte 30 Tage',
  };
}

async function fetchOrderAnalytics(supabase: any, companyId: string, timeRange: TimeRange) {
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, order_amount, order_date')
    .eq('company_id', companyId)
    .gte('order_date', timeRange.startDate)
    .lte('order_date', timeRange.endDate);
  
  if (!orders || orders.length === 0) return null;
  
  const totalOrders = orders.length;
  const totalValue = orders.reduce((sum: number, o: any) => sum + (o.order_amount || 0), 0);
  const avgOrderValue = totalValue / totalOrders;
  
  const byStatus: Record<string, number> = {};
  orders.forEach((o: any) => {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  });
  
  const shippedOrders = (byStatus['shipped'] || 0) + (byStatus['delivered'] || 0);
  const pendingOrders = totalOrders - shippedOrders;
  
  // Calculate trend if previous period available
  let trend: number | undefined;
  if (timeRange.previousStart && timeRange.previousEnd) {
    const { data: prevOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('company_id', companyId)
      .gte('order_date', timeRange.previousStart)
      .lte('order_date', timeRange.previousEnd);
    
    if (prevOrders && prevOrders.length > 0) {
      trend = ((totalOrders - prevOrders.length) / prevOrders.length) * 100;
    }
  }
  
  return {
    periodStart: timeRange.startDate,
    periodEnd: timeRange.endDate,
    totalOrders,
    totalValue,
    avgOrderValue,
    shippedOrders,
    shippedPercent: (shippedOrders / totalOrders) * 100,
    pendingOrders,
    byStatus,
    trend,
  };
}

async function fetchArticleAnalytics(supabase: any, companyId: string, timeRange: TimeRange) {
  // Get order lines with order info
  const { data: orderLines } = await supabase
    .from('order_lines')
    .select('sku, name, quantity, price, order_id, orders!inner(company_id, order_date)')
    .eq('orders.company_id', companyId)
    .gte('orders.order_date', timeRange.startDate)
    .lte('orders.order_date', timeRange.endDate);
  
  if (!orderLines || orderLines.length === 0) return null;
  
  // Aggregate by SKU
  const articleMap = new Map<string, { sku: string; name: string; totalQty: number; totalValue: number; returnedQty: number }>();
  
  orderLines.forEach((line: any) => {
    const existing = articleMap.get(line.sku) || { sku: line.sku, name: line.name, totalQty: 0, totalValue: 0, returnedQty: 0 };
    existing.totalQty += line.quantity || 0;
    existing.totalValue += (line.quantity || 0) * (line.price || 0);
    articleMap.set(line.sku, existing);
  });
  
  // Get return lines data
  const { data: returnLines } = await supabase
    .from('return_lines')
    .select('sku, quantity, returns!inner(company_id, return_date)')
    .eq('returns.company_id', companyId)
    .gte('returns.return_date', timeRange.startDate);
  
  if (returnLines) {
    returnLines.forEach((line: any) => {
      const existing = articleMap.get(line.sku);
      if (existing) {
        existing.returnedQty += line.quantity || 0;
      }
    });
  }
  
  // Convert to array and calculate return rates
  const articles = Array.from(articleMap.values()).map(a => ({
    ...a,
    returnRate: a.totalQty > 0 ? (a.returnedQty / a.totalQty) * 100 : 0,
    soldQty: a.totalQty,
  }));
  
  // Sort by total quantity for top sellers
  const topSellers = [...articles].sort((a, b) => b.totalQty - a.totalQty).slice(0, 10);
  
  // Filter high return rate articles (>10%)
  const highReturnArticles = articles.filter(a => a.returnRate > 10 && a.totalQty >= 5).sort((a, b) => b.returnRate - a.returnRate).slice(0, 5);
  
  return {
    totalArticles: articles.length,
    topSellers,
    highReturnArticles,
  };
}

async function fetchGeoAnalytics(supabase: any, companyId: string, timeRange: TimeRange, searchTerms: any) {
  let query = supabase
    .from('orders')
    .select('id, ship_to_country, ship_to_city, order_amount')
    .eq('company_id', companyId)
    .gte('order_date', timeRange.startDate)
    .lte('order_date', timeRange.endDate);
  
  if (searchTerms.country) {
    query = query.ilike('ship_to_country', `%${searchTerms.country}%`);
  }
  if (searchTerms.city) {
    query = query.ilike('ship_to_city', `%${searchTerms.city}%`);
  }
  
  const { data: orders } = await query;
  
  if (!orders || orders.length === 0) return null;
  
  // Aggregate by country
  const countryMap = new Map<string, { country: string; orderCount: number; totalValue: number }>();
  const cityMap = new Map<string, { city: string; country: string; orderCount: number }>();
  
  orders.forEach((o: any) => {
    const country = o.ship_to_country || 'Unbekannt';
    const city = o.ship_to_city || 'Unbekannt';
    
    const countryData = countryMap.get(country) || { country, orderCount: 0, totalValue: 0 };
    countryData.orderCount++;
    countryData.totalValue += o.order_amount || 0;
    countryMap.set(country, countryData);
    
    const cityKey = `${city}-${country}`;
    const cityData = cityMap.get(cityKey) || { city, country, orderCount: 0 };
    cityData.orderCount++;
    cityMap.set(cityKey, cityData);
  });
  
  const byCountry = Array.from(countryMap.values()).sort((a, b) => b.orderCount - a.orderCount);
  const byCity = Array.from(cityMap.values()).sort((a, b) => b.orderCount - a.orderCount);
  
  return { byCountry, byCity };
}

async function fetchReturnAnalytics(supabase: any, companyId: string, timeRange: TimeRange) {
  // Get returns from returns table
  const { data: returns } = await supabase
    .from('returns')
    .select('id, status, amount, reason, return_date')
    .eq('company_id', companyId)
    .gte('return_date', timeRange.startDate);
  
  // Get total orders for return rate calculation
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('order_date', timeRange.startDate)
    .lte('order_date', timeRange.endDate);
  
  const totalReturns = returns?.length || 0;
  const totalValue = returns?.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) || 0;
  const returnRate = totalOrders ? (totalReturns / totalOrders) * 100 : 0;
  
  // By status
  const byStatus: Record<string, number> = {};
  returns?.forEach((r: any) => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  });
  
  // By reason
  const reasonMap = new Map<string, number>();
  returns?.forEach((r: any) => {
    const reason = r.reason || 'Kein Grund angegeben';
    reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
  });
  const byReason = Array.from(reasonMap.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  
  // Trend calculation
  let trend: number | undefined;
  if (timeRange.previousStart && timeRange.previousEnd) {
    const { count: prevReturns } = await supabase
      .from('returns')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('return_date', timeRange.previousStart)
      .lte('return_date', timeRange.previousEnd);
    
    if (prevReturns && prevReturns > 0) {
      trend = ((totalReturns - prevReturns) / prevReturns) * 100;
    }
  }
  
  return {
    totalReturns,
    totalValue,
    returnRate,
    byStatus,
    byReason,
    trend,
  };
}

// ===== FULFILLMENT-SPECIFIC ANALYTICS =====

async function fetchFulfillmentAnalytics(supabase: any, companyId: string, timeRange: TimeRange) {
  // Get orders with status transitions for processing time analysis
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, order_date, posted_shipment_date, shipping_agent_code, created_at, updated_at')
    .eq('company_id', companyId)
    .gte('order_date', timeRange.startDate)
    .lte('order_date', timeRange.endDate);
  
  if (!orders || orders.length === 0) return null;
  
  // Calculate processing times for shipped orders
  const shippedOrders = orders.filter((o: any) => o.posted_shipment_date && o.order_date);
  const processingHours: number[] = [];
  
  shippedOrders.forEach((o: any) => {
    const orderDate = new Date(o.order_date);
    const shipDate = new Date(o.posted_shipment_date);
    const hours = (shipDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    if (hours > 0 && hours < 720) { // Filter outliers (max 30 days)
      processingHours.push(hours);
    }
  });
  
  const processingTimes = processingHours.length > 0 ? {
    avgTotalHours: processingHours.reduce((a, b) => a + b, 0) / processingHours.length,
    fastestHours: Math.min(...processingHours),
    slowestHours: Math.max(...processingHours),
    avgPickHours: undefined, // Would need order_events data
    avgPackHours: undefined,
  } : undefined;
  
  // SLA Performance (assuming 48h SLA for simplicity)
  const SLA_HOURS = 48;
  const onTime = processingHours.filter(h => h <= SLA_HOURS).length;
  const late = processingHours.filter(h => h > SLA_HOURS).length;
  
  // At-risk: orders in progress for >24 hours
  const pendingOrders = orders.filter((o: any) => !o.posted_shipment_date);
  const now = Date.now();
  const atRisk = pendingOrders.filter((o: any) => {
    const orderDate = new Date(o.order_date);
    const hoursAgo = (now - orderDate.getTime()) / (1000 * 60 * 60);
    return hoursAgo > 24 && hoursAgo <= SLA_HOURS;
  }).length;
  
  const slaPerformance = {
    total: shippedOrders.length,
    onTime,
    onTimePercent: shippedOrders.length > 0 ? (onTime / shippedOrders.length) * 100 : 0,
    late,
    atRisk,
  };
  
  // By status
  const byStatus: Record<string, number> = {};
  orders.forEach((o: any) => {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  });
  
  // By shipping agent
  const agentMap = new Map<string, { name: string; count: number; totalDays: number }>();
  shippedOrders.forEach((o: any) => {
    const agent = o.shipping_agent_code || 'Unbekannt';
    const existing = agentMap.get(agent) || { name: agent, count: 0, totalDays: 0 };
    existing.count++;
    const orderDate = new Date(o.order_date);
    const shipDate = new Date(o.posted_shipment_date);
    existing.totalDays += (shipDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
    agentMap.set(agent, existing);
  });
  
  const byShippingAgent = Array.from(agentMap.values()).map(a => ({
    ...a,
    avgDeliveryDays: a.count > 0 ? a.totalDays / a.count : 0,
  })).sort((a, b) => b.count - a.count);
  
  return {
    processingTimes,
    slaPerformance,
    byStatus,
    byShippingAgent,
  };
}

async function fetchInboundAnalytics(supabase: any, companyId: string, timeRange: TimeRange) {
  // Get purchase orders
  const { data: purchaseOrders } = await supabase
    .from('purchase_orders')
    .select('id, po_number, supplier_name, status, eta, arrival_date, created_at')
    .eq('company_id', companyId)
    .gte('created_at', timeRange.startDate);
  
  if (!purchaseOrders) return null;
  
  // By status
  const byStatus: Record<string, number> = {};
  purchaseOrders.forEach((po: any) => {
    byStatus[po.status] = (byStatus[po.status] || 0) + 1;
  });
  
  // Pending POs
  const pendingStatuses = ['draft', 'submitted', 'confirmed', 'in_transit', 'arrived', 'receiving'];
  const pendingPOs = purchaseOrders.filter((po: any) => pendingStatuses.includes(po.status));
  
  // Get received items count
  const { data: poLines } = await supabase
    .from('purchase_order_lines')
    .select('qty_received, po_id')
    .in('po_id', purchaseOrders.map((po: any) => po.id));
  
  const totalItemsReceived = poLines?.reduce((sum: number, line: any) => sum + (line.qty_received || 0), 0) || 0;
  
  // Calculate dock-to-stock time (arrival to completed)
  const completedPOs = purchaseOrders.filter((po: any) => po.status === 'completed' && po.arrival_date);
  let avgDockToStock: number | undefined;
  
  if (completedPOs.length > 0) {
    // Would need receiving_sessions data for accurate calculation
    avgDockToStock = undefined;
  }
  
  return {
    totalPOs: purchaseOrders.length,
    totalItemsReceived,
    byStatus,
    pendingPOs: pendingPOs.slice(0, 5),
    avgDockToStock,
  };
}

async function fetchProductivityMetrics(supabase: any, companyId: string, timeRange: TimeRange) {
  // Get latest productivity metrics
  const { data: metrics } = await supabase
    .from('productivity_metrics')
    .select('orders_per_hour, units_per_hour, pack_throughput, backlog_orders, recorded_at')
    .eq('company_id', companyId)
    .gte('recorded_at', timeRange.startDate)
    .order('recorded_at', { ascending: false })
    .limit(1);
  
  if (metrics && metrics.length > 0) {
    return {
      ordersPerHour: metrics[0].orders_per_hour,
      unitsPerHour: metrics[0].units_per_hour,
      packThroughput: metrics[0].pack_throughput,
      backlogOrders: metrics[0].backlog_orders,
      recordedAt: metrics[0].recorded_at,
    };
  }
  
  // Calculate from orders if no metrics available
  const { data: orders } = await supabase
    .from('orders')
    .select('id, status')
    .eq('company_id', companyId)
    .gte('order_date', timeRange.startDate);
  
  if (orders) {
    const pendingStatuses = ['received', 'picking', 'packing', 'ready_to_ship'];
    const backlogOrders = orders.filter((o: any) => pendingStatuses.includes(o.status)).length;
    return { backlogOrders };
  }
  
  return null;
}

async function fetchQualityMetrics(supabase: any, companyId: string, timeRange: TimeRange) {
  // Get quality metrics
  const { data: metrics } = await supabase
    .from('quality_metrics')
    .select('error_rate, return_rate, short_picks, rework_rate, recorded_date')
    .eq('company_id', companyId)
    .gte('recorded_date', timeRange.startDate)
    .order('recorded_date', { ascending: false })
    .limit(1);
  
  // Get discrepancies
  const { data: discrepancies } = await supabase
    .from('discrepancies')
    .select('type, severity')
    .eq('company_id', companyId)
    .gte('created_at', timeRange.startDate);
  
  // Aggregate discrepancies by type
  const discrepancyMap = new Map<string, number>();
  discrepancies?.forEach((d: any) => {
    discrepancyMap.set(d.type, (discrepancyMap.get(d.type) || 0) + 1);
  });
  const discrepancyList = Array.from(discrepancyMap.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  
  if (metrics && metrics.length > 0) {
    return {
      errorRate: metrics[0].error_rate,
      returnRate: metrics[0].return_rate,
      shortPicks: metrics[0].short_picks,
      reworkRate: metrics[0].rework_rate,
      discrepancies: discrepancyList,
    };
  }
  
  // Calculate return rate from data if no metrics
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('order_date', timeRange.startDate);
  
  const { count: totalReturns } = await supabase
    .from('returns')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('return_date', timeRange.startDate);
  
  return {
    returnRate: totalOrders ? ((totalReturns || 0) / totalOrders) * 100 : undefined,
    discrepancies: discrepancyList,
  };
}

async function fetchProactiveInsights(supabase: any, companyId: string) {
  const insights: any = { hasIssues: false };
  
  // Find stuck orders (in same status for more than 2 days)
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  
  const { data: stuckOrders } = await supabase
    .from('orders')
    .select('id, source_no, status, status_date, updated_at')
    .eq('company_id', companyId)
    .in('status', ['received', 'picking', 'packing', 'ready_to_ship'])
    .lt('updated_at', twoDaysAgo.toISOString())
    .limit(10);
  
  if (stuckOrders && stuckOrders.length > 0) {
    insights.stuckOrders = stuckOrders.map((o: any) => ({
      ...o,
      daysInStatus: Math.floor((Date.now() - new Date(o.updated_at).getTime()) / (1000 * 60 * 60 * 24)),
    }));
    insights.hasIssues = true;
  }
  
  // Find low stock items
  const { data: lowStockItems } = await supabase
    .from('inventory')
    .select('sku, name, on_hand, reserved, available, low_stock_threshold')
    .eq('company_id', companyId)
    .not('low_stock_threshold', 'is', null)
    .limit(50);
  
  if (lowStockItems) {
    const criticalItems = lowStockItems.filter((i: any) => {
      const available = i.available ?? (i.on_hand - i.reserved);
      return available <= i.low_stock_threshold;
    });
    
    if (criticalItems.length > 0) {
      insights.lowStockItems = criticalItems.map((i: any) => ({
        ...i,
        available: i.available ?? (i.on_hand - i.reserved),
      })).slice(0, 10);
      insights.hasIssues = true;
    }
  }
  
  // Check pending returns
  const { count: pendingReturns } = await supabase
    .from('returns')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .in('status', ['initiated', 'in_transit', 'received', 'processing']);
  
  if (pendingReturns && pendingReturns > 0) {
    insights.pendingReturns = pendingReturns;
    insights.hasIssues = true;
  }
  
  // Check return rate (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { count: recentOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('order_date', thirtyDaysAgo.toISOString().split('T')[0]);
  
  const { count: recentReturns } = await supabase
    .from('returns')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('return_date', thirtyDaysAgo.toISOString().split('T')[0]);
  
  if (recentOrders && recentOrders > 10 && recentReturns) {
    const returnRate = (recentReturns / recentOrders) * 100;
    if (returnRate > 20) { // Alert if return rate > 20%
      insights.highReturnRate = true;
      insights.returnRate = returnRate;
      insights.hasIssues = true;
    }
  }
  
  return insights;
}

function extractSearchTerms(query: string) {
  const lowerQuery = query.toLowerCase();
  
  const orderNumberMatch = query.match(/(?:bestellung|order|auftrag|nr\.?|nummer|#)\s*[:\s]?\s*([A-Za-z0-9-]+)/i) 
    || query.match(/\b([A-Z]{2,3}[-]?\d{4,})\b/i)
    || query.match(/\b(\d{5,})\b/);
  
  const customerMatch = query.match(/(?:von|für|kunde|customer|an)\s+([A-ZÄÖÜa-zäöü]+(?:\s+[A-ZÄÖÜa-zäöü]+)?)/i);
  
  const skuMatch = query.match(/(?:sku|artikel|artikelnummer|product)\s*[:\s]?\s*([A-Za-z0-9-]+)/i)
    || query.match(/\b([A-Z]{2,}\d{3,}[A-Z0-9]*)\b/);
  
  const productMatch = query.match(/(?:produkt|artikel|item)\s+["']?([^"'\n]+)["']?/i);

  // Geographic keywords
  const countryMatch = query.match(/(?:nach|in|aus|country|land)\s+([A-ZÄÖÜa-zäöü]+)/i);
  const cityMatch = query.match(/(?:stadt|city|ort)\s+([A-ZÄÖÜa-zäöü]+)/i);
  
  const stockKeywords = ['lager', 'bestand', 'stock', 'vorrätig', 'verfügbar', 'an lager', 'auf lager', 'haben', 'gibt', 'noch', 'da'];
  const hasStockQuestion = stockKeywords.some(kw => lowerQuery.includes(kw));
  
  const commonWords = ['der', 'die', 'das', 'ein', 'eine', 'ist', 'sind', 'hat', 'haben', 'wird', 'werden', 'kann', 'können', 
    'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'mir', 'mich', 'dir', 'dich',
    'und', 'oder', 'aber', 'wenn', 'weil', 'dass', 'ob', 'wie', 'was', 'wer', 'wo', 'wann',
    'zu', 'bei', 'von', 'mit', 'für', 'auf', 'in', 'an', 'aus', 'nach', 'über', 'unter',
    'ja', 'nein', 'nicht', 'noch', 'schon', 'auch', 'nur', 'sehr', 'viel', 'mehr', 'weniger',
    'heute', 'gestern', 'morgen', 'jetzt', 'bitte', 'danke', 'hallo', 'hi', 'hey',
    'lager', 'bestand', 'stock', 'vorrätig', 'verfügbar', 'gibt', 'haben', 'habt', 'ihr'];
  
  let freeformSearch: string | undefined;
  if (hasStockQuestion && !skuMatch && !productMatch) {
    const words = query.split(/\s+/).filter(w => 
      w.length > 2 && 
      !commonWords.includes(w.toLowerCase()) &&
      !/^\d+$/.test(w)
    );
    const productCandidate = words.find(w => /^[A-ZÄÖÜ]/.test(w) && w.length > 2) || words[0];
    if (productCandidate) {
      freeformSearch = productCandidate;
    }
  }

  let status: string | null = null;
  if (lowerQuery.includes('offen') || lowerQuery.includes('neu') || lowerQuery.includes('eingegangen')) {
    status = 'received';
  } else if (lowerQuery.includes('versendet') || lowerQuery.includes('shipped') || lowerQuery.includes('unterwegs')) {
    status = 'shipped';
  } else if (lowerQuery.includes('geliefert') || lowerQuery.includes('delivered') || lowerQuery.includes('zugestellt')) {
    status = 'delivered';
  } else if (lowerQuery.includes('picking') || lowerQuery.includes('kommission')) {
    status = 'picking';
  } else if (lowerQuery.includes('packing') || lowerQuery.includes('verpack')) {
    status = 'packing';
  }

  // Time/Trend analysis keywords
  const trendKeywords = ['trend', 'entwicklung', 'verlauf', 'vergleich', 'statistik', 'analyse', 'analytics'];
  const includesTrend = trendKeywords.some(kw => lowerQuery.includes(kw));
  
  const timeKeywords = ['woche', 'monat', 'jahr', 'heute', 'gestern', 'tage', 'week', 'month', 'year', 'today', 'yesterday', 'days'];
  const includesTimeAnalysis = timeKeywords.some(kw => lowerQuery.includes(kw)) && (
    lowerQuery.includes('wie viel') || lowerQuery.includes('anzahl') || lowerQuery.includes('how many') ||
    lowerQuery.includes('zeige') || lowerQuery.includes('show') || lowerQuery.includes('übersicht')
  );
  
  // Article analysis keywords
  const articleAnalysisKeywords = ['top artikel', 'bestseller', 'meistverkauft', 'beliebteste', 'häufigsten', 'zusammen bestellt', 'cross-selling'];
  const includesArticleAnalysis = articleAnalysisKeywords.some(kw => lowerQuery.includes(kw));
  const includesTopArticles = lowerQuery.includes('top') && (lowerQuery.includes('artikel') || lowerQuery.includes('produkt') || lowerQuery.includes('sku'));
  
  // Geographic keywords
  const geoKeywords = ['land', 'länder', 'stadt', 'städte', 'region', 'country', 'city', 'geograph', 'wohin', 'lieferung nach', 'schweiz', 'deutschland', 'österreich'];
  const includesGeo = geoKeywords.some(kw => lowerQuery.includes(kw));
  
  // Return analysis
  const returnAnalysisKeywords = ['retourenquote', 'retourenanalyse', 'return rate', 'rückgabequote', 'warum retour'];
  const includesReturnAnalysis = returnAnalysisKeywords.some(kw => lowerQuery.includes(kw)) || 
    (lowerQuery.includes('retour') && (lowerQuery.includes('analyse') || lowerQuery.includes('quote') || lowerQuery.includes('warum')));
  
  // Proactive insights
  const proactiveKeywords = ['probleme', 'issues', 'warnungen', 'alerts', 'kritisch', 'aufpassen', 'achtung'];
  const includesProactive = proactiveKeywords.some(kw => lowerQuery.includes(kw));
  
  // Fulfillment-specific keywords
  const fulfillmentKeywords = ['fulfillment', 'durchlaufzeit', 'processing time', 'abwicklung', 'bearbeitung', 'pick', 'pack', 'ship', 'versandzeit'];
  const includesFulfillment = fulfillmentKeywords.some(kw => lowerQuery.includes(kw));
  
  const processingTimeKeywords = ['durchlaufzeit', 'processing', 'bearbeitungszeit', 'wie lange', 'dauer', 'schnell'];
  const includesProcessingTime = processingTimeKeywords.some(kw => lowerQuery.includes(kw));
  
  const slaKeywords = ['sla', 'service level', 'on-time', 'pünktlich', 'verspätet', 'late', 'at-risk', 'lieferzeit'];
  const includesSLA = slaKeywords.some(kw => lowerQuery.includes(kw));
  
  // Inbound/Warehouse receiving
  const inboundKeywords = ['wareneingang', 'inbound', 'receiving', 'po', 'purchase order', 'lieferung', 'anlieferung', 'dock', 'eingang'];
  const includesInbound = inboundKeywords.some(kw => lowerQuery.includes(kw));
  const includesPO = lowerQuery.includes('po ') || lowerQuery.includes('purchase order') || lowerQuery.includes('bestellung von lieferant');
  
  // Productivity
  const productivityKeywords = ['produktivität', 'productivity', 'effizienz', 'efficiency', 'durchsatz', 'throughput', 'orders pro stunde', 'units pro stunde'];
  const includesProductivity = productivityKeywords.some(kw => lowerQuery.includes(kw));
  const includesEfficiency = lowerQuery.includes('effizienz') || lowerQuery.includes('efficiency');
  
  // Quality
  const qualityKeywords = ['qualität', 'quality', 'fehler', 'error', 'diskrepanz', 'discrepancy', 'short pick', 'nacharbeit', 'rework'];
  const includesQuality = qualityKeywords.some(kw => lowerQuery.includes(kw));
  const includesErrors = lowerQuery.includes('fehler') || lowerQuery.includes('error') || lowerQuery.includes('problem');
  
  // Customer Segmentation & Analysis
  const customerAnalysisKeywords = ['kunde', 'kunden', 'customer', 'segment', 'segmentierung', 'clv', 'lifetime value', 'kundenwert'];
  const includesCustomerAnalysis = customerAnalysisKeywords.some(kw => lowerQuery.includes(kw));
  const includesVIP = lowerQuery.includes('vip') || lowerQuery.includes('top kunden') || lowerQuery.includes('beste kunden') || lowerQuery.includes('wichtigste kunden');
  const includesChurn = lowerQuery.includes('churn') || lowerQuery.includes('abwanderung') || lowerQuery.includes('inaktiv') || lowerQuery.includes('verloren');
  
  // Trend Warnings & Anomalies
  const trendWarningKeywords = ['warnung', 'warning', 'anomalie', 'anomaly', 'ungewöhnlich', 'auffällig', 'trend', 'entwicklung'];
  const includesTrendWarnings = trendWarningKeywords.some(kw => lowerQuery.includes(kw)) && 
    (lowerQuery.includes('aov') || lowerQuery.includes('bestellwert') || lowerQuery.includes('umsatz') || lowerQuery.includes('saison'));
  const includesAnomalies = lowerQuery.includes('anomalie') || lowerQuery.includes('anomaly') || lowerQuery.includes('ausreisser') || lowerQuery.includes('ungewöhnlich');
  
  // Cross-Selling & Product Correlation
  const crossSellingKeywords = ['cross-sell', 'cross sell', 'upsell', 'zusammen gekauft', 'gemeinsam bestellt', 'korrelation', 'kombination'];
  const includesCrossSelling = crossSellingKeywords.some(kw => lowerQuery.includes(kw));
  const includesProductCorrelation = lowerQuery.includes('korrelation') || lowerQuery.includes('zusammenhang') || 
    (lowerQuery.includes('produkt') && lowerQuery.includes('kombination'));
  
  // Shipping-related keywords should also trigger order search
  const hasShippingKeywords = lowerQuery.includes('versendet') || lowerQuery.includes('versand') || 
    lowerQuery.includes('shipped') || lowerQuery.includes('lieferung') || lowerQuery.includes('geliefert') ||
    lowerQuery.includes('tracking') || lowerQuery.includes('zugestellt');
  
  return {
    orderNumber: orderNumberMatch?.[1],
    customerName: customerMatch?.[1],
    sku: skuMatch?.[1],
    productName: productMatch?.[1],
    freeformSearch,
    status,
    country: countryMatch?.[1],
    city: cityMatch?.[1],
    includesOrder: lowerQuery.includes('bestellung') || lowerQuery.includes('order') || lowerQuery.includes('auftrag') || 
                   !!orderNumberMatch || hasShippingKeywords,
    includesInventory: lowerQuery.includes('lager') || lowerQuery.includes('bestand') || lowerQuery.includes('inventory') || 
                       lowerQuery.includes('artikel') || lowerQuery.includes('sku') || lowerQuery.includes('produkt') || 
                       hasStockQuestion || !!freeformSearch,
    includesReturns: lowerQuery.includes('retour') || lowerQuery.includes('return') || lowerQuery.includes('rückgabe') || lowerQuery.includes('rücksend'),
    includesKpi: lowerQuery.includes('kpi') || lowerQuery.includes('performance') || lowerQuery.includes('kennzahl') || lowerQuery.includes('ziel'),
    lowStock: lowerQuery.includes('niedrig') || lowerQuery.includes('wenig') || lowerQuery.includes('knapp') || lowerQuery.includes('low stock') || lowerQuery.includes('ausverkauft'),
    includesTrend,
    includesTimeAnalysis,
    includesArticleAnalysis,
    includesTopArticles,
    includesGeo,
    includesReturnAnalysis,
    includesProactive,
    // Fulfillment-specific
    includesFulfillment,
    includesProcessingTime,
    includesSLA,
    includesInbound,
    includesPO,
    includesProductivity,
    includesEfficiency,
    includesQuality,
    includesErrors,
    // New advanced analytics
    includesCustomerAnalysis,
    includesVIP,
    includesChurn,
    includesTrendWarnings,
    includesAnomalies,
    includesCrossSelling,
    includesProductCorrelation,
  };
}

// ===== CUSTOMER SEGMENTATION =====
async function fetchCustomerSegmentation(supabase: any, companyId: string, timeRange: any) {
  // Get all orders with customer info
  const { data: orders } = await supabase
    .from('orders')
    .select('customer_no, ship_to_name, order_amount, order_date')
    .eq('company_id', companyId)
    .gte('order_date', timeRange.startDate)
    .lte('order_date', timeRange.endDate);
  
  if (!orders || orders.length === 0) return null;
  
  // Group by customer
  const customerMap = new Map<string, { orders: any[], totalSpent: number, lastOrder: string }>();
  
  orders.forEach((o: any) => {
    const key = o.customer_no || o.ship_to_name;
    if (!key) return;
    
    const existing = customerMap.get(key) || { orders: [], totalSpent: 0, lastOrder: '' };
    existing.orders.push(o);
    existing.totalSpent += o.order_amount || 0;
    if (!existing.lastOrder || o.order_date > existing.lastOrder) {
      existing.lastOrder = o.order_date;
    }
    customerMap.set(key, existing);
  });
  
  const customers = Array.from(customerMap.entries()).map(([key, data]) => ({
    customerNo: key,
    name: key,
    orderCount: data.orders.length,
    totalSpent: data.totalSpent,
    lastOrder: data.lastOrder,
    avgOrderValue: data.totalSpent / data.orders.length,
  }));
  
  const totalCustomers = customers.length;
  const repeatCustomers = customers.filter(c => c.orderCount > 1).length;
  const repeatRate = (repeatCustomers / totalCustomers) * 100;
  const avgOrdersPerCustomer = orders.length / totalCustomers;
  const avgCLV = customers.reduce((sum, c) => sum + c.totalSpent, 0) / totalCustomers;
  
  // Segments
  const vipCustomers = customers.filter(c => c.totalSpent > 500);
  const regularCustomers = customers.filter(c => c.totalSpent >= 100 && c.totalSpent <= 500);
  const occasionalCustomers = customers.filter(c => c.totalSpent < 100);
  
  // Top customers
  const topCustomers = [...customers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 10);
  
  // Churn risk (inactive > 90 days but had at least 2 orders)
  const now = new Date();
  const churnRisk = customers
    .filter(c => {
      const lastOrderDate = new Date(c.lastOrder);
      const daysSince = Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysSince > 90 && c.orderCount >= 2;
    })
    .map(c => ({
      ...c,
      daysSinceLastOrder: Math.floor((now.getTime() - new Date(c.lastOrder).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);
  
  return {
    totalCustomers,
    repeatCustomers,
    repeatRate,
    avgOrdersPerCustomer,
    avgCLV,
    segments: {
      vip: vipCustomers.length,
      vipRevenue: vipCustomers.reduce((sum, c) => sum + c.totalSpent, 0),
      regular: regularCustomers.length,
      occasional: occasionalCustomers.length,
    },
    topCustomers,
    churnRisk,
  };
}

// ===== TREND WARNINGS & ANOMALY DETECTION =====
async function fetchTrendWarnings(supabase: any, companyId: string) {
  const warnings: { severity: string; message: string; details?: string }[] = [];
  
  // Get monthly data for the last 12 months
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - 12);
  
  const { data: orders } = await supabase
    .from('orders')
    .select('order_amount, order_date, status')
    .eq('company_id', companyId)
    .gte('order_date', startDate.toISOString().split('T')[0]);
  
  if (!orders || orders.length === 0) return { warnings: [] };
  
  // Group by month
  const monthlyData = new Map<string, { orders: number; revenue: number; amounts: number[] }>();
  
  orders.forEach((o: any) => {
    const month = o.order_date.substring(0, 7); // YYYY-MM
    const existing = monthlyData.get(month) || { orders: 0, revenue: 0, amounts: [] };
    existing.orders++;
    existing.revenue += o.order_amount || 0;
    if (o.order_amount) existing.amounts.push(o.order_amount);
    monthlyData.set(month, existing);
  });
  
  const months = Array.from(monthlyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      month,
      orders: data.orders,
      revenue: data.revenue,
      aov: data.revenue / data.orders,
    }));
  
  if (months.length < 2) return { warnings: [] };
  
  // Current vs previous month AOV
  const currentMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];
  
  const aovChange = ((currentMonth.aov - previousMonth.aov) / previousMonth.aov) * 100;
  
  // AOV dropping significantly
  if (aovChange < -10) {
    warnings.push({
      severity: 'warning',
      message: `AOV ist um ${Math.abs(aovChange).toFixed(1)}% gesunken`,
      details: `Aktuell: ${currentMonth.aov.toFixed(2)} CHF, Vormonat: ${previousMonth.aov.toFixed(2)} CHF`,
    });
  }
  
  if (aovChange < -20) {
    warnings[warnings.length - 1].severity = 'critical';
  }
  
  // Order volume anomaly
  const avgMonthlyOrders = months.reduce((sum, m) => sum + m.orders, 0) / months.length;
  if (currentMonth.orders < avgMonthlyOrders * 0.7) {
    warnings.push({
      severity: 'warning',
      message: `Bestellvolumen ist ${((1 - currentMonth.orders / avgMonthlyOrders) * 100).toFixed(0)}% unter dem Durchschnitt`,
      details: `Aktuell: ${currentMonth.orders} Bestellungen, Durchschnitt: ${avgMonthlyOrders.toFixed(0)}`,
    });
  }
  
  // Seasonal pattern detection
  const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const monthlyAverages: number[] = Array(12).fill(0);
  const monthlyCounts: number[] = Array(12).fill(0);
  
  months.forEach(m => {
    const monthIndex = parseInt(m.month.split('-')[1]) - 1;
    monthlyAverages[monthIndex] += m.orders;
    monthlyCounts[monthIndex]++;
  });
  
  const seasonalData = monthlyAverages.map((total, i) => ({
    month: monthNames[i],
    avgOrders: monthlyCounts[i] > 0 ? total / monthlyCounts[i] : 0,
  })).filter(m => m.avgOrders > 0);
  
  const overallAvg = seasonalData.reduce((sum, m) => sum + m.avgOrders, 0) / seasonalData.length;
  
  const peakMonth = seasonalData.reduce((max, m) => m.avgOrders > max.avgOrders ? m : max, seasonalData[0]);
  const lowMonth = seasonalData.reduce((min, m) => m.avgOrders < min.avgOrders ? m : min, seasonalData[0]);
  
  return {
    warnings,
    aovTrend: {
      current: currentMonth.aov,
      previous: previousMonth.aov,
      change: aovChange,
    },
    seasonalPattern: {
      peakMonth: peakMonth.month,
      peakIncrease: ((peakMonth.avgOrders - overallAvg) / overallAvg) * 100,
      lowMonth: lowMonth.month,
      lowDecrease: ((lowMonth.avgOrders - overallAvg) / overallAvg) * 100,
    },
  };
}

// ===== PRODUCT CORRELATION / CROSS-SELLING =====
async function fetchProductCorrelation(supabase: any, companyId: string, timeRange: any) {
  // Get orders with their lines
  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('company_id', companyId)
    .gte('order_date', timeRange.startDate)
    .lte('order_date', timeRange.endDate);
  
  if (!orders || orders.length === 0) return null;
  
  const orderIds = orders.map((o: any) => o.id);
  
  // Get order lines
  const { data: orderLines } = await supabase
    .from('order_lines')
    .select('order_id, sku, name, quantity')
    .in('order_id', orderIds.slice(0, 1000)); // Limit for performance
  
  if (!orderLines || orderLines.length === 0) return null;
  
  // Group by order
  const orderProducts = new Map<string, string[]>();
  orderLines.forEach((line: any) => {
    const products = orderProducts.get(line.order_id) || [];
    products.push(line.name || line.sku);
    orderProducts.set(line.order_id, products);
  });
  
  // Find frequently bought together
  const pairCounts = new Map<string, number>();
  
  orderProducts.forEach(products => {
    if (products.length < 2) return;
    
    // Get unique pairs
    for (let i = 0; i < products.length; i++) {
      for (let j = i + 1; j < products.length; j++) {
        const pair = [products[i], products[j]].sort().join('|||');
        pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
      }
    }
  });
  
  const frequentlyBoughtTogether = Array.from(pairCounts.entries())
    .map(([pair, count]) => {
      const [product1, product2] = pair.split('|||');
      return { product1, product2, count };
    })
    .filter(p => p.count >= 3) // At least 3 occurrences
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
  
  // Category analysis (simplified - using first word of product name)
  const categoryMap = new Map<string, Set<string>>();
  orderLines.forEach((line: any) => {
    const category = (line.name || line.sku || '').split(' ')[0];
    if (!category) return;
    const ordersWithCategory = categoryMap.get(category) || new Set();
    ordersWithCategory.add(line.order_id);
    categoryMap.set(category, ordersWithCategory);
  });
  
  const totalOrders = orderProducts.size;
  const categoryMix = Array.from(categoryMap.entries())
    .map(([category, orderSet]) => ({
      category,
      count: orderSet.size,
      percentage: (orderSet.size / totalOrders) * 100,
    }))
    .filter(c => c.count >= 10)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Average items per order
  const totalItems = orderLines.reduce((sum: number, l: any) => sum + (l.quantity || 1), 0);
  const avgItemsPerOrder = totalItems / totalOrders;
  
  return {
    frequentlyBoughtTogether,
    categoryMix,
    avgItemsPerOrder,
    totalOrdersAnalyzed: totalOrders,
  };
}

// ===== COMPANY DETECTION FROM MESSAGE =====
async function detectCompanyFromMessage(supabase: any, message: string): Promise<{ id: string; name: string } | null> {
  const lowerMessage = message.toLowerCase();
  
  // Fetch all companies
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .not('id', 'in', '(PENDING,MSD,MSDI)'); // Exclude system companies
  
  if (!companies || companies.length === 0) return null;
  
  // Check for exact or partial matches
  for (const company of companies) {
    const nameLower = company.name.toLowerCase();
    const idLower = company.id.toLowerCase();
    
    // Check if company name or ID is mentioned
    if (
      lowerMessage.includes(nameLower) ||
      lowerMessage.includes(idLower) ||
      // Handle common variations
      (nameLower.includes('golfyr') && lowerMessage.includes('golfyr')) ||
      (nameLower.includes('golfyr') && lowerMessage.includes('golf fyr')) ||
      (nameLower.includes('golfyr') && lowerMessage.includes('golf fajr')) ||
      (nameLower.includes('namuk') && lowerMessage.includes('namuk')) ||
      (nameLower.includes('aviano') && lowerMessage.includes('aviano')) ||
      (nameLower.includes('getsa') && lowerMessage.includes('getsa')) ||
      (nameLower.includes('getsa') && lowerMessage.includes('get sa'))
    ) {
      return { id: company.id, name: company.name };
    }
  }
  
  // Also check for keyword patterns like "für X" or "von X" or "bei X"
  const patterns = [
    /f[üu]r\s+(\w+)/i,
    /von\s+(\w+)/i,
    /bei\s+(\w+)/i,
    /for\s+(\w+)/i,
    /from\s+(\w+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const keyword = match[1].toLowerCase();
      for (const company of companies) {
        const nameLower = company.name.toLowerCase();
        if (nameLower.includes(keyword) || keyword.includes(nameLower.split(' ')[0].toLowerCase())) {
          return { id: company.id, name: company.name };
        }
      }
    }
  }
  
  return null;
}
