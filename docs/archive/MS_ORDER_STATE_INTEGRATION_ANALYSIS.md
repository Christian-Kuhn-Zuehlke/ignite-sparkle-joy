# MS OrderState SOAP API - Integrations-Analyse
## Postman Collection Analyse & Integrations-Strategie

**Datum:** 2025-12-27  
**Status:** 📋 **Analyse abgeschlossen - Integrations-Plan erstellt**

---

## 📋 **WAS IST DAS?**

### **MS OrderState SOAP API**

Eine **SOAP-basierte API** von MS Direct, um den **aktuellen Status von Bestellungen** abzufragen.

**Zweck:**
- ✅ **Order-Status abfragen** - Aktueller Status einer Bestellung
- ✅ **Tracking-Informationen** - Track & Trace IDs und URLs
- ✅ **Order-Details** - Vollständige Order-Informationen
- ✅ **Payment-Status** - Zahlungsstatus prüfen
- ✅ **Invoice-Informationen** - Rechnungsnummern und Beträge

---

## 🔍 **ANALYSE DER POSTMAN COLLECTION**

### **1. API-Endpoint**

```
URL: http://soap.ms-direct.ch/services/MS_DynamicOrderState/msOrderState
Method: POST
Content-Type: text/xml; charset=utf-8
SOAPAction: document/http://localhost:6060/:orderState
```

### **2. Authentifizierung**

**Basic Auth:**
- **Username:** `mp@msoPRD`
- **Password:** `owWehEaIng3bR4UjdMSa`

⚠️ **WICHTIG:** Diese Credentials sollten in **Environment Variables** gespeichert werden!

### **3. Kunden-Konfiguration**

Die Collection enthält **3 verschiedene Kunden**:

| Kunde | Client ID | Client Name | Token |
|-------|-----------|-------------|-------|
| **Aviano** | `AV` | `Aviano` | `59019d5e-6d38-469a-898c-876e7c71281d` |
| **Namuk** | `NK` | `Namuk` | `5aebe037-d1a2-4536-b942-9d33ae0f5ca8` |
| **GetSA** | `GT` | `GetSA` | `db989599-e9ef-4d4d-9ec8-9d682dd1f890` |

### **4. Request-Struktur**

**SOAP Envelope:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <tns:orderState xmlns:tns="http://ms-direct.ch/soap/msSoapDataHandling">
      <tns:orderStateRequest>
        <tns:messageHeader>
          <tns:clientId>AV</tns:clientId>
          <tns:clientName>Aviano</tns:clientName>
          <tns:token>59019d5e-6d38-469a-898c-876e7c71281d</tns:token>
        </tns:messageHeader>
        <tns:request>
          <tns:orderNo>1000014</tns:orderNo>
          <tns:requestDate>2025-12-29</tns:requestDate>
        </tns:request>
      </tns:orderStateRequest>
    </tns:orderState>
  </soap:Body>
</soap:Envelope>
```

**Parameter:**
- `orderNo` - Bestellnummer (z.B. `1000014` oder `1001771-GT`)
- `requestDate` - Optional, Datum der Anfrage

### **5. Response-Struktur**

**Enthält:**
- ✅ **Order Status** - Numerischer Status (z.B. `26`)
- ✅ **Tracking-Informationen** - `trackAndTraceId`, `trackAndTraceUrl`
- ✅ **Shipping Agent** - Versanddienstleister
- ✅ **Invoice-Informationen** - `invoiceNo`, `invoiceAmount`
- ✅ **Payment State** - `paymentState` (boolean)
- ✅ **Order Lines** - Detaillierte Zeilen-Informationen
- ✅ **Customer-Informationen** - `sellTo`, `shipTo` Adressen
- ✅ **Additional Information** - Zusätzliche Metadaten

---

## 🎯 **WAS SOLLST DU DAMIT MACHEN?**

### **Option 1: Order-Status-Synchronisation** ⭐⭐⭐⭐⭐ **EMPFOHLEN**

**Zweck:** Regelmäßig Order-Status von MS Direct abfragen und in der App aktualisieren.

**Use Cases:**
- ✅ **Automatische Status-Updates** - Orders werden automatisch aktualisiert
- ✅ **Tracking-Synchronisation** - Tracking-IDs werden automatisch übernommen
- ✅ **Invoice-Synchronisation** - Rechnungsnummern werden aktualisiert
- ✅ **Payment-Status** - Zahlungsstatus wird geprüft

**Implementierung:**
- Edge Function: `ms-order-state-sync`
- Scheduled Job (z.B. alle 15 Minuten)
- Oder: Manueller Trigger von der UI

---

### **Option 2: On-Demand Order-Status-Abfrage** ⭐⭐⭐⭐

**Zweck:** User kann manuell den Status einer Order abfragen.

**Use Cases:**
- ✅ **"Status aktualisieren" Button** in Order-Detail-View
- ✅ **Real-time Status-Check** vor wichtigen Aktionen
- ✅ **Debugging** - Status-Verifizierung

**Implementierung:**
- Edge Function: `ms-order-state-query`
- Frontend: Button in `OrderDetail.tsx`
- React Query Hook: `useOrderStateQuery`

---

### **Option 3: Webhook-Integration** ⭐⭐⭐

**Zweck:** MS Direct sendet Status-Updates an die App (falls verfügbar).

**Use Cases:**
- ✅ **Echtzeit-Updates** - Sofortige Status-Änderungen
- ✅ **Kein Polling nötig** - Effizienter

**Implementierung:**
- Edge Function: `ms-order-state-webhook`
- Webhook-Endpoint in Supabase

---

## 🚀 **EMPFOHLENE IMPLEMENTIERUNG**

### **Phase 1: Edge Function für Order-Status-Abfrage** (2-3 Tage)

**Datei:** `supabase/functions/ms-order-state-query/index.ts`

**Features:**
- ✅ SOAP-Request an MS Direct API
- ✅ XML-Parsing der Response
- ✅ Order-Update in Supabase DB
- ✅ Error-Handling & Logging
- ✅ Company-spezifische Token-Verwaltung

**API:**
```typescript
POST /functions/v1/ms-order-state-query
Headers:
  Authorization: Bearer {supabase_jwt}
Body: {
  orderNo: string,
  companyId: string
}
```

---

### **Phase 2: Scheduled Sync Job** (1-2 Tage)

**Datei:** `supabase/functions/ms-order-state-sync/index.ts`

**Features:**
- ✅ Läuft alle 15-30 Minuten
- ✅ Prüft alle "aktiven" Orders (nicht `delivered`)
- ✅ Aktualisiert Status, Tracking, Invoice
- ✅ Loggt Änderungen

**Trigger:**
- Supabase Cron Job
- Oder: Externer Scheduler (z.B. GitHub Actions)

---

### **Phase 3: Frontend-Integration** (1 Tag)

**Datei:** `src/hooks/useOrderStateQuery.ts`

**Features:**
- ✅ React Query Hook
- ✅ Manueller Status-Refresh
- ✅ Loading & Error States
- ✅ Optimistic Updates

**UI:**
- Button in `OrderDetail.tsx`: "Status aktualisieren"
- Auto-Refresh alle 5 Minuten (optional)

---

## 📊 **DATENBANK-STRUKTUR**

### **Erweiterte Order-Felder (falls noch nicht vorhanden):**

```sql
-- Tracking-Informationen
ALTER TABLE orders ADD COLUMN IF NOT EXISTS track_and_trace_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS track_and_trace_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS track_and_trace_id_return TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS track_and_trace_url_return TEXT;

-- Invoice-Informationen
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_amount DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_state BOOLEAN DEFAULT false;

-- MS Direct Status
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ms_order_state INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_state_sync_at TIMESTAMPTZ;
```

### **Company-Token-Verwaltung:**

```sql
-- Erweitere companies Tabelle
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ms_client_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ms_client_token TEXT;
```

---

## 🔐 **SECURITY & CONFIGURATION**

### **Environment Variables (Supabase):**

```bash
# MS Direct SOAP API
MS_ORDER_STATE_BASE_URL=http://soap.ms-direct.ch
MS_ORDER_STATE_USERNAME=mp@msoPRD
MS_ORDER_STATE_PASSWORD=owWehEaIng3bR4UjdMSa
```

### **Company-spezifische Tokens:**

- ✅ In `companies` Tabelle speichern
- ✅ RLS Policy: Nur eigene Company-Tokens lesbar
- ✅ Encryption für Tokens (optional)

---

## 📝 **IMPLEMENTIERUNGS-PLAN**

### **Schritt 1: Edge Function erstellen** (2-3 Tage)

1. ✅ `supabase/functions/ms-order-state-query/index.ts` erstellen
2. ✅ SOAP-Request-Logik implementieren
3. ✅ XML-Parsing (verwende `xml2js` oder ähnlich)
4. ✅ Order-Update in Supabase
5. ✅ Error-Handling & Logging

### **Schritt 2: Database-Migration** (30 Min)

1. ✅ Neue Spalten zu `orders` Tabelle hinzufügen
2. ✅ `ms_client_id` und `ms_client_token` zu `companies` hinzufügen
3. ✅ Indizes für Performance

### **Schritt 3: Frontend-Integration** (1 Tag)

1. ✅ React Query Hook erstellen
2. ✅ Button in `OrderDetail.tsx` hinzufügen
3. ✅ Status-Anzeige erweitern

### **Schritt 4: Scheduled Sync** (1-2 Tage)

1. ✅ Edge Function für Batch-Sync
2. ✅ Supabase Cron Job konfigurieren
3. ✅ Monitoring & Alerts

---

## 🎯 **NÄCHSTE SCHRITTE**

### **Sofort starten:**

1. ✅ **Edge Function erstellen** - `ms-order-state-query`
2. ✅ **Database-Migration** - Neue Spalten hinzufügen
3. ✅ **Test mit Postman Collection** - Verifizieren, dass API funktioniert

### **Dann:**

4. ✅ **Frontend-Integration** - Button in Order-Detail
5. ✅ **Scheduled Sync** - Automatische Updates

---

## ❓ **FRAGEN ZU KLÄREN**

1. **Wie oft sollen Orders synchronisiert werden?**
   - Alle 15 Minuten?
   - Nur bei Status-Änderungen?
   - Manuell?

2. **Welche Orders sollen synchronisiert werden?**
   - Alle aktiven Orders?
   - Nur bestimmte Status?
   - Nur bestimmte Kunden?

3. **Sind alle Kunden in der Collection?**
   - Gibt es weitere Kunden mit anderen Tokens?
   - Wie werden neue Kunden hinzugefügt?

4. **Gibt es Webhook-Support?**
   - Kann MS Direct Webhooks senden?
   - Oder nur Polling möglich?

---

## ✅ **FAZIT**

**Die Postman Collection zeigt:**
- ✅ SOAP API für Order-Status-Abfragen
- ✅ 3 Kunden mit unterschiedlichen Tokens
- ✅ Detaillierte Response-Struktur

**Empfohlene Aktion:**
1. **Edge Function erstellen** für Order-Status-Abfragen
2. **Scheduled Sync** für automatische Updates
3. **Frontend-Integration** für manuelle Abfragen

**Geschätzter Aufwand:** 4-6 Tage

---

**Soll ich mit der Implementierung starten?** 🚀

