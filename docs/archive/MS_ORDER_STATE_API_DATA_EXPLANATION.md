# MS OrderState API - Welche Daten werden abgerufen?
## Was bringt die Integration konkret?

**Datum:** 2025-12-29

---

## 📊 **WELCHE DATEN LIEFERT DIE MS ORDERSTATE API?**

### **1. Order State (Status)** ✅

**Feld:** `orderState` (numerisch, z.B. `26`)

**Was ist das?**
- Numerischer Status-Code von MS Direct
- Zeigt den aktuellen Bearbeitungsstatus der Order im MS Direct System

**Nutzen:**
- ✅ Vergleich mit internem Status
- ✅ Erkennung von Diskrepanzen
- ✅ Automatische Status-Synchronisation

**In DB gespeichert:** `orders.ms_order_state`

---

### **2. Tracking-Informationen** ✅

**Felder:**
- `trackAndTraceId` - Haupt-Tracking-ID
- `trackAndTraceUrl` - Tracking-URL
- `trackAndTraceIdReturn` - Return-Tracking-ID
- `trackAndTraceUrlReturn` - Return-Tracking-URL

**Was ist das?**
- Versand-Tracking-Informationen von MS Direct
- Wird normalerweise beim Versand generiert

**Nutzen:**
- ✅ **Kunden können Sendung verfolgen** - Tracking-Link in OrderDetail
- ✅ **Return-Tracking** - Auch Retouren können verfolgt werden
- ✅ **Automatische Updates** - Tracking wird automatisch aktualisiert

**In DB gespeichert:**
- `orders.tracking_code` (aus `trackAndTraceId`)
- `orders.tracking_link` (aus `trackAndTraceUrl`)
- `orders.track_and_trace_id_return` (neu)
- `orders.track_and_trace_url_return` (neu)

**Frontend-Anzeige:**
```tsx
// OrderDetail.tsx - Zeile 176-213
{order.tracking_code && (
  <div className="rounded-xl border border-border bg-card p-4 md:p-5 shadow-card">
    <h3>Tracking</h3>
    <code>{order.tracking_code}</code>
    {order.tracking_link && (
      <a href={order.tracking_link} target="_blank">
        Sendung verfolgen
      </a>
    )}
  </div>
)}
```

---

### **3. Invoice-Informationen** ✅

**Felder:**
- `invoiceNo` - Rechnungsnummer
- `invoiceAmount` - Rechnungsbetrag
- `postingDate` - Rechnungsdatum

**Was ist das?**
- Rechnungsdaten von MS Direct
- Wird normalerweise nach Versand erstellt

**Nutzen:**
- ✅ **Rechnungsverfolgung** - Kunden sehen Rechnungsnummer
- ✅ **Finanz-Übersicht** - Rechnungsbetrag wird angezeigt
- ✅ **Buchhaltung** - Rechnungsdatum für Reporting

**In DB gespeichert:**
- `orders.invoice_no` (neu)
- `orders.invoice_amount` (neu)
- `orders.posted_invoice_date` (bereits vorhanden, wird aktualisiert)

**Frontend-Anzeige:**
```tsx
// OrderDetail.tsx - Zeile 256-270
{(order as any).invoice_no && (
  <div className="flex justify-between">
    <span>Rechnungsnummer</span>
    <span>{(order as any).invoice_no}</span>
  </div>
)}
{(order as any).invoice_amount !== undefined && (
  <div className="flex justify-between">
    <span>Rechnungsbetrag</span>
    <span>CHF {Number((order as any).invoice_amount).toFixed(2)}</span>
  </div>
)}
```

---

### **4. Payment State (Zahlungsstatus)** ✅

**Feld:** `paymentState` (boolean: `true` = bezahlt, `false` = offen)

**Was ist das?**
- Zahlungsstatus der Order
- Wird von MS Direct verwaltet

**Nutzen:**
- ✅ **Zahlungsverfolgung** - Kunden sehen, ob Order bezahlt ist
- ✅ **Finanz-Reporting** - Offene Posten können identifiziert werden
- ✅ **Automatische Updates** - Status wird automatisch aktualisiert

**In DB gespeichert:** `orders.payment_state` (neu)

**Frontend-Anzeige:**
```tsx
// OrderDetail.tsx - Zeile 270-278
{(order as any).payment_state !== undefined && (
  <div className="flex justify-between">
    <span>Zahlungsstatus</span>
    <Badge variant={(order as any).payment_state ? 'default' : 'secondary'}>
      {(order as any).payment_state ? 'Bezahlt' : 'Offen'}
    </Badge>
  </div>
)}
```

---

### **5. Shipping Agent (Versanddienstleister)** ✅

**Feld:** `shippingAgent` (z.B. "DHL", "Post CH")

**Was ist das?**
- Versanddienstleister, der die Sendung transportiert

**Nutzen:**
- ✅ **Versand-Info** - Kunden sehen, wer versendet
- ✅ **Tracking-Integration** - Kann für spezifische Tracking-APIs verwendet werden

**In DB gespeichert:** `orders.shipping_agent_code` (bereits vorhanden, wird aktualisiert)

---

### **6. Last Modified (Letzte Änderung)** ✅

**Feld:** `lastModified` (Timestamp)

**Was ist das?**
- Zeitpunkt der letzten Änderung in MS Direct

**Nutzen:**
- ✅ **Change Detection** - Erkennt, ob sich etwas geändert hat
- ✅ **Sync-Optimierung** - Nur bei Änderungen aktualisieren

**In DB gespeichert:** `orders.last_state_sync_at` (Timestamp unserer Sync)

---

## 🎯 **KONKRETER NUTZEN FÜR DEN USER**

### **Was sieht der User in der App?**

#### **1. OrderDetail-Seite:**

**Vorher (ohne MS OrderState API):**
- ❌ Keine Tracking-Informationen (oder manuell eingegeben)
- ❌ Keine Invoice-Informationen
- ❌ Kein Payment-State
- ❌ Status kann veraltet sein

**Nachher (mit MS OrderState API):**
- ✅ **Tracking-Code & Link** - Automatisch von MS Direct
- ✅ **Return-Tracking** - Auch für Retouren
- ✅ **Rechnungsnummer** - Wird automatisch angezeigt
- ✅ **Rechnungsbetrag** - Wird automatisch angezeigt
- ✅ **Zahlungsstatus** - "Bezahlt" oder "Offen" Badge
- ✅ **Aktueller Status** - Immer synchronisiert mit MS Direct

#### **2. Button "Status aktualisieren":**

- ✅ User kann manuell den aktuellen Status abfragen
- ✅ Alle Daten werden sofort aktualisiert
- ✅ Toast-Notification zeigt Erfolg/Fehler

---

## 📊 **DATEN-FLOW**

```
┌─────────────────────┐
│  MS Direct System   │
│  (Business Central) │
└──────────┬──────────┘
           │
           │ SOAP API Request
           │ (orderNo: "1000014")
           ↓
┌─────────────────────┐
│  MS OrderState API  │
│  (soap.ms-direct.ch)│
└──────────┬──────────┘
           │
           │ SOAP XML Response
           │ {
           │   orderState: 26,
           │   trackAndTraceId: "123456789",
           │   trackAndTraceUrl: "https://...",
           │   invoiceNo: "INV-2025-001",
           │   invoiceAmount: 150.00,
           │   paymentState: true,
           │   ...
           │ }
           ↓
┌─────────────────────┐
│  Edge Function      │
│  ms-order-state-*   │
└──────────┬──────────┘
           │
           │ Update Database
           ↓
┌─────────────────────┐
│  Supabase DB        │
│  orders table       │
│  - tracking_code    │
│  - invoice_no       │
│  - payment_state    │
│  - ms_order_state   │
│  ...                │
└──────────┬──────────┘
           │
           │ Query
           ↓
┌─────────────────────┐
│  Frontend           │
│  OrderDetail.tsx    │
│  - Tracking Card   │
│  - Invoice Info    │
│  - Payment Badge    │
└─────────────────────┘
```

---

## 💡 **PRAKTISCHES BEISPIEL**

### **Szenario: Order wurde versendet**

**Ohne MS OrderState API:**
1. Order wird in MS Direct versendet
2. Tracking-Code wird in MS Direct generiert
3. ❌ User muss manuell Tracking-Code in App eintragen
4. ❌ Invoice-Informationen fehlen
5. ❌ Payment-State ist unbekannt

**Mit MS OrderState API:**
1. Order wird in MS Direct versendet
2. Tracking-Code wird in MS Direct generiert
3. ✅ **Automatisch alle 15 Minuten:** API wird abgefragt
4. ✅ **Tracking-Code wird automatisch** in App übernommen
5. ✅ **Invoice wird automatisch** angezeigt (wenn erstellt)
6. ✅ **Payment-State wird automatisch** aktualisiert
7. ✅ **User sieht alles sofort** in OrderDetail

---

## 🎯 **ZUSAMMENFASSUNG**

### **Was die API bringt:**

| Daten | Vorher | Nachher | Nutzen |
|-------|--------|---------|--------|
| **Tracking-Code** | ❌ Manuell | ✅ Automatisch | Kunden können Sendung verfolgen |
| **Tracking-URL** | ❌ Fehlt | ✅ Automatisch | Direkter Link zum Tracking |
| **Return-Tracking** | ❌ Fehlt | ✅ Automatisch | Auch Retouren verfolgbar |
| **Rechnungsnummer** | ❌ Fehlt | ✅ Automatisch | Rechnungsverfolgung |
| **Rechnungsbetrag** | ❌ Fehlt | ✅ Automatisch | Finanz-Übersicht |
| **Zahlungsstatus** | ❌ Unbekannt | ✅ Automatisch | Offene Posten identifizieren |
| **MS Order State** | ❌ Unbekannt | ✅ Automatisch | Status-Synchronisation |

### **Konkreter Mehrwert:**

1. ✅ **Automatisierung** - Keine manuelle Dateneingabe mehr
2. ✅ **Aktualität** - Daten sind immer aktuell (alle 15 Min)
3. ✅ **Vollständigkeit** - Alle wichtigen Daten werden angezeigt
4. ✅ **Kundenservice** - Kunden sehen Tracking & Invoice sofort
5. ✅ **Reporting** - Finanz-Daten für Reporting verfügbar

---

## ❓ **FAQ**

**Q: Werden neue Orders durch die API erstellt?**  
A: **Nein.** Die API aktualisiert nur bestehende Orders.

**Q: Wie oft werden die Daten aktualisiert?**  
A: **Alle 15 Minuten** (wenn Cron Job eingerichtet), oder **manuell** via Button.

**Q: Was passiert, wenn MS Direct noch keine Daten hat?**  
A: Die API gibt leere/null Werte zurück. Die App zeigt dann "—" oder nichts an.

**Q: Kann ich die Sync-Frequenz ändern?**  
A: **Ja.** Ändere die Cron-Expression in der Migration (z.B. `*/5 * * * *` für alle 5 Minuten).

