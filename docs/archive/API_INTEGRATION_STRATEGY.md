# API-Integrationsstrategie
## MS Direct Fulfillment Hub & Execution Layer

**Datum:** 2025-12-27  
**Status:** Strategie & Roadmap

---

## 🎯 **ÜBERSICHT**

Dieses Dokument definiert die API-Integrationsstrategie für alle externen Systeme, die mit dem Fulfillment Hub und Execution Layer verbunden werden müssen.

### **Integrierte Systeme:**

1. **Microsoft Business Central (BC)** - ERP, System of Record
2. **Azure Active Directory (Azure AD)** - SSO & User Management
3. **WooCommerce / Shopify** - Order Sources (E-Commerce)
4. **Parallel Software** - AutoStore WCS (Warehouse Control System)
5. **AutoStore** - Robotik-System
6. **Versanddienstleister** - DHL, Post CH
7. **Weitere** - Custom APIs, Webhooks

---

## 📊 **ARCHITEKTUR-PRINZIPIEN**

### **1. Layer-basierte Integration**

```
┌─────────────────────────────────────────┐
│  Fulfillment Hub (Read-only APIs)      │
│  - Orders, Inventory, Returns          │
│  - Dashboards, Reports                  │
└─────────────────────────────────────────┘
              ↓ ↑
┌─────────────────────────────────────────┐
│  Execution Layer (Bidirectional APIs)   │
│  - Jobs, Queues, Events                 │
│  - SLA-Priorisierung                    │
└─────────────────────────────────────────┘
              ↓ ↑
┌─────────────────────────────────────────┐
│  Shopfloor App (Execution API only)     │
│  - Next Job, Start, Complete            │
└─────────────────────────────────────────┘
```

### **2. Integration Patterns**

| Pattern | Verwendung | Beispiel |
|---------|-----------|----------|
| **Push (Webhooks)** | Echtzeit-Updates | Shopify Order Created |
| **Pull (Polling)** | Regelmäßige Syncs | BC Orders Sync |
| **Event-Driven** | Asynchrone Events | Job Completed → BC Update |
| **API Gateway** | Zentrale API-Verwaltung | Supabase Edge Functions |

---

## 🔌 **1. MICROSOFT BUSINESS CENTRAL (BC)**

### **Rolle in der Architektur:**
- ✅ **System of Record** - Buchungen, Finance, Revisionssicherheit
- ✅ **Order Source** - Bestehende Orders aus BC
- ✅ **Event Sink** - Execution Layer schreibt Events zurück

### **Aktueller Status:**
- ✅ `bc-order-import` Edge Function existiert
- ✅ `bc-inventory-import` Edge Function existiert
- ✅ XML/SOAP-basierte Integration
- ⚠️ Nur Push von BC → Hub (kein Pull, kein Event-Rückgabe)

### **API-Strategie:**

#### **1.1 BC → Hub (Orders, Inventory) - AKTUELL**

**Methode:** Push via Edge Function (XML/SOAP)

```typescript
// supabase/functions/bc-order-import/index.ts
// BC sendet XML → Edge Function → Supabase DB

POST /functions/v1/bc-order-import
Headers:
  x-api-key: {company_api_key}
Body:
  XML (SOAP Format)
```

**Erweitern:**
- ✅ Webhook-Support (statt nur XML-Push)
- ✅ JSON-Format (moderne BC-APIs)
- ✅ Batch-Processing für große Datenmengen

#### **1.2 Hub → BC (Events) - NEU**

**Methode:** REST API (BC OData API)

```typescript
// supabase/functions/bc-event-sync/index.ts
// Execution Layer → BC Status-Updates

POST /functions/v1/bc-event-sync
Body: {
  company_id: string,
  event_type: 'job_completed' | 'order_shipped' | 'inventory_updated',
  order_id: string,
  data: {...}
}
```

**BC OData API Integration:**
```typescript
// lib/integrations/bcClient.ts
export class BCClient {
  private baseUrl: string;
  private accessToken: string;

  async updateOrderStatus(orderNo: string, status: string) {
    const response = await fetch(
      `${this.baseUrl}/api/v2.0/companies('${this.companyId}')/salesOrders('${orderNo}')`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: status,
        }),
      }
    );
    return response.json();
  }

  async getOrders(lastSyncTime: Date) {
    // Polling für neue Orders
    const response = await fetch(
      `${this.baseUrl}/api/v2.0/companies('${this.companyId}')/salesOrders?$filter=lastModifiedDateTime gt ${lastSyncTime.toISOString()}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );
    return response.json();
  }
}
```

#### **1.3 BC OAuth 2.0 Authentication**

```typescript
// lib/integrations/bcAuth.ts
export async function getBCAccessToken(
  tenantId: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://api.businesscentral.dynamics.com/.default',
        grant_type: 'client_credentials',
      }),
    }
  );
  const data = await response.json();
  return data.access_token;
}
```

### **Implementierungs-Roadmap:**

| Phase | Task | Aufwand | Priorität |
|-------|------|---------|-----------|
| **Phase 1** | BC OAuth 2.0 Setup | 1 Tag | 🔴 Hoch |
| **Phase 1** | BC OData API Client | 2-3 Tage | 🔴 Hoch |
| **Phase 1** | Event-Sync Edge Function | 2-3 Tage | 🔴 Hoch |
| **Phase 2** | Polling für neue Orders | 1-2 Tage | 🟡 Mittel |
| **Phase 2** | Batch-Processing | 1 Tag | 🟡 Mittel |
| **Phase 3** | Webhook-Support | 2-3 Tage | 🟢 Niedrig |

**Gesamt:** ~2 Wochen

---

## 🔐 **2. AZURE ACTIVE DIRECTORY (AZURE AD)**

### **Rolle in der Architektur:**
- ✅ **SSO** - Single Sign-On für MSD-Mitarbeiter
- ✅ **User Management** - Automatische User-Synchronisation
- ✅ **Role Mapping** - Azure AD Groups → App Roles

### **Aktueller Status:**
- ❌ Keine Azure AD Integration vorhanden
- ✅ Supabase Auth (Email/Password) funktioniert
- ⚠️ MSD-Mitarbeiter müssen manuell angelegt werden

### **API-Strategie:**

#### **2.1 Azure AD SSO (OAuth 2.0 / OpenID Connect)**

```typescript
// supabase/functions/azure-ad-auth/index.ts
// Azure AD → Supabase Auth Mapping

// Frontend: Azure AD Login
export function AzureADLogin() {
  const handleLogin = () => {
    window.location.href = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `redirect_uri=${redirectUri}&` +
      `scope=openid profile email&` +
      `response_mode=query`;
  };
}
```

#### **2.2 User Sync (Azure AD → Supabase)**

```typescript
// supabase/functions/azure-ad-sync/index.ts
// Regelmäßige Synchronisation von Azure AD Users

export async function syncAzureADUsers() {
  // 1. Azure AD Graph API: Alle Users abrufen
  const users = await fetchAzureADUsers();
  
  // 2. Mit Supabase Users vergleichen
  for (const adUser of users) {
    const existingUser = await findSupabaseUser(adUser.email);
    
    if (!existingUser) {
      // Neuen User anlegen
      await createSupabaseUser(adUser);
    } else {
      // User aktualisieren
      await updateSupabaseUser(existingUser.id, adUser);
    }
  }
}
```

#### **2.3 Role Mapping (Azure AD Groups → App Roles)**

```typescript
// lib/integrations/azureADRoleMapping.ts
const ROLE_MAPPING = {
  'MSD-CSM-Group': 'msd_csm',
  'MSD-MA-Group': 'msd_ma',
  'MSD-Admin-Group': 'system_admin',
};

export async function mapAzureADRoleToAppRole(
  azureADGroups: string[]
): Promise<AppRole> {
  for (const group of azureADGroups) {
    if (ROLE_MAPPING[group]) {
      return ROLE_MAPPING[group];
    }
  }
  return 'customer_user'; // Default
}
```

### **Azure AD Graph API Integration:**

```typescript
// lib/integrations/azureADClient.ts
export class AzureADClient {
  private accessToken: string;

  async getUsers(): Promise<AzureADUser[]> {
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/users',
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );
    return response.json();
  }

  async getUserGroups(userId: string): Promise<string[]> {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${userId}/memberOf`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );
    return response.json();
  }
}
```

### **Implementierungs-Roadmap:**

| Phase | Task | Aufwand | Priorität |
|-------|------|---------|-----------|
| **Phase 1** | Azure AD App Registration | 1 Tag | 🔴 Hoch |
| **Phase 1** | SSO Integration (Frontend) | 2-3 Tage | 🔴 Hoch |
| **Phase 1** | Azure AD Graph API Client | 2 Tage | 🔴 Hoch |
| **Phase 2** | User Sync Edge Function | 2-3 Tage | 🟡 Mittel |
| **Phase 2** | Role Mapping Logic | 1-2 Tage | 🟡 Mittel |
| **Phase 3** | Automatische Sync (Cron) | 1 Tag | 🟢 Niedrig |

**Gesamt:** ~2 Wochen

---

## 🛒 **3. WOOCOMMERCE / SHOPIFY**

### **Rolle in der Architektur:**
- ✅ **Order Source** - Neue Orders von E-Commerce-Shops
- ✅ **Webhook Receiver** - Echtzeit-Order-Updates
- ✅ **Inventory Sync** - Lagerbestände synchronisieren

### **Aktueller Status:**
- ✅ `IntegrationConfig.tsx` zeigt WooCommerce/Shopify UI
- ❌ Keine aktiven Edge Functions vorhanden
- ⚠️ Nur Konfiguration, keine Implementierung

### **API-Strategie:**

#### **3.1 WooCommerce Integration**

**WooCommerce REST API:**
```typescript
// supabase/functions/woocommerce-webhook/index.ts
// WooCommerce → Hub (Webhook Receiver)

POST /functions/v1/woocommerce-webhook
Headers:
  x-api-key: {company_api_key}
Body: {
  action: 'order.created' | 'order.updated' | 'order.deleted',
  order: {
    id: number,
    status: string,
    line_items: [...],
    shipping: {...},
    billing: {...}
  }
}
```

**WooCommerce → BC Sync:**
```typescript
// supabase/functions/woocommerce-sync/index.ts
// Polling für neue Orders (Fallback)

export async function syncWooCommerceOrders(storeUrl: string, apiKey: string) {
  const response = await fetch(
    `${storeUrl}/wp-json/wc/v3/orders?status=processing&after=${lastSyncTime}`,
    {
      headers: {
        'Authorization': `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
      },
    }
  );
  const orders = await response.json();
  
  // Orders in Supabase speichern
  for (const order of orders) {
    await createOrderFromWooCommerce(order);
  }
}
```

#### **3.2 Shopify Integration**

**Shopify Webhooks:**
```typescript
// supabase/functions/shopify-webhook/index.ts
// Shopify → Hub (Webhook Receiver)

POST /functions/v1/shopify-webhook
Headers:
  x-shopify-shop-domain: {store_name}
  x-shopify-hmac-sha256: {hmac_signature}
Body: {
  id: number,
  name: string,
  line_items: [...],
  shipping_address: {...},
  billing_address: {...}
}
```

**Shopify GraphQL API (moderne Alternative):**
```typescript
// lib/integrations/shopifyClient.ts
export class ShopifyClient {
  async getOrders(lastSyncTime: Date) {
    const query = `
      query GetOrders($query: String!) {
        orders(first: 250, query: $query) {
          edges {
            node {
              id
              name
              createdAt
              lineItems(first: 250) {
                edges {
                  node {
                    title
                    quantity
                    variant {
                      sku
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    const response = await fetch(
      `https://${this.storeName}.myshopify.com/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            query: `created_at:>${lastSyncTime.toISOString()}`,
          },
        }),
      }
    );
    return response.json();
  }
}
```

### **Implementierungs-Roadmap:**

| Phase | Task | Aufwand | Priorität |
|-------|------|---------|-----------|
| **Phase 1** | WooCommerce Webhook Receiver | 2-3 Tage | 🔴 Hoch |
| **Phase 1** | Shopify Webhook Receiver | 2-3 Tage | 🔴 Hoch |
| **Phase 1** | Order Mapping (WooCommerce → Supabase) | 1-2 Tage | 🔴 Hoch |
| **Phase 1** | Order Mapping (Shopify → Supabase) | 1-2 Tage | 🔴 Hoch |
| **Phase 2** | Inventory Sync (Hub → WooCommerce/Shopify) | 2-3 Tage | 🟡 Mittel |
| **Phase 2** | Polling Fallback | 1-2 Tage | 🟡 Mittel |
| **Phase 3** | Multi-Store Support | 2-3 Tage | 🟢 Niedrig |

**Gesamt:** ~2-3 Wochen

---

## 🤖 **4. PARALLEL SOFTWARE (AUTOSTORE WCS)**

### **Rolle in der Architektur:**
- ✅ **Execution System** - Führt Pick-Jobs aus (AutoStore)
- ✅ **Event Source** - Sendet Job-Events zurück
- ⚠️ **Kurzfristig:** Unverändert im Einsatz
- ⚠️ **Mittelfristig:** Execution Layer priorisiert, Parallel führt aus
- ⚠️ **Langfristig:** Optionale Reduktion/Ersatz

### **Aktueller Status:**
- ❌ Keine Parallel-Integration vorhanden
- ⚠️ Parallel ist proprietäres System (wenig öffentliche API-Docs)

### **API-Strategie:**

#### **4.1 Parallel API Integration (Reverse Engineering)**

**Herausforderung:**
- ⚠️ Parallel ist proprietär
- ⚠️ Keine öffentliche API-Dokumentation
- ⚠️ Möglicherweise nur über BC-Integration verfügbar

**Mögliche Ansätze:**

**Option A: BC als Proxy**
```typescript
// Execution Layer → BC → Parallel
// BC hat bereits Parallel-Integration
// Execution Layer nutzt BC als Proxy
```

**Option B: Direkte Parallel-API (falls verfügbar)**
```typescript
// supabase/functions/parallel-job-sync/index.ts
// Execution Layer → Parallel (Job Assignment)

POST /functions/v1/parallel-job-sync
Body: {
  job_id: string,
  order_id: string,
  priority: number,
  location: 'autostore',
  items: [...]
}
```

**Option C: Event-Listener (Parallel → Execution Layer)**
```typescript
// Parallel sendet Events → Execution Layer
// Execution Layer aktualisiert Job-Status

POST /functions/v1/parallel-events
Body: {
  event_type: 'job_started' | 'job_completed' | 'job_failed',
  job_id: string,
  timestamp: string
}
```

#### **4.2 Job-Orchestrierung mit Parallel**

```typescript
// lib/integrations/parallelOrchestrator.ts
export class ParallelOrchestrator {
  async assignJobToParallel(job: Job) {
    // 1. Execution Layer priorisiert Job
    const priority = await calculateJobPriority(job);
    
    // 2. Job an Parallel senden
    await parallelAPI.createPickJob({
      orderId: job.order_id,
      priority: priority,
      items: job.items,
    });
    
    // 3. Job-Status in Supabase aktualisieren
    await updateJobStatus(job.id, 'assigned_to_parallel');
  }
  
  async handleParallelEvent(event: ParallelEvent) {
    // Parallel sendet Event → Execution Layer aktualisiert
    await updateJobStatus(event.jobId, event.status);
    
    // Event loggen
    await logJobEvent(event.jobId, event.type, event.data);
  }
}
```

### **Implementierungs-Roadmap:**

| Phase | Task | Aufwand | Priorität |
|-------|------|---------|-----------|
| **Phase 0** | Parallel API Reverse Engineering | 1-2 Wochen | 🔴 Hoch |
| **Phase 1** | Parallel API Client (falls verfügbar) | 2-3 Tage | 🔴 Hoch |
| **Phase 1** | Job Assignment (Execution → Parallel) | 2-3 Tage | 🔴 Hoch |
| **Phase 1** | Event Listener (Parallel → Execution) | 2-3 Tage | 🔴 Hoch |
| **Phase 2** | BC Proxy (falls direkte API nicht verfügbar) | 3-5 Tage | 🟡 Mittel |
| **Phase 3** | Priorisierungs-Logik Integration | 2-3 Tage | 🟡 Mittel |

**Gesamt:** ~3-4 Wochen (inkl. Reverse Engineering)

---

## 📦 **5. AUTOSTORE (ROBOTIK-SYSTEM)**

### **Rolle in der Architektur:**
- ✅ **Execution System** - Physische Bewegung, Robotik
- ✅ **Event Source** - Port-Events, Bin-Events
- ⚠️ **Steuerung:** Über Parallel Software

### **API-Strategie:**

**AutoStore wird primär über Parallel gesteuert. Direkte Integration nur bei Bedarf:**

```typescript
// Falls AutoStore eigene API hat (selten):
// supabase/functions/autostore-status/index.ts
// AutoStore → Execution Layer (Status-Updates)

POST /functions/v1/autostore-status
Body: {
  port_id: string,
  bin_id: string,
  status: 'ready' | 'busy' | 'error',
  timestamp: string
}
```

**Empfehlung:** AutoStore über Parallel integrieren (einfacher, weniger Komplexität)

---

## 🚚 **6. VERSANDDIENSTLEISTER (DHL, POST CH)**

### **Rolle in der Architektur:**
- ✅ **Tracking** - Versandstatus-Updates
- ✅ **Label-Druck** - Versandlabels generieren
- ✅ **Rates** - Versandkosten berechnen

### **Aktueller Status:**
- ✅ `IntegrationConfig.tsx` zeigt DHL/Post CH UI
- ❌ Keine aktiven Edge Functions vorhanden

### **API-Strategie:**

#### **6.1 DHL Integration**

```typescript
// supabase/functions/dhl-tracking/index.ts
// DHL → Hub (Tracking-Updates)

POST /functions/v1/dhl-tracking
Body: {
  tracking_number: string,
  status: string,
  location: string,
  timestamp: string
}
```

**DHL API Client:**
```typescript
// lib/integrations/dhlClient.ts
export class DHLClient {
  async createShipment(order: Order) {
    const response = await fetch('https://api-eu.dhl.com/shipment', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiver: order.shipping_address,
        packages: order.items,
      }),
    });
    return response.json();
  }
  
  async getTracking(trackingNumber: string) {
    const response = await fetch(
      `https://api-eu.dhl.com/tracking/${trackingNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );
    return response.json();
  }
}
```

#### **6.2 Post CH Integration**

```typescript
// lib/integrations/postCHClient.ts
export class PostCHClient {
  async createShipment(order: Order) {
    const response = await fetch('https://api.post.ch/v1/shipments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: order.shipping_address,
        items: order.items,
      }),
    });
    return response.json();
  }
}
```

### **Implementierungs-Roadmap:**

| Phase | Task | Aufwand | Priorität |
|-------|------|---------|-----------|
| **Phase 1** | DHL API Client | 2-3 Tage | 🟡 Mittel |
| **Phase 1** | Post CH API Client | 2-3 Tage | 🟡 Mittel |
| **Phase 2** | Label-Druck Integration | 2-3 Tage | 🟡 Mittel |
| **Phase 2** | Tracking-Webhooks | 1-2 Tage | 🟢 Niedrig |
| **Phase 3** | Rates API | 1-2 Tage | 🟢 Niedrig |

**Gesamt:** ~2 Wochen

---

## 🔧 **7. CUSTOM APIs & WEBHOOKS**

### **Rolle in der Architektur:**
- ✅ **Flexibilität** - Kunden-spezifische Integrationen
- ✅ **Webhooks** - Outbound Events (Hub → Kunden)

### **API-Strategie:**

#### **7.1 Webhook-System (Hub → Kunden)**

```typescript
// supabase/functions/webhook-trigger/index.ts
// Hub sendet Events an Kunden-Webhooks

export async function triggerWebhook(
  companyId: string,
  event: WebhookEvent,
  data: any
) {
  const webhooks = await getActiveWebhooks(companyId, event);
  
  for (const webhook of webhooks) {
    await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': generateSignature(webhook.secret, data),
      },
      body: JSON.stringify({
        event,
        data,
        timestamp: new Date().toISOString(),
      }),
    });
  }
}
```

#### **7.2 Custom API Integration**

```typescript
// supabase/functions/custom-api-sync/index.ts
// Generische API-Integration für Kunden

POST /functions/v1/custom-api-sync
Body: {
  company_id: string,
  api_url: string,
  api_key: string,
  sync_type: 'orders' | 'inventory' | 'returns'
}
```

---

## 📋 **IMPLEMENTIERUNGS-PRIORITÄTEN**

### **Phase 1: Foundation (Woche 1-4) - KRITISCH**

| System | Task | Aufwand | Priorität |
|--------|------|---------|-----------|
| **BC** | OAuth 2.0 Setup | 1 Tag | 🔴 🔴 🔴 |
| **BC** | Event-Sync (Hub → BC) | 2-3 Tage | 🔴 🔴 🔴 |
| **BC** | OData API Client | 2-3 Tage | 🔴 🔴 🔴 |
| **Azure AD** | SSO Integration | 2-3 Tage | 🔴 🔴 |
| **WooCommerce** | Webhook Receiver | 2-3 Tage | 🔴 🔴 |
| **Shopify** | Webhook Receiver | 2-3 Tage | 🔴 🔴 |

**Gesamt:** ~3-4 Wochen

### **Phase 2: Execution Layer Integration (Woche 5-8)**

| System | Task | Aufwand | Priorität |
|--------|------|---------|-----------|
| **Parallel** | API Reverse Engineering | 1-2 Wochen | 🔴 🔴 🔴 |
| **Parallel** | Job Assignment | 2-3 Tage | 🔴 🔴 🔴 |
| **Parallel** | Event Listener | 2-3 Tage | 🔴 🔴 🔴 |
| **BC** | Polling für neue Orders | 1-2 Tage | 🔴 🔴 |
| **Azure AD** | User Sync | 2-3 Tage | 🟡 |

**Gesamt:** ~3-4 Wochen

### **Phase 3: Erweiterungen (Woche 9-12)**

| System | Task | Aufwand | Priorität |
|--------|------|---------|-----------|
| **DHL/Post CH** | Versand-Integration | 2-3 Wochen | 🟡 |
| **WooCommerce/Shopify** | Inventory Sync | 2-3 Tage | 🟡 |
| **Webhooks** | Outbound Webhooks | 2-3 Tage | 🟢 |

**Gesamt:** ~4-5 Wochen

---

## 🔒 **SICHERHEIT & BEST PRACTICES**

### **1. API Key Management**
- ✅ Bereits implementiert (`ApiKeyManagement.tsx`)
- ✅ Keys werden gehasht gespeichert
- ✅ Expiration-Support vorhanden

### **2. OAuth 2.0 / OpenID Connect**
- ✅ Azure AD SSO (geplant)
- ✅ BC OAuth (geplant)
- ⚠️ Token-Refresh-Logik implementieren

### **3. Rate Limiting**
- ⚠️ Noch nicht implementiert
- ✅ Empfehlung: Supabase Edge Functions Rate Limiting
- ✅ Client-seitige Throttling

### **4. Error Handling & Retry**
```typescript
// lib/utils/apiRetry.ts
export async function apiCallWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
}
```

### **5. Monitoring & Logging**
- ✅ Supabase Edge Functions Logs
- ⚠️ Structured Logging implementieren
- ⚠️ Error Tracking (Sentry, etc.)

---

## 📊 **DATENFLUSS-DIAGRAMM**

```
┌─────────────┐
│   Shopify   │──Webhook──→┌──────────────────┐
│ WooCommerce │            │  Edge Functions  │
└─────────────┘            │  (Webhook Recv)  │
                           └────────┬─────────┘
                                    ↓
                           ┌──────────────────┐
                           │  Supabase DB      │
                           │  (Orders, etc.)   │
                           └────────┬─────────┘
                                    ↓
                           ┌──────────────────┐
                           │ Execution Layer   │
                           │ (Priorisierung)   │
                           └────────┬─────────┘
                                    ↓
                           ┌──────────────────┐
                           │   Parallel API   │
                           │   (Job Assign)   │
                           └────────┬─────────┘
                                    ↓
                           ┌──────────────────┐
                           │     AutoStore     │
                           │   (Execution)     │
                           └──────────────────┘
                                    ↓
                           ┌──────────────────┐
                           │  Event Back       │
                           │  (BC Update)      │
                           └──────────────────┘
```

---

## 🎯 **FAZIT & EMPFEHLUNGEN**

### **Sofort starten (Phase 1):**
1. ✅ **BC Event-Sync** - Hub → BC (kritisch für Execution Layer)
2. ✅ **BC OAuth 2.0** - Moderne API-Integration
3. ✅ **WooCommerce/Shopify Webhooks** - Echtzeit-Orders
4. ✅ **Azure AD SSO** - User Experience

### **Dann (Phase 2):**
5. ✅ **Parallel Integration** - Execution Layer Kern
6. ✅ **BC Polling** - Fallback für Webhooks

### **Später (Phase 3):**
7. ✅ **Versanddienstleister** - Nice-to-have
8. ✅ **Webhooks Outbound** - Kunden-Feature

### **Kritische Erfolgsfaktoren:**
- ✅ **Robuste Error Handling** - APIs können ausfallen
- ✅ **Rate Limiting** - APIs haben Limits
- ✅ **Monitoring** - Integrationen müssen überwacht werden
- ✅ **Fallback-Mechanismen** - Polling als Backup für Webhooks

---

**Erstellt von:** AI Code Analysis  
**Datum:** 2025-12-27  
**Version:** 1.0

