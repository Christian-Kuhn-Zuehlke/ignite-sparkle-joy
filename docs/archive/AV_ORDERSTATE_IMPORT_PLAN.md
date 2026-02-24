# AV OrderState Import Plan
## Wie importiere ich die AV_OrderState Dateien?

**Datum:** 2025-12-30  
**Status:** ✅ **Dateien analysiert - Format kompatibel!**

---

## ✅ **ANALYSE ERGEBNIS**

### **Dateien gefunden:**
- ✅ `AV_OrderState_ 2025-09-02..2025-12-30` (65MB) - **NEUESTE**
- ✅ `AV_OrderState_ 2025-06-02..2025-09-01` (44MB)
- ✅ `AV_OrderState_ 2025-03-02..2025-06-01` (42MB)
- ✅ `AV_OrderState_ 2024-12-02..2025-03-01` (54MB)
- ✅ `AV_OrderState_2023-12-01_2024-03-01` (43MB)

### **Format:**
- ✅ **XML im SOAP-Format**
- ✅ **Struktur:** `<WSIFOrdRespEshop>` Elemente
- ✅ **Kompatibel mit:** `xml-import` und `xml-import-bulk` Edge Functions

### **Inhalt:**
- ✅ **Orders vom 30.12.2025** (neueste Datei)
- ✅ **Vollständige Order-Daten** (Header + Lines)
- ✅ **Tracking-Informationen** bereits enthalten
- ✅ **Invoice-Informationen** bereits enthalten

---

## 🎯 **IMPORT-OPTIONEN**

### **Option 1: Über UI (xml-import)** ✅ **EMPFOHLEN**

**Vorteile:**
- ✅ Einfach zu bedienen
- ✅ Progress-Feedback
- ✅ Automatische Fehlerbehandlung

**Schritte:**
1. Gehe zu **Orders** Seite (`/orders`)
2. Klicke auf **"Daten importieren"** Button (UniversalDataImport)
3. Wähle die neueste Datei: `AV_OrderState_ 2025-09-02..2025-12-30`
4. Warte auf Import (kann 2-5 Minuten dauern bei 65MB)
5. Wiederhole für ältere Dateien (falls gewünscht)

**Limits:**
- ⚠️ Dateigröße: Max. ~100MB (Supabase Edge Function Limit)
- ✅ 65MB Datei sollte funktionieren

---

### **Option 2: Über API (xml-import-bulk)** ✅ **FÜR GROSSE DATEIEN**

**Vorteile:**
- ✅ Optimiert für große Dateien
- ✅ Chunked Processing
- ✅ Weniger Memory-Usage

**Schritte:**
1. Datei in Base64 konvertieren (optional)
2. POST Request an `xml-import-bulk` Edge Function
3. Warte auf Import

**Code-Beispiel:**
```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/xml-import-bulk \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/xml" \
  --data-binary "@/Users/milostoessel/Downloads/Test_Files/AV_OrderState_ 2025-09-02..2025-12-30"
```

---

### **Option 3: Direkt über Supabase Dashboard** ✅ **FALLBACK**

**Schritte:**
1. Öffne Supabase Dashboard → Edge Functions
2. Wähle `xml-import` oder `xml-import-bulk`
3. Führe Test aus mit XML-Inhalt
4. Oder: Upload über Supabase Storage, dann Edge Function aufrufen

---

## 📋 **WAS WIRD IMPORTIERT?**

### **Order Header:**
- ✅ `Source_No` → `source_no`
- ✅ `External_Document_No` → `external_document_no`
- ✅ `OrderDate` → `order_date`
- ✅ `ShipTo_Name` → `ship_to_name`
- ✅ `ShipTo_Address` → `ship_to_address`
- ✅ `ShipTo_Postcode` → `ship_to_postcode`
- ✅ `ShipTo_City` → `ship_to_city`
- ✅ `OrderAmount_Info` → `order_amount`
- ✅ `Tracking_Code_last` → `tracking_code`
- ✅ `Tracking_Link_last` → `tracking_link`
- ✅ `Posted_Shipmnt_Date` → `posted_shipment_date`
- ✅ `Posted_Invoice_Date` → `posted_invoice_date`
- ✅ `Posted_Invoice_Last_No` → wird in `invoice_no` gespeichert (falls Feld existiert)
- ✅ `Posted_Invoice_Amt_Total` → wird in `invoice_amount` gespeichert (falls Feld existiert)
- ✅ `Shipment_Status` → `status` (gemappt)

### **Order Lines:**
- ✅ `No` → `sku`
- ✅ `Description` → `name`
- ✅ `Qty` → `quantity`
- ✅ `Unit_Price` → `price`

### **Zusätzliche Felder (aus AV_OrderState):**
- ✅ `Return_Tracking_Code_last` → `track_and_trace_id_return` (falls Feld existiert)
- ✅ `Return_Tracking_Link_last` → `track_and_trace_url_return` (falls Feld existiert)
- ✅ `Shipping_Agent_Code` → `shipping_agent_code`
- ✅ `Company_ID` → `company_id` (gemappt)

---

## ⚠️ **WICHTIGE HINWEISE**

### **1. Duplikate:**
- ✅ Bestehende Orders werden **aktualisiert** (nicht dupliziert)
- ✅ Neue Orders werden **eingefügt**
- ✅ Matching über `source_no` + `company_id`

### **2. Company Mapping:**
- ✅ `Company_ID: "AV"` → wird zu `company_id` in DB gemappt
- ✅ Mapping in `_shared/orderUtils.ts` prüfen

### **3. Status Mapping:**
- ✅ `Shipment_Status: "Shipped"` → `status: "shipped"`
- ✅ `Shipment_Status: "In_Process"` → `status: "processing"`
- ✅ Mapping in `_shared/orderUtils.ts` prüfen

### **4. Datum-Format:**
- ✅ `OrderDate: "2025-12-30"` → wird korrekt geparst
- ✅ `Posted_Shipmnt_Date: "0001-01-01"` → wird als `null` behandelt

---

## 🚀 **EMPFOHLENER ABLAUF**

### **Schritt 1: Neueste Datei importieren** ⭐

**Datei:** `AV_OrderState_ 2025-09-02..2025-12-30` (65MB)

**Warum zuerst:**
- Enthält die neuesten Orders (bis 30.12.2025)
- Aktualisiert alle bestehenden Orders
- Fügt alle fehlenden Orders hinzu

**Zeitaufwand:** ~3-5 Minuten

---

### **Schritt 2: Ältere Dateien importieren (optional)**

**Nur wenn:**
- Historische Daten fehlen
- Datenlücken geschlossen werden sollen

**Reihenfolge:**
1. `AV_OrderState_ 2025-06-02..2025-09-01` (44MB)
2. `AV_OrderState_ 2025-03-02..2025-06-01` (42MB)
3. `AV_OrderState_ 2024-12-02..2025-03-01` (54MB)
4. `AV_OrderState_2023-12-01_2024-03-01` (43MB)

**Zeitaufwand:** ~2-4 Minuten pro Datei

---

## 📊 **ERWARTETES ERGEBNIS**

### **Nach Import der neuesten Datei:**
- ✅ **Alle Orders vom 30.12.2025** sind in der DB
- ✅ **Tracking-Informationen** sind verfügbar
- ✅ **Invoice-Informationen** sind verfügbar
- ✅ **Order Lines** sind vollständig
- ✅ **Status** ist korrekt gemappt

### **Datenbank-Status:**
- ✅ **Neue Orders:** Alle Orders aus der Datei
- ✅ **Aktualisierte Orders:** Bestehende Orders mit neuesten Daten
- ✅ **Keine Duplikate:** Matching über `source_no` + `company_id`

---

## 🔧 **TROUBLESHOOTING**

### **Problem: "File too large"**
**Lösung:**
- Verwende `xml-import-bulk` statt `xml-import`
- Oder: Datei in kleinere Chunks aufteilen

### **Problem: "No valid orders found"**
**Lösung:**
- Prüfe XML-Format (muss `<WSIFOrdRespEshop>` enthalten)
- Prüfe Encoding (muss UTF-8 sein)

### **Problem: "Company not found"**
**Lösung:**
- Prüfe `Company_ID` in Datei (sollte "AV" sein)
- Prüfe `companyIdMap` in `_shared/orderUtils.ts`

### **Problem: "Timeout"**
**Lösung:**
- Verwende `xml-import-bulk` (optimiert für große Dateien)
- Oder: Datei in kleinere Chunks aufteilen

---

## ✅ **FERTIG!**

Die Dateien sind bereit zum Import! 🚀

**Nächster Schritt:** Importiere die neueste Datei über die UI oder API.


