# Supabase Edge Functions API Documentation

This document provides comprehensive API documentation for all Supabase Edge Functions in the MSD Fulfillment Portal.

## Table of Contents

1. [abc-analysis](#abc-analysis)
2. [ai-alerts](#ai-alerts)
3. [ai-forecast](#ai-forecast)
4. [ai-predictions](#ai-predictions)
5. [aov-trend-monitor](#aov-trend-monitor)
6. [bc-inventory-import](#bc-inventory-import)
7. [bc-order-import](#bc-order-import)
8. [calculate-kpis](#calculate-kpis)
9. [daily-data-sync](#daily-data-sync)
10. [detect-clarification-cases](#detect-clarification-cases)
11. [ecommerce-order-import](#ecommerce-order-import)
12. [extract-brand-colors](#extract-brand-colors)
13. [fulfillment-ai](#fulfillment-ai)
14. [generate-forecasts](#generate-forecasts)
15. [generate-taglines](#generate-taglines)
16. [generate-weekly-report](#generate-weekly-report)
17. [inventory-import-bulk](#inventory-import-bulk)
18. [ms-order-state-query](#ms-order-state-query)
19. [ms-order-state-sync](#ms-order-state-sync)
20. [ms-product-stock](#ms-product-stock)
21. [notify-approval](#notify-approval)
22. [notify-registration](#notify-registration)
23. [order-agent](#order-agent)
24. [order-performance](#order-performance)
25. [send-email-notification](#send-email-notification)
26. [send-low-stock-alert](#send-low-stock-alert)
27. [send-push-notification](#send-push-notification)
28. [send-scheduled-report](#send-scheduled-report)
29. [universal-import](#universal-import)
30. [xml-import](#xml-import)
31. [xml-import-bulk](#xml-import-bulk)

---

## abc-analysis

Performs ABC analysis on inventory items to classify them based on revenue contribution.

### Endpoint
`POST /functions/v1/abc-analysis`

### HTTP Methods
- `POST` - Run ABC analysis
- `OPTIONS` - CORS preflight

### Description
Analyzes inventory items and classifies them into A, B, and C categories based on their revenue contribution. A-items are high-value products generating ~80% of revenue, B-items contribute to the next ~15%, and C-items are the remaining low-value products. Generates recommendations for inventory management.

### Request Body
```typescript
{
  companyId: string;       // Required - Company identifier
  periodDays?: number;     // Optional - Analysis period in days (default: 90)
  aThreshold?: number;     // Optional - A-class cumulative revenue threshold % (default: 80)
  bThreshold?: number;     // Optional - B-class cumulative revenue threshold % (default: 95)
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  success: true;
  runId: string;
  classifications: {
    A: number;  // Count of A-class items
    B: number;  // Count of B-class items
    C: number;  // Count of C-class items
  };
  totalRevenue: number;
  aiSummary?: string;      // AI-generated summary
  recommendations: Array<{
    sku: string;
    type: string;
    priority: string;
    recommendation: string;
  }>;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 400 | `companyId is required` |
| 500 | Internal server error |

---

## ai-alerts

Generates AI-powered alerts for fulfillment issues including low stock, delayed orders, return spikes, and KPI warnings.

### Endpoint
`POST /functions/v1/ai-alerts`

### HTTP Methods
- `POST` - Generate alerts
- `OPTIONS` - CORS preflight

### Description
Scans company data to detect and generate alerts for various fulfillment issues. Can optionally generate AI-powered insights summarizing the alerts and recommending actions.

### Rate Limiting
30 requests per minute per client

### Request Body
```typescript
{
  companyId: string;           // Required - Company identifier
  generateAiInsight?: boolean; // Optional - Generate AI summary (default: false)
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  alerts: Array<{
    id: string;
    type: 'low_stock' | 'delayed_order' | 'return_spike' | 'kpi_warning';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    data?: Record<string, unknown>;
    createdAt: string;
  }>;
  aiInsight?: string;  // AI-generated recommendation
  count: number;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## ai-forecast

Generates AI-powered forecasts for orders, returns, and inventory.

### Endpoint
`POST /functions/v1/ai-forecast`

### HTTP Methods
- `POST` - Generate forecast
- `OPTIONS` - CORS preflight

### Description
Analyzes historical data to generate forecasts for upcoming orders, returns, and inventory stockout predictions. Uses trend analysis and AI to provide actionable insights.

### Rate Limiting
20 requests per minute per client

### Request Body
```typescript
{
  companyId: string;      // Required - Company identifier
  language?: string;      // Optional - Language for recommendations (default: 'de')
                          // Supported: 'de', 'en', 'fr', 'it', 'es'
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  orders: Array<{
    date: string;
    actual: number;
    predicted?: number;
  }>;
  returns: Array<{
    date: string;
    actual: number;
    predicted?: number;
  }>;
  inventory: Array<{
    sku: string;
    name: string;
    current: number;
    predictedDemand: number;
    daysUntilStockout: number | null;
    recommendation: string;
  }>;
  insights: string;  // AI-generated forecast summary
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## ai-predictions

Generates predictions for order volume, return rates, stockout risks, and SLA risks.

### Endpoint
`POST /functions/v1/ai-predictions`

### HTTP Methods
- `POST` - Generate predictions
- `OPTIONS` - CORS preflight

### Description
Analyzes company data to generate various business predictions with confidence scores and actionable recommendations.

### Rate Limiting
20 requests per minute per client

### Request Body
```typescript
{
  companyId: string;           // Required - Company identifier
  predictionTypes?: string[];  // Optional - Types to generate (default: ['all'])
                               // Values: 'order_volume', 'return_rate', 'stockout_risk', 'sla_risk', 'all'
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  predictions: Array<{
    type: 'order_volume' | 'return_rate' | 'stockout_risk' | 'sla_risk';
    title: string;
    prediction: number;
    confidence: number;      // 0-1 confidence score
    trend: 'up' | 'down' | 'stable';
    details: string;
    recommendations: string[];
    data?: Record<string, unknown>;
  }>;
  aiSummary?: string;  // AI-generated summary
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## aov-trend-monitor

Monitors Average Order Value (AOV) trends and triggers alerts on significant declines.

### Endpoint
`POST /functions/v1/aov-trend-monitor`

### HTTP Methods
- `POST` - Run AOV analysis
- `OPTIONS` - CORS preflight

### Description
Compares current month AOV with previous month and triggers alerts when AOV declines exceed the threshold. Can monitor all companies or a specific company.

### Request Body
```typescript
{
  companyId?: string;        // Optional - Specific company to analyze (all if omitted)
  thresholdPercent?: number; // Optional - Alert threshold for decline % (default: 10)
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  success: true;
  results: Array<{
    companyId: string;
    companyName: string;
    currentAOV: number;
    previousAOV: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
    alertTriggered: boolean;
  }>;
  alertsTriggered: number;
  threshold: number;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 500 | Internal server error |

---

## bc-inventory-import

Imports inventory data from Business Central via SOAP XML format.

### Endpoint
`POST /functions/v1/bc-inventory-import`

### HTTP Methods
- `POST` - Import inventory
- `OPTIONS` - CORS preflight

### Description
Parses Business Central SOAP XML (WSIFProductStockItems format) and imports/updates inventory data. Requires API key authentication with active BC integration.

### Rate Limiting
10 requests per minute per client

### Request Body
Raw XML body in BC SOAP format (WSIFProductStockItems)

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `text/xml` or `application/xml` |
| `x-api-key` | Yes | API key starting with `msd_` |

### Response (Success - 200)
```typescript
{
  success: true;
  results: {
    imported: number;
    updated: number;
    lowStockAlerts: string[];
    errors: Array<{ sku: string; error: string }>;
  };
  message: string;
}
```

### Error Responses
| Status | Code | Description |
|--------|------|-------------|
| 400 | `EMPTY_BODY` | Empty request body |
| 400 | `NO_ITEMS` | No valid inventory items found |
| 401 | `MISSING_API_KEY` | Missing API key |
| 401 | `INVALID_API_KEY` | Invalid or expired API key |
| 403 | `INTEGRATION_INACTIVE` | BC integration not active |
| 429 | - | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Internal server error |

---

## bc-order-import

Imports orders from Business Central via SOAP XML format.

### Endpoint
`POST /functions/v1/bc-order-import`

### HTTP Methods
- `POST` - Import orders
- `OPTIONS` - CORS preflight

### Description
Parses Business Central SOAP XML (WSIFOrdRespEshop format) and imports/updates orders with their line items. Requires API key authentication with active BC integration.

### Rate Limiting
10 requests per minute per client

### Request Body
Raw XML body in BC SOAP format (WSIFOrdRespEshop)

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `text/xml` or `application/xml` |
| `x-api-key` | Yes | API key starting with `msd_` |

### Response (Success - 200)
```typescript
{
  success: true;
  results: {
    imported: number;
    updated: number;
    errors: Array<{ orderNo: string; error: string }>;
  };
  message: string;
}
```

### Error Responses
| Status | Code | Description |
|--------|------|-------------|
| 400 | `EMPTY_BODY` | Empty request body |
| 400 | `NO_ORDERS` | No valid orders found |
| 401 | `MISSING_API_KEY` | Missing API key |
| 401 | `INVALID_API_KEY` | Invalid or expired API key |
| 403 | `INTEGRATION_INACTIVE` | BC integration not active |
| 429 | - | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Internal server error |

---

## calculate-kpis

Calculates KPI measurements for configured company KPIs.

### Endpoint
`POST /functions/v1/calculate-kpis`

### HTTP Methods
- `POST` - Calculate KPIs
- `OPTIONS` - CORS preflight

### Description
Calculates KPI values (delivery time SLA, processing time, dock-to-stock) for all active KPIs and stores measurements in the database.

### Rate Limiting
10 requests per minute per client

### Request Body
```typescript
{
  company_id?: string;   // Optional - Specific company (all if omitted)
  period_days?: number;  // Optional - Measurement period (default: 30)
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  message: string;
  calculated: number;
  results: Array<{
    kpi_id: string;
    company_id: string;
    value: number;
    success_count: number;
    total_count: number;
  }>;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## daily-data-sync

Performs daily synchronization of inventory and order data from MS Direct API.

### Endpoint
`POST /functions/v1/daily-data-sync`

### HTTP Methods
- `POST` - Run sync
- `OPTIONS` - CORS preflight

### Description
Syncs inventory data via MS Direct productStock API for all configured companies. Updates stock levels and logs sync results.

### Request Body
```typescript
{
  companyId?: string;  // Optional - Specific company (all if omitted)
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  success: true;
  results: Array<{
    company: string;
    companyId: string;
    orders: { imported: number; updated: number; errors: number; errorMessages: string[] };
    inventory: { imported: number; updated: number; errors: number; errorMessages: string[] };
    status: 'success' | 'partial' | 'failed';
  }>;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 500 | Internal server error |

---

## detect-clarification-cases

Detects issues requiring manual clarification such as stock discrepancies and stuck orders.

### Endpoint
`POST /functions/v1/detect-clarification-cases`

### HTTP Methods
- `POST` - Detect cases
- `OPTIONS` - CORS preflight

### Description
Scans for operational issues like negative stock, high reservations, stuck orders, and incomplete inbound deliveries. Creates clarification cases with AI-generated explanations and recommendations.

### Request Body
```typescript
{
  companyId: string;  // Required - Company identifier
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  success: true;
  casesDetected: number;
  byType: {
    stock_discrepancy: number;
    order_stuck: number;
    inbound_incomplete: number;
    item_blocked: number;
  };
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 400 | `companyId is required` |
| 500 | Internal server error |

---

## ecommerce-order-import

Imports orders from e-commerce platforms (Shopify, WooCommerce).

### Endpoint
`POST /functions/v1/ecommerce-order-import`

### HTTP Methods
- `POST` - Import orders
- `OPTIONS` - CORS preflight

### Description
Imports orders from e-commerce platforms. BC (Business Central) orders take precedence - if BC already has the order, the e-commerce import is skipped to avoid duplicates.

### Rate Limiting
20 requests per minute per client

### Request Body
```typescript
// Single order or array of orders
{
  order_id: string;           // Required - E-commerce order ID
  external_id?: string;       // Optional - External document number
  customer_email?: string;    // Optional - Customer email
  order_date: string;         // Required - Order date (ISO format)
  ship_to_name: string;       // Required - Recipient name
  ship_to_address?: string;
  ship_to_postcode?: string;
  ship_to_city?: string;
  ship_to_country?: string;   // Default: 'CH'
  order_amount?: number;
  status?: string;
  tracking_code?: string;
  tracking_link?: string;
  lines: Array<{
    sku: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `x-api-key` | Yes | API key starting with `msd_` |
| `x-source-system` | Yes | `shopify` or `woocommerce` |

### Response (Success - 200)
```typescript
{
  success: true;
  results: {
    imported: number;
    updated: number;
    skipped_bc_master: number;  // Skipped because BC has the order
    errors: Array<{ orderId: string; error: string }>;
  };
  message: string;
}
```

### Error Responses
| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_SOURCE` | Invalid or missing x-source-system header |
| 401 | `MISSING_API_KEY` | Missing API key |
| 401 | `INVALID_API_KEY` | Invalid or expired API key |
| 403 | `INTEGRATION_INACTIVE` | Integration not active |
| 429 | - | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Internal server error |

---

## extract-brand-colors

Extracts brand colors from a website for theming purposes.

### Endpoint
`POST /functions/v1/extract-brand-colors`

### HTTP Methods
- `POST` - Extract colors
- `OPTIONS` - CORS preflight

### Description
Analyzes a website to extract brand colors from meta tags, CSS variables, SVG fills, and inline styles. Returns primary, secondary, and accent colors suitable for theming.

### Rate Limiting
10 requests per minute per client

### Request Body
```typescript
{
  url: string;  // Required - Website URL to analyze
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  primary: string;     // Hex color code
  secondary: string;   // Hex color code
  accent: string;      // Hex color code
  source: string;      // Where the color was found
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## fulfillment-ai

AI-powered conversational assistant for fulfillment analytics and queries.

### Endpoint
`POST /functions/v1/fulfillment-ai`

### HTTP Methods
- `POST` - Chat with AI
- `OPTIONS` - CORS preflight

### Description
Provides an AI-powered chat interface for querying fulfillment data. Automatically detects company from conversation, parses time ranges, and fetches relevant analytics including orders, returns, inventory, fulfillment performance, and geographic insights.

### Rate Limiting
50 requests per minute per client

### Request Body
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  companyId?: string;    // Optional - Company context
  language?: string;     // Optional - Response language (default: 'de')
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  response: string;         // AI-generated response
  searchResults?: object;   // Underlying data used
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 400 | `Messages array is required` |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## generate-forecasts

Generates stock-out alerts and replenishment suggestions based on demand forecasting.

### Endpoint
`POST /functions/v1/generate-forecasts`

### HTTP Methods
- `POST` - Generate forecasts
- `OPTIONS` - CORS preflight

### Description
Analyzes historical order data and ABC classifications to predict stock-outs and generate replenishment suggestions with suggested order quantities and order-by dates.

### Request Body
```typescript
{
  companyId: string;         // Required - Company identifier
  forecastDays?: number;     // Optional - Forecast horizon (default: 30)
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  success: true;
  alerts: Array<{
    sku: string;
    product_name: string;
    abc_class: string | null;
    current_stock: number;
    avg_daily_demand: number;
    days_until_stockout: number;
    stockout_probability: number;
    estimated_revenue_at_risk: number;
    alert_severity: 'critical' | 'warning' | 'info';
  }>;
  suggestions: Array<{
    sku: string;
    product_name: string;
    current_stock: number;
    avg_daily_demand: number;
    days_of_stock_remaining: number;
    stockout_date: string;
    suggested_order_quantity: number;
    order_by_date: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    reasoning: string;
  }>;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 400 | `companyId is required` |
| 500 | Internal server error |

---

## generate-taglines

Generates creative taglines for a company using AI.

### Endpoint
`POST /functions/v1/generate-taglines`

### HTTP Methods
- `POST` - Generate taglines
- `OPTIONS` - CORS preflight

### Description
Uses AI to generate creative, branded taglines based on company information and optional website analysis. Returns 6 unique tagline suggestions.

### Rate Limiting
10 requests per minute per client

### Request Body
```typescript
{
  companyName: string;       // Required - Company name
  industry?: string;         // Optional - Industry/niche
  keywords?: string[];       // Optional - Brand keywords
  domain?: string;           // Optional - Website URL for context
  websiteContent?: string;   // Optional - Pre-fetched website content
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  taglines: string[];  // Array of 6 tagline suggestions
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 402 | AI credits exhausted |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## generate-weekly-report

Generates an AI-powered weekly fulfillment report.

### Endpoint
`POST /functions/v1/generate-weekly-report`

### HTTP Methods
- `POST` - Generate report
- `OPTIONS` - CORS preflight

### Description
Compiles weekly fulfillment metrics and generates an AI-written summary report with trends, highlights, and recommendations.

### Request Body
```typescript
{
  companyId?: string;    // Optional - Company filter
  language?: string;     // Optional - Report language (default: 'de')
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  metrics: {
    ordersThisWeek: number;
    ordersLastWeek: number;
    ordersTrend: number;
    shipmentsThisWeek: number;
    shipmentsLastWeek: number;
    shipmentsTrend: number;
    returnsThisWeek: number;
    returnsLastWeek: number;
    returnsTrend: number;
    avgProcessingHours: number;
    slaCompliance: number;
    topProducts: Array<{ sku: string; name: string; quantity: number }>;
    lowStockItems: number;
    totalRevenue: number;
  };
  report: string;  // AI-generated Markdown report
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 500 | Internal server error |

---

## inventory-import-bulk

Bulk imports inventory data from Business Central SOAP XML.

### Endpoint
`POST /functions/v1/inventory-import-bulk`

### HTTP Methods
- `POST` - Import inventory
- `OPTIONS` - CORS preflight

### Description
Parses Business Central SOAP XML and imports/updates inventory for multiple companies. Automatically maps BC company IDs to internal company IDs.

### Rate Limiting
5 requests per minute per client

### Request Body
Raw XML body in BC SOAP format (WSIFProductStockItems)

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `text/xml` or `application/xml` |

### Response (Success - 200)
```typescript
{
  success: true;
  message: string;
  results: {
    imported: number;
    updated: number;
    lowStockAlerts: number;
    errors: Array<{ sku: string; error: string }>;
  };
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 400 | Empty request body or no valid items |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## ms-order-state-query

Queries order state from MS Direct SOAP API.

### Endpoint
`POST /functions/v1/ms-order-state-query`

### HTTP Methods
- `POST` - Query order state
- `OPTIONS` - CORS preflight

### Description
Queries the MS Direct msDynamicLov SOAP API to get real-time order state including tracking information, shipping agent, and invoice details.

### Rate Limiting
20 requests per minute per client

### Request Body
```typescript
{
  orderNo: string;     // Required - Order number (Source_No)
  companyId: string;   // Required - Company identifier
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  success: true;
  data: {
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
  };
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 400 | Missing orderNo or companyId |
| 404 | Order not found or API error |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## ms-order-state-sync

Batch syncs order states from MS Direct API.

### Endpoint
`POST /functions/v1/ms-order-state-sync`

### HTTP Methods
- `POST` - Sync order states
- `OPTIONS` - CORS preflight

### Description
Batch updates order states by querying MS Direct API. Processes orders that haven't been synced in the last 15 minutes.

### Request Body
```typescript
{
  companyId?: string;   // Optional - Specific company (all if omitted)
  limit?: number;       // Optional - Max orders to sync (default: 10)
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  success: true;
  synced: number;
  updated: number;
  errors: number;
  details: Array<{
    orderNo: string;
    status: 'updated' | 'unchanged' | 'error';
    error?: string;
  }>;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 500 | Internal server error |

---

## ms-product-stock

Queries product stock levels from MS Direct API.

### Endpoint
`POST /functions/v1/ms-product-stock`

### HTTP Methods
- `POST` - Query stock
- `OPTIONS` - CORS preflight

### Description
Queries the MS Direct productStock SOAP API to get real-time inventory levels. Can query all products or a specific SKU.

### Rate Limiting
10 requests per minute per client

### Request Body
```typescript
{
  companyId: string;   // Required - Company identifier
  sku?: string;        // Optional - Specific SKU (all if omitted)
  syncToDb?: boolean;  // Optional - Update database with results
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  success: true;
  items: Array<{
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
  }>;
  synced?: number;  // If syncToDb was true
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 400 | Missing companyId |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## notify-approval

Sends email notification when a user registration is approved or rejected.

### Endpoint
`POST /functions/v1/notify-approval`

### HTTP Methods
- `POST` - Send notification
- `OPTIONS` - CORS preflight

### Description
Sends an approval/rejection email to a user after their registration has been reviewed.

### Rate Limiting
20 requests per minute per client

### Request Body
```typescript
{
  user_email: string;      // Required - User's email address
  user_name?: string;      // Optional - User's name
  company_name?: string;   // Optional - Company name
  action: 'approved' | 'rejected';  // Required - Approval decision
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  success: true;
  emailResult: object;  // Resend API response
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 400 | User email is required |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## notify-registration

Notifies system administrators about new user registrations.

### Endpoint
`POST /functions/v1/notify-registration`

### HTTP Methods
- `POST` - Send notification
- `OPTIONS` - CORS preflight

### Description
Sends email notifications to all system administrators when a new user registers, especially if the registration requires manual approval.

### Rate Limiting
10 requests per minute per client

### Request Body
```typescript
{
  user_email: string;              // Required - User's email
  user_name?: string;              // Optional - User's name
  company_name?: string;           // Optional - Matched company name
  is_pending: boolean;             // Required - Whether approval is needed
  requested_company_name?: string; // Optional - Company name user entered
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  success: true;
  emailResult: object;
  sentTo: string[];  // Admin emails notified
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## order-agent

AI agent that automatically analyzes and manages orders.

### Endpoint
`POST /functions/v1/order-agent`

### HTTP Methods
- `POST` - Run agent
- `OPTIONS` - CORS preflight

### Description
Runs an autonomous AI agent that observes order data, reasons about issues, and takes corrective actions. Uses an observe-think-act loop.

### Request Body
```typescript
{
  companyId: string;  // Required - Company identifier
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  startedAt: string;
  completedAt: string;
  observations: number;
  thoughts: number;
  actionsExecuted: number;
  actionsSucceeded: number;
  errors: string[];
  log: Array<{
    type: 'observation' | 'thought' | 'action';
    content: string;
    timestamp: string;
  }>;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 400 | `companyId is required` |
| 500 | Internal server error |

---

## order-performance

Analyzes order processing performance and identifies bottlenecks.

### Endpoint
`POST /functions/v1/order-performance`

### HTTP Methods
- `POST` - Get performance metrics
- `OPTIONS` - CORS preflight

### Description
Analyzes order processing stages, carrier performance, and identifies bottlenecks in the fulfillment process.

### Rate Limiting
20 requests per minute per client

### Request Body
```typescript
{
  companyId: string;   // Required - Company identifier
  days?: number;       // Optional - Analysis period (default: 30)
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  summary: {
    totalOrders: number;
    avgProcessingTime: number;  // hours
    onTimeRate: number;         // percentage
    slaBreaches: number;
    atRiskOrders: number;
  };
  stages: Array<{
    stage: string;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    orderCount: number;
    bottleneckScore: number;  // 0-1
  }>;
  carriers: Array<{
    carrier: string;
    orderCount: number;
    avgDeliveryTime: number;  // days
    onTimeRate: number;
  }>;
  trends: Array<{
    date: string;
    avgProcessingTime: number;
    orderCount: number;
    onTimeRate: number;
  }>;
  bottlenecks: Array<{
    stage: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: string;
    recommendation: string;
  }>;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## send-email-notification

Sends email notifications to users based on their notification settings.

### Endpoint
`POST /functions/v1/send-email-notification`

### HTTP Methods
- `POST` - Send email
- `OPTIONS` - CORS preflight

### Description
Sends branded email notifications to all users who have enabled email notifications for the specified notification type.

### Request Body
```typescript
{
  companyId: string;        // Required - Company identifier
  notificationType: string; // Required - Type matching notification_settings column
  title: string;            // Required - Email subject
  body: string;             // Required - Email body text
  url?: string;             // Optional - Link to include in email
  orderId?: string;         // Optional - Related order ID
  orderSourceNo?: string;   // Optional - Order number to display
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  message: string;
  successful: number;
  failed: number;
  results: Array<{
    success: boolean;
    email: string;
    error?: any;
  }>;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 500 | Internal server error |

---

## send-low-stock-alert

Sends low stock alert notifications via email and push.

### Endpoint
`POST /functions/v1/send-low-stock-alert`

### HTTP Methods
- `POST` - Send alert
- `OPTIONS` - CORS preflight

### Description
Sends low stock alert notifications to users who have enabled low stock notifications. Sends both push and email notifications.

### Request Body
```typescript
{
  inventoryId: string;  // Required - Inventory record ID
  sku: string;          // Required - Product SKU
  name: string;         // Required - Product name
  available: number;    // Required - Current available quantity
  threshold: number;    // Required - Low stock threshold
  companyId: string;    // Required - Company identifier
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  success: true;
  sentPush: boolean;
  sentEmail: boolean;
  emailsSent?: number;
  emailsFailed?: number;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 500 | Internal server error |

---

## send-push-notification

Sends web push notifications to subscribed users.

### Endpoint
`POST /functions/v1/send-push-notification`

### HTTP Methods
- `POST` - Send push notification
- `OPTIONS` - CORS preflight

### Description
Sends web push notifications to all users who have push notifications enabled for the specified notification type.

### Rate Limiting
50 requests per minute per client

### Request Body
```typescript
{
  companyId: string;
  notificationType: 'notify_order_created' | 'notify_order_shipped' | 
                    'notify_order_delivered' | 'notify_low_stock' | 
                    'notify_sla_warning' | 'notify_returns';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  url?: string;  // URL to open when notification is clicked
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  message: string;
  sent: number;
  failed?: number;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 429 | Rate limit exceeded |
| 500 | VAPID keys not configured |

---

## send-scheduled-report

Sends scheduled fulfillment reports via email.

### Endpoint
`POST /functions/v1/send-scheduled-report`

### HTTP Methods
- `POST` - Send report
- `OPTIONS` - CORS preflight

### Description
Generates and sends a fulfillment report (daily, weekly, or monthly) to a specified recipient via email.

### Request Body
```typescript
{
  companyId: string;         // Required - Company identifier
  recipientEmail: string;    // Required - Email to send report to
  recipientName?: string;    // Optional - Recipient's name
  reportType: 'weekly' | 'daily' | 'monthly';  // Required
  language?: 'de' | 'en';    // Optional - Report language (default: 'de')
}
```

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |

### Response (Success - 200)
```typescript
{
  success: true;
  message: string;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 500 | RESEND_API_KEY not configured |

---

## universal-import

Universal import function supporting orders, inventory, and returns in XML or JSON format.

### Endpoint
`POST /functions/v1/universal-import`

### HTTP Methods
- `POST` - Import data
- `OPTIONS` - CORS preflight

### Description
Automatically detects data type (orders, inventory, returns, or mixed) from the request body and imports accordingly. Supports both BC SOAP XML and JSON formats. Handles large files with chunked processing.

### Rate Limiting
10 requests per minute per client

### Request Body
Either:
- Raw XML in BC SOAP format
- JSON object or array

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json`, `text/xml`, or `application/xml` |

### Response (Success - 200)
```typescript
{
  success: true;
  dataType: 'orders' | 'inventory' | 'returns' | 'mixed';
  orders: {
    imported: number;
    updated: number;
    errors: Array<{ id: string; error: string }>;
  };
  inventory: {
    imported: number;
    updated: number;
    lowStockAlerts: number;
    errors: Array<{ sku: string; error: string }>;
  };
  returns: {
    imported: number;
    updated: number;
    errors: Array<{ id: string; error: string }>;
  };
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 400 | Empty request body or unrecognized format |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## xml-import

Imports orders from Business Central XML format.

### Endpoint
`POST /functions/v1/xml-import`

### HTTP Methods
- `POST` - Import orders
- `OPTIONS` - CORS preflight

### Description
Parses BC SOAP XML (WSIFOrdRespEshop format) and imports orders with their line items. Sets BC as the master source system.

### Rate Limiting
10 requests per minute per client

### Request Body
Raw XML in BC SOAP format (WSIFOrdRespEshop)

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `text/xml` or `application/xml` |

### Response (Success - 200)
```typescript
{
  success: true;
  results: {
    imported: number;
    updated: number;
    errors: Array<{ orderNo: string; error: string }>;
  };
  message: string;
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 400 | Empty request body or no valid orders |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## xml-import-bulk

Optimized bulk import for large XML files.

### Endpoint
`POST /functions/v1/xml-import-bulk`

### HTTP Methods
- `POST` - Import orders
- `OPTIONS` - CORS preflight

### Description
Optimized version of xml-import for handling large BC XML files. Uses string splitting instead of regex for better performance on large payloads.

### Rate Limiting
5 requests per minute per client

### Request Body
Raw XML in BC SOAP format (WSIFOrdRespEshop)

### Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `text/xml` or `application/xml` |

### Response (Success - 200)
```typescript
{
  success: true;
  results: {
    imported: number;
    updated: number;
    linesInserted: number;
    errors: Array<{ orderNo: string; error: string }>;
  };
}
```

### Error Responses
| Status | Description |
|--------|-------------|
| 400 | Empty request body or no valid orders |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Common Headers

All endpoints support CORS with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## Authentication

Most endpoints use one of these authentication methods:

1. **Supabase Auth** - Standard Supabase JWT token in `Authorization: Bearer <token>` header
2. **API Key** - Custom API key in `x-api-key` header (for external integrations)
3. **Service Role** - Internal calls using `SUPABASE_SERVICE_ROLE_KEY`

## Rate Limiting

Rate limiting is applied per client (IP or user ID) with varying limits per endpoint:
- Default: 10-20 requests per minute
- AI/Chat endpoints: 50 requests per minute
- Bulk imports: 5 requests per minute

Rate limit response (429):
```typescript
{
  error: "Rate limit exceeded. Try again in X seconds.",
  retryAfter: number  // seconds until reset
}
```

## Error Response Format

All errors follow this format:
```typescript
{
  error: string;       // Human-readable error message
  code?: string;       // Machine-readable error code
}
```
