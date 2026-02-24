# MS Direct API Response Analyse
## Struktur-Analyse der tatsächlichen API Responses

**Datum:** 2025-12-30  
**Status:** ✅ **Analyse abgeschlossen**

---

## 🔍 **PRODUCTSTOCK API - TATSÄCHLICHE STRUKTUR**

### **Datei:** `13_productStock`

**Struktur:**
```xml
<soap:Envelope>
  <soap:Body>
    <productStockResponse>
      <response>
        <messageHeader>
          <clientId>E1</clientId>
          <clientName>eFulfillmentCH01</clientName>
          <token>...</token>
        </messageHeader>
        <productStockItems>
          <productStockItem>
            <itemNo>GFY-3000</itemNo>
            <calculatetQuantity>1000.00</calculatetQuantity>
            <statusDatum>2025-06-25T12:24:38</statusDatum>
            <blocked>0</blocked>
            <qtyOnLocalStock>1000.00</qtyOnLocalStock>
            <qtyOnSalesOrder>2.00</qtyOnSalesOrder>
            <qtyOnPurchOrder>4.00</qtyOnPurchOrder>
            <expectedReceiptDate>2025-11-13T00:00:00Z</expectedReceiptDate>
            <ean>7649996136947</ean>
          </productStockItem>
        </productStockItems>
      </response>
    </productStockResponse>
  </soap:Body>
</soap:Envelope>
```

**Wichtige Felder:**
- ✅ `<itemNo>` - SKU/Artikelnummer
- ✅ `<calculatetQuantity>` - Berechnete Gesamtmenge
- ✅ `<qtyOnLocalStock>` - Lagerbestand
- ✅ `<qtyOnSalesOrder>` - Reserviert (auf Verkaufsaufträgen)
- ✅ `<qtyOnPurchOrder>` - Auf Bestellung
- ✅ `<blocked>` - Blockiert (0/1)
- ✅ `<statusDatum>` - Status-Datum
- ✅ `<ean>` - EAN-Code
- ✅ `<expectedReceiptDate>` - Erwartetes Eingangsdatum

**⚠️ PROBLEM:** Aktueller Parser sucht nach `<tns:productStockData>`, aber tatsächliche Struktur ist `<productStockItem>` (ohne Namespace!)

---

## 🔍 **ORDERSTATE API - ZWEI VERSCHIEDENE FORMATE**

### **Format 1: SOAP API Response** (aus Postman Collection)

**Struktur:**
```xml
<soap:Envelope>
  <soap:Body>
    <tns:orderStateResponse>
      <tns:response>
        <tns:orderStateData>
          <tns:orderState>26</tns:orderState>
          <tns:trackAndTraceId>...</tns:trackAndTraceId>
          <tns:trackAndTraceUrl>...</tns:trackAndTraceUrl>
          <tns:invoiceNo>...</tns:invoiceNo>
          <tns:invoiceAmount>...</tns:invoiceAmount>
          <tns:paymentState>true</tns:paymentState>
        </tns:orderStateData>
      </tns:response>
    </tns:orderStateResponse>
  </soap:Body>
</soap:Envelope>
```

### **Format 2: XML Export** (aus Dateien AV_OrderState, GT_OrderState)

**Struktur:**
```xml
<Soap:Envelope>
  <Soap:Body>
    <ReadMultiple_Result>
      <WSIFOrdRespEshop>
        <Source_No>46330</Source_No>
        <Tracking_Code_last>980110797200036716</Tracking_Code_last>
        <Tracking_Link_last>https://www.post.ch/swisspost-tracking?...</Tracking_Link_last>
        <Return_Tracking_Code_last>996014445100036716</Return_Tracking_Code_last>
        <Return_Tracking_Link_last>https://www.post.ch/swisspost-tracking?...</Return_Tracking_Link_last>
        <Posted_Invoice_Last_No>1038056</Posted_Invoice_Last_No>
        <Posted_Invoice_Amt_Total>14</Posted_Invoice_Amt_Total>
        <Posted_Invoice_Amt_Total_open>14</Posted_Invoice_Amt_Total_open>
        <Paid_Invoice>false</Paid_Invoice>
        <Shipping_Agent_Code>POST_CH</Shipping_Agent_Code>
        <Shipment_Status>Shipped</Shipment_Status>
        ...
      </WSIFOrdRespEshop>
    </ReadMultiple_Result>
  </Soap:Body>
</Soap:Envelope>
```

**⚠️ WICHTIG:** Die Dateien `AV_OrderState` und `GT_OrderState` sind **Export-Dateien**, nicht SOAP API Responses! Die SOAP API gibt Format 1 zurück.

---

## ✅ **WAS MUSS GEFIXT WERDEN**

### **1. ProductStock Parser** 🔴 **KRITISCH**

**Problem:**
- Parser sucht nach `<tns:productStockData>`
- Tatsächliche Struktur: `<productStockItem>` (ohne Namespace)

**Fix:**
```typescript
// ALT (falsch):
const productMatches = xmlString.matchAll(/<tns:productStockData>([\s\S]*?)<\/tns:productStockData>/gi);

// NEU (richtig):
const productStockItemsMatch = xmlString.match(/<productStockItems>([\s\S]*?)<\/productStockItems>/i);
const productMatches = productStockItemsMatch?.[1]?.matchAll(/<productStockItem>([\s\S]*?)<\/productStockItem>/gi);
```

**Felder extrahieren:**
- `itemNo` → `sku`
- `qtyOnLocalStock` → `onHand`
- `qtyOnSalesOrder` → `reserved`
- `calculatetQuantity - qtyOnSalesOrder` → `available`
- `blocked` → `blocked`
- `statusDatum` → `statusDate`
- `ean` → `ean`
- `expectedReceiptDate` → `expectedReceiptDate`

---

### **2. OrderState Parser** ✅ **BEREITS KORREKT**

**Status:**
- Parser verwendet bereits `<tns:orderStateData>` (Format 1 - SOAP API)
- Export-Dateien (Format 2) werden nicht von der API zurückgegeben
- ✅ **Keine Änderung nötig**

**Hinweis:**
- Die Dateien `AV_OrderState` und `GT_OrderState` sind Export-Dateien für Referenz
- Die SOAP API gibt Format 1 zurück (mit `tns:` Namespace)

---

## 📋 **ZUSAMMENFASSUNG**

### **ProductStock:**
- ❌ **Parser verwendet falsche Struktur**
- ✅ **Tatsächliche Struktur identifiziert**
- 🔧 **Fix erforderlich**

### **OrderState:**
- ✅ **Parser bereits korrekt**
- ℹ️ **Export-Dateien sind Referenz (nicht API Response)**

---

## 🎯 **NÄCHSTE SCHRITTE**

1. ✅ **ProductStock Parser fixen** - Struktur korrigieren
2. ✅ **Alle Felder extrahieren** - itemNo, qtyOnLocalStock, etc.
3. ✅ **Testen** - Mit echten API Responses validieren

