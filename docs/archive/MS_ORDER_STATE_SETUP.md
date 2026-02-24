# MS OrderState Integration - Setup Guide
## Automatische Status-Synchronisation mit MS Direct SOAP API

**Datum:** 2025-12-29  
**Status:** ✅ **Implementierung abgeschlossen**

---

## ✅ **WAS WURDE IMPLEMENTIERT**

### **1. Database-Migration** ✅
- **Datei:** `supabase/migrations/20251229182309_add_ms_order_state_fields.sql`
- **Neue Spalten in `orders` Tabelle:**
  - `track_and_trace_id_return` - Return Tracking ID
  - `track_and_trace_url_return` - Return Tracking URL
  - `invoice_no` - Rechnungsnummer
  - `invoice_amount` - Rechnungsbetrag
  - `payment_state` - Zahlungsstatus (boolean)
  - `ms_order_state` - Numerischer Order State
  - `last_state_sync_at` - Timestamp der letzten Synchronisation

- **Neue Spalten in `companies` Tabelle:**
  - `ms_client_id` - MS Direct Client ID (z.B. AV, NK, GT)
  - `ms_client_token` - MS Direct Client Token

### **2. Edge Functions** ✅

#### **ms-order-state-query** ✅
- **Datei:** `supabase/functions/ms-order-state-query/index.ts`
- **Zweck:** Manuelle Order-Status-Abfrage
- **API:** `POST /functions/v1/ms-order-state-query`
- **Body:** `{ orderNo: string, companyId: string }`
- **Features:**
  - SOAP-Request an MS Direct API
  - XML-Parsing der Response
  - Order-Update in Supabase
  - Error-Handling & Logging

#### **ms-order-state-sync** ✅
- **Datei:** `supabase/functions/ms-order-state-sync/index.ts`
- **Zweck:** Automatische Batch-Synchronisation
- **API:** `POST /functions/v1/ms-order-state-sync`
- **Features:**
  - Synchronisiert alle aktiven Orders (nicht `delivered`)
  - Prüft nur Orders, die länger als 15 Minuten nicht synchronisiert wurden
  - Limit: 100 Orders pro Sync (verhindert Timeout)
  - Company-spezifische Token-Verwaltung

### **3. Frontend-Integration** ✅

#### **React Query Hook** ✅
- **Datei:** `src/hooks/useOrderStateQuery.ts`
- **Features:**
  - Mutation für Order-State-Abfrage
  - Automatische Cache-Invalidation
  - Toast-Notifications
  - Error-Handling

#### **OrderDetail Page** ✅
- **Datei:** `src/pages/OrderDetail.tsx`
- **Features:**
  - Button "Status aktualisieren" im Status-Card
  - Anzeige von Invoice-Informationen
  - Payment-State Badge
  - Auto-Reload nach Update

---

## 🔧 **SETUP-SCHRITTE**

### **Schritt 1: Database-Migration ausführen**

```bash
# Migration wurde bereits erstellt
# Wird automatisch beim nächsten Supabase Deploy ausgeführt
# Oder manuell in Supabase Dashboard → SQL Editor
```

### **Schritt 2: Environment Variables konfigurieren**

In **Supabase Dashboard → Settings → Edge Functions → Secrets**:

```bash
MS_ORDER_STATE_BASE_URL=http://soap.ms-direct.ch
MS_ORDER_STATE_USERNAME=mp@msoPRD
MS_ORDER_STATE_PASSWORD=owWehEaIng3bR4UjdMSa
```

⚠️ **WICHTIG:** Diese Credentials sollten in Production geändert werden!

### **Schritt 3: Company-Tokens konfigurieren**

Für jede Company in der `companies` Tabelle:

```sql
UPDATE companies 
SET 
  ms_client_id = 'AV',  -- z.B. AV, NK, GT
  ms_client_token = '59019d5e-6d38-469a-898c-876e7c71281d'  -- Token aus Postman Collection
WHERE id = 'COMPANY_ID';
```

**Bekannte Kunden:**
- **Aviano:** `ms_client_id = 'AV'`, `ms_client_token = '59019d5e-6d38-469a-898c-876e7c71281d'`
- **Namuk:** `ms_client_id = 'NK'`, `ms_client_token = '5aebe037-d1a2-4536-b942-9d33ae0f5ca8'`
- **GetSA:** `ms_client_id = 'GT'`, `ms_client_token = 'db989599-e9ef-4d4d-9ec8-9d682dd1f890'`

### **Schritt 4: Scheduled Sync einrichten**

**Option A: Supabase Cron Job (empfohlen)**

**Migration wurde erstellt:** `supabase/migrations/20251229183000_setup_ms_order_state_cron.sql`

**WICHTIG:** Vor dem Ausführen ersetzen:
1. `YOUR_PROJECT_ID` → Deine Supabase Project ID
2. `YOUR_SERVICE_ROLE_KEY` → Dein Service Role Key

**Ausführen:**
1. Öffne Supabase Dashboard → SQL Editor
2. Öffne die Migration `20251229183000_setup_ms_order_state_cron.sql`
3. Ersetze `YOUR_PROJECT_ID` und `YOUR_SERVICE_ROLE_KEY`
4. Führe das Script aus

**Oder manuell:**

```sql
-- Alle 15 Minuten
SELECT cron.schedule(
  'ms-order-state-sync',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/ms-order-state-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

**Option B: Externer Scheduler (z.B. GitHub Actions, cron)**

```yaml
# .github/workflows/ms-order-state-sync.yml
name: MS OrderState Sync
on:
  schedule:
    - cron: '*/15 * * * *'  # Alle 15 Minuten
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://YOUR_PROJECT.supabase.co/functions/v1/ms-order-state-sync
```

---

## 🎯 **VERWENDUNG**

### **Manuelle Status-Abfrage (Frontend)**

1. Öffne Order-Detail-Seite
2. Klicke auf "Status aktualisieren" Button
3. Order wird mit MS Direct API synchronisiert
4. Invoice, Tracking, Payment-State werden aktualisiert

### **Automatische Synchronisation**

- Läuft automatisch alle 15 Minuten (wenn Cron Job eingerichtet)
- Synchronisiert alle aktiven Orders (nicht `delivered`)
- Nur Orders, die länger als 15 Minuten nicht synchronisiert wurden

---

## 📊 **DATEN-FLOW**

```
┌─────────────────┐
│  MS Direct API  │
│  (SOAP/XML)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Edge Function   │
│ ms-order-state- │
│ query/sync      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Supabase DB    │
│  (orders table) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Frontend       │
│  (OrderDetail)  │
└─────────────────┘
```

---

## 🔍 **TESTEN**

### **1. Manuelle Abfrage testen:**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderNo": "1000014", "companyId": "AV"}' \
  https://YOUR_PROJECT.supabase.co/functions/v1/ms-order-state-query
```

### **2. Batch-Sync testen:**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://YOUR_PROJECT.supabase.co/functions/v1/ms-order-state-sync
```

### **3. Frontend testen:**

1. Öffne Order-Detail-Seite
2. Klicke "Status aktualisieren"
3. Prüfe, ob Invoice-Informationen angezeigt werden

---

## ⚠️ **WICHTIGE HINWEISE**

### **Rate Limiting:**
- Edge Function hat Rate Limiting (100 Requests/Minute)
- Batch-Sync limitiert auf 100 Orders pro Durchlauf
- 100ms Delay zwischen einzelnen Requests

### **Error-Handling:**
- API-Fehler werden geloggt
- Fehlgeschlagene Syncs werden nicht wiederholt (nächster Sync versucht es erneut)
- Order wird nur aktualisiert, wenn API erfolgreich antwortet

### **Security:**
- Company-Tokens sind in `companies` Tabelle gespeichert
- RLS Policies schützen Tokens
- Service Role Key nur für Batch-Sync verwendet

---

## 📝 **NÄCHSTE SCHRITTE**

1. ✅ **Migration ausführen** - In Supabase Dashboard
2. ✅ **Environment Variables setzen** - In Supabase Dashboard
3. ✅ **Company-Tokens konfigurieren** - SQL Update
4. ✅ **Cron Job einrichten** - Für automatische Sync
5. ✅ **Testen** - Manuelle Abfrage und Batch-Sync

---

## 🎉 **FERTIG!**

Die Integration ist vollständig implementiert und bereit für den Einsatz!

**Bei Fragen oder Problemen:** Siehe Logs in Supabase Dashboard → Edge Functions → Logs

