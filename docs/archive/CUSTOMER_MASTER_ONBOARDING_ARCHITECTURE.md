# Customer Master & Onboarding Architektur
## MS Direct Fulfillment Platform

**Datum:** 2025-12-27  
**Status:** Strategie & Implementierungsplan

---

## 🎯 **KERN-AUSSAGE**

### **Ein Kunde = Einmal angelegt = Überall verfügbar**

**Der Kunde (Tenant) ist das oberste Domänen-Objekt der gesamten Plattform.**

Alles hängt daran:
- ✅ Orders
- ✅ SLA & Prioritäten
- ✅ Branding & UX
- ✅ Integrationen (BC, Shopify, Parallel)
- ✅ Abrechnung
- ✅ Zugriffe & Rollen
- ✅ Standorte & Fulfillment-Typen

---

## 📊 **AKTUELLER STATUS**

### **Was bereits vorhanden ist:**

✅ **Companies Tabelle** - Basis vorhanden
- `id`, `name`, `domain`, `industry`, `brand_keywords`
- `primary_color`, `accent_color`, `logo_url`

✅ **Multi-Tenant Support** - Funktioniert
- `memberships` Tabelle
- `csm_assignments` Tabelle
- RLS-Policies

✅ **Integrationen** - UI vorhanden
- `IntegrationConfig.tsx` - Konfiguration möglich
- `integrations` Tabelle

### **Was fehlt:**

❌ **Vollständiges Customer Master Datenmodell**
- Fulfillment-Konfiguration
- SLA-Templates
- Standorte & Lagerbereiche
- Cut-off-Zeiten
- Retourenlogik

❌ **Geführtes Onboarding**
- Aktuell: Manuelle Erstellung in Settings
- Kein Wizard
- Keine Validierung
- Keine Checkliste

❌ **HubSpot-Integration**
- Keine Verbindung vorhanden
- Keine Synchronisation

❌ **Automatische Provisionierung**
- BC Customer wird nicht automatisch erstellt
- Parallel-Konfiguration manuell
- Keine Test-Order

---

## 🏗️ **CUSTOMER MASTER DATENMODELL**

### **Erweiterte Companies Tabelle**

```sql
-- Erweiterte companies Tabelle (Customer Master)
CREATE TABLE public.companies (
  -- Identität
  id TEXT PRIMARY KEY,                    -- z.B. "GF", "AVI", "NAM"
  name TEXT NOT NULL,                      -- "Golfyr AG"
  domain TEXT,                             -- "golfyr.ch"
  industry TEXT,                           -- "Fashion", "Sports", "Technology"
  brand_keywords TEXT[],                   -- ["golf", "outdoor", "sports"]
  
  -- Branding
  primary_color TEXT,                      -- "#2d3e2f"
  accent_color TEXT,                       -- "#4a6b4c"
  logo_url TEXT,
  
  -- Status & Lifecycle
  status company_status NOT NULL DEFAULT 'onboarding',  -- onboarding | active | paused | archived
  onboarding_started_at TIMESTAMPTZ,
  go_live_date DATE,
  paused_at TIMESTAMPTZ,
  
  -- Fulfillment-Konfiguration
  fulfillment_types fulfillment_type[] NOT NULL DEFAULT ARRAY['fachboden'],  -- fachboden | autostore | both
  locations TEXT[],                        -- ["warehouse_1", "warehouse_2"]
  default_carrier TEXT,                    -- "DHL" | "Post_CH"
  default_packaging TEXT,                  -- "standard" | "eco" | "premium"
  
  -- Cut-off & Peak-Logik
  cut_off_time TIME DEFAULT '15:00',       -- Standard Cut-off
  peak_cut_off_time TIME,                  -- Peak Cut-off (z.B. Black Friday)
  peak_start_date DATE,
  peak_end_date DATE,
  
  -- Retourenlogik
  return_policy TEXT,                      -- "14_days" | "30_days" | "custom"
  return_address_id UUID REFERENCES return_addresses(id),
  auto_process_returns BOOLEAN DEFAULT false,
  
  -- SLA & Priorität
  default_sla_template_id UUID REFERENCES sla_templates(id),
  priority_tier INTEGER DEFAULT 5,        -- 1 (höchste) bis 10 (niedrigste)
  vip_customer BOOLEAN DEFAULT false,
  
  -- Integrationen (Referenzen)
  bc_customer_no TEXT,                    -- BC Customer Number
  bc_company_name TEXT,                   -- BC Company Name
  parallel_customer_id TEXT,               -- Parallel Customer ID
  hubspot_company_id TEXT,                 -- HubSpot Company ID
  
  -- Kontakte
  primary_contact_email TEXT,
  primary_contact_name TEXT,
  billing_contact_email TEXT,
  billing_contact_name TEXT,
  
  -- Metadaten
  notes TEXT,                              -- Interne Notizen
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  onboarded_by UUID REFERENCES auth.users(id)
);

-- Enums
CREATE TYPE company_status AS ENUM (
  'onboarding',    -- In Onboarding
  'active',        -- Live & aktiv
  'paused',        -- Temporär pausiert
  'archived'       -- Archiviert
);

CREATE TYPE fulfillment_type AS ENUM (
  'fachboden',     -- Fachboden-Pick
  'autostore',     -- AutoStore-Pick
  'both'           -- Beides
);
```

### **Neue Tabellen für Customer Master**

```sql
-- SLA Templates (wiederverwendbar)
CREATE TABLE public.sla_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- "Standard 24h", "Express 12h"
  description TEXT,
  processing_hours INTEGER NOT NULL,       -- 24, 48, 72
  shipping_hours INTEGER,                  -- Optional
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Return Addresses
CREATE TABLE public.return_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                      -- "Hauptlager", "Retourenlager"
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'CH',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Company Locations (Lagerbereiche)
CREATE TABLE public.company_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                      -- "Fachboden A", "AutoStore Zone 1"
  location_type fulfillment_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Onboarding Checklist (Tracking)
CREATE TABLE public.onboarding_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  step TEXT NOT NULL,                      -- "basic_info", "shop_integration", "fulfillment_setup", etc.
  status TEXT NOT NULL DEFAULT 'pending', -- pending | in_progress | completed | skipped
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, step)
);
```

---

## 🧭 **ONBOARDING-WIZARD KONZEPT**

### **Ort: Fulfillment Hub → "Customer Onboarding"**

**Zugriff:** Nur MSD-Staff (CSM, MA, System Admin)

### **Wizard-Struktur (6 Steps)**

#### **Step 1: Kunde & Business Info**

**Zweck:** Grundlegende Identität

**Felder:**
- Company ID (z.B. "GF") - **EINMALIG, UNVERÄNDERLICH**
- Company Name (z.B. "Golfyr AG")
- Domain (z.B. "golfyr.ch")
- Industry (Dropdown)
- Brand Keywords (Tags)

**Validierung:**
- Company ID muss eindeutig sein
- Domain-Format prüfen
- Company ID darf keine Sonderzeichen enthalten

**Output:**
- Company in DB angelegt (Status: `onboarding`)
- Onboarding-Checklist gestartet

---

#### **Step 2: Shop-Anbindung**

**Zweck:** Order-Source konfigurieren

**Felder:**
- Shop-Typ (Shopify / WooCommerce / Custom)
- Store URL / Store Name
- API Keys / Credentials
- Webhook-Test (optional)

**Validierung:**
- API-Verbindung testen
- Test-Order abrufen (falls möglich)

**Output:**
- Integration in `integrations` Tabelle
- Webhook-URL generiert
- Test-Order erstellt (falls möglich)

---

#### **Step 3: Fulfillment Setup**

**Zweck:** Operative Konfiguration

**Felder:**
- Fulfillment-Typen (Fachboden / AutoStore / Beides)
- Standorte (Multi-Select)
- Standard-Carrier (DHL / Post CH)
- Standard-Verpackung
- Cut-off-Zeit
- Peak-Perioden (optional)

**Validierung:**
- Mindestens 1 Standort auswählen
- Cut-off-Zeit im Format HH:MM

**Output:**
- `company_locations` Einträge
- Fulfillment-Konfiguration gespeichert

---

#### **Step 4: SLA & Priorität**

**Zweck:** Service-Level definieren

**Felder:**
- SLA-Template auswählen (oder Custom)
- Custom Processing Hours (falls Template)
- Priority Tier (1-10)
- VIP-Kunde? (Checkbox)

**Validierung:**
- Processing Hours > 0
- Priority Tier zwischen 1-10

**Output:**
- SLA-Regel in `sla_rules` Tabelle
- Priority gespeichert

---

#### **Step 5: System-Integrationen**

**Zweck:** BC, Parallel, HubSpot verbinden

**Felder:**
- **Business Central:**
  - BC Customer No. (manuell oder automatisch)
  - BC Company Name
  - OAuth-Credentials (falls neu)
  
- **Parallel Software:**
  - Parallel Customer ID (falls bekannt)
  - AutoStore-Konfiguration (falls AutoStore)
  
- **HubSpot:**
  - HubSpot Company ID (aus HubSpot auswählen)
  - Sync-Richtung (HubSpot → Hub / Bidirektional)

**Validierung:**
- BC Customer No. prüfen (falls vorhanden)
- HubSpot Company ID prüfen (falls vorhanden)

**Output:**
- BC Customer automatisch erstellt (via API, falls möglich)
- Parallel-Konfiguration gespeichert
- HubSpot-Sync aktiviert

---

#### **Step 6: Review & Go-Live**

**Zweck:** Finale Prüfung & Aktivierung

**Anzeige:**
- ✅ Checkliste (alle Steps)
- 📊 Zusammenfassung (alle Konfigurationen)
- ⚠️ Warnungen (fehlende Felder)
- 🧪 Test-Order-Button

**Aktionen:**
- Test-Order erstellen
- Go-Live aktivieren
- E-Mail an Kunde senden

**Output:**
- Company Status: `onboarding` → `active`
- `go_live_date` gesetzt
- Onboarding-Checklist abgeschlossen
- E-Mail-Benachrichtigung

---

## 🔄 **HUBSPOT-INTEGRATION**

### **Rollenverteilung (wichtig!)**

| System | Rolle |
|--------|-------|
| **HubSpot** | Lead- & Deal-Master, Sales-Pipeline, Kontakte, Kommunikation |
| **Fulfillment Hub** | Operativer Customer Master, SLA, Fulfillment Setup, Technische Integrationen |

### **Synchronisation (bidirektional, aber kontrolliert)**

#### **HubSpot → Hub (Onboarding-Trigger)**

```typescript
// supabase/functions/hubspot-sync/index.ts
// Webhook von HubSpot: Deal gewonnen → Kunde "bereit für Onboarding"

POST /functions/v1/hubspot-sync
Body: {
  event: 'deal.won',
  deal_id: string,
  company_id: string,  // HubSpot Company ID
  company_name: string,
  amount: number,
  close_date: string
}
```

**Flow:**
1. HubSpot Deal gewonnen
2. HubSpot sendet Webhook → Hub
3. Hub erstellt Company (Status: `onboarding`)
4. Hub sendet E-Mail an CSM: "Neuer Kunde bereit für Onboarding"
5. CSM startet Onboarding-Wizard

#### **Hub → HubSpot (Status-Updates)**

```typescript
// Nach Onboarding Step 6 (Go-Live)
export async function syncToHubSpot(companyId: string) {
  const company = await getCompany(companyId);
  
  await hubspotClient.updateCompany(company.hubspot_company_id, {
    customFields: {
      msd_customer_status: company.status,  // "active"
      msd_go_live_date: company.go_live_date,
      msd_fulfillment_types: company.fulfillment_types.join(','),
      msd_sla_hours: company.default_sla_template.processing_hours,
    },
  });
}
```

### **HubSpot API Client**

```typescript
// lib/integrations/hubspotClient.ts
export class HubSpotClient {
  private accessToken: string;
  
  async getCompanies(): Promise<HubSpotCompany[]> {
    const response = await fetch(
      'https://api.hubapi.com/crm/v3/objects/companies',
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );
    return response.json();
  }
  
  async updateCompany(companyId: string, data: any) {
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/companies/${companyId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties: data }),
      }
    );
    return response.json();
  }
}
```

---

## 🚀 **IMPLEMENTIERUNGS-ROADMAP**

### **Phase 1: Datenmodell erweitern (Woche 1)**

| Task | Aufwand | Priorität |
|------|---------|-----------|
| Migration: Erweiterte companies Tabelle | 1 Tag | 🔴 Hoch |
| Migration: SLA Templates | 0.5 Tage | 🔴 Hoch |
| Migration: Return Addresses | 0.5 Tage | 🔴 Hoch |
| Migration: Company Locations | 0.5 Tage | 🔴 Hoch |
| Migration: Onboarding Checklist | 0.5 Tage | 🔴 Hoch |

**Gesamt:** ~3 Tage

---

### **Phase 2: Onboarding-Wizard (Woche 2-3)**

| Task | Aufwand | Priorität |
|------|---------|-----------|
| Wizard-Komponente (Multi-Step) | 2-3 Tage | 🔴 Hoch |
| Step 1: Basic Info | 1 Tag | 🔴 Hoch |
| Step 2: Shop Integration | 1-2 Tage | 🔴 Hoch |
| Step 3: Fulfillment Setup | 1-2 Tage | 🔴 Hoch |
| Step 4: SLA & Priority | 1 Tag | 🔴 Hoch |
| Step 5: System Integrationen | 2-3 Tage | 🔴 Hoch |
| Step 6: Review & Go-Live | 1-2 Tage | 🔴 Hoch |
| Onboarding-Checklist UI | 1 Tag | 🟡 Mittel |

**Gesamt:** ~2-3 Wochen

---

### **Phase 3: HubSpot-Integration (Woche 4-5)**

| Task | Aufwand | Priorität |
|------|---------|-----------|
| HubSpot API Client | 2 Tage | 🟡 Mittel |
| HubSpot Webhook Receiver | 1-2 Tage | 🟡 Mittel |
| Hub → HubSpot Sync | 1-2 Tage | 🟡 Mittel |
| HubSpot Company Selector (Step 5) | 1 Tag | 🟡 Mittel |

**Gesamt:** ~1-2 Wochen

---

### **Phase 4: Automatische Provisionierung (Woche 6)**

| Task | Aufwand | Priorität |
|------|---------|-----------|
| BC Customer Creation (API) | 2-3 Tage | 🟡 Mittel |
| Parallel-Konfiguration | 1-2 Tage | 🟢 Niedrig |
| Test-Order-Generierung | 1 Tag | 🟡 Mittel |

**Gesamt:** ~1 Woche

---

## 📋 **ONBOARDING-WIZARD UI-KONZEPT**

### **Komponenten-Struktur**

```
src/pages/CustomerOnboarding.tsx
├── OnboardingWizard.tsx (Container)
│   ├── StepIndicator.tsx (Progress Bar)
│   ├── Step1BasicInfo.tsx
│   ├── Step2ShopIntegration.tsx
│   ├── Step3FulfillmentSetup.tsx
│   ├── Step4SLAPriority.tsx
│   ├── Step5SystemIntegrations.tsx
│   └── Step6ReviewGoLive.tsx
└── OnboardingChecklist.tsx (Sidebar)
```

### **Design-Prinzipien**

- ✅ **Progress Bar** - Zeigt aktuellen Step
- ✅ **Back/Next Buttons** - Navigation zwischen Steps
- ✅ **Validierung** - Pro Step, kein Weiter ohne Validierung
- ✅ **Auto-Save** - Jeder Step wird automatisch gespeichert
- ✅ **Checklist** - Sidebar zeigt Fortschritt
- ✅ **Warnungen** - Zeigt fehlende Felder

---

## 🎯 **FAZIT & EMPFEHLUNGEN**

### **✅ Klare Antworten auf deine Fragen:**

1. **Soll der Kunde zentral geführt werden?**
   - ✅ **JA** - Ein zentraler Customer Master im Fulfillment Hub

2. **Wo soll das Onboarding stattfinden?**
   - ✅ **Fulfillment Hub** - Geführter Wizard für MSD-Staff

3. **Wie soll HubSpot integriert werden?**
   - ✅ **HubSpot als Trigger** - Deal gewonnen → Onboarding starten
   - ✅ **Hub → HubSpot Sync** - Status-Updates nach Go-Live
   - ✅ **HubSpot nicht als Master** - Hub bleibt operative Wahrheit

### **✅ Nächste Schritte:**

1. **Sofort:** Datenmodell erweitern (Phase 1)
2. **Dann:** Onboarding-Wizard implementieren (Phase 2)
3. **Parallel:** HubSpot-Integration (Phase 3)

### **✅ Vorteile dieser Architektur:**

- ✅ **Einmal Onboarding** - Überall verfügbar
- ✅ **Keine doppelte Pflege** - Eine Quelle der Wahrheit
- ✅ **Automatisierung** - BC, Parallel, HubSpot automatisch provisioniert
- ✅ **Skalierbar** - Neue Apps nutzen einfach `company_id`
- ✅ **Nachvollziehbar** - Onboarding-Checklist zeigt Fortschritt

---

**Erstellt von:** AI Code Analysis  
**Datum:** 2025-12-27  
**Version:** 1.0

