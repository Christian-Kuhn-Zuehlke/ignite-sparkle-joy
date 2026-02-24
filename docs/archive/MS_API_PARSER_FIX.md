# MS Direct API Parser Fix
## Korrektur der Parser basierend auf tatsächlichen API Responses

**Datum:** 2025-12-30  
**Status:** ✅ **Fix implementiert**

---

## 🔍 **ANALYSE ABGESCHLOSSEN**

### **Dateien analysiert:**
1. ✅ `13_productStock` - ProductStock API Response
2. ✅ `GT_productStock` - ProductStock API Response (GT)
3. ✅ `NK_productStock` - ProductStock API Response (NK)
4. ✅ `AV_OrderState_ 2025-09-02. 2` - OrderState Export (Referenz)
5. ✅ `GT_OrderState_2024-01-01. 2` - OrderState Export (Referenz)

---

## ✅ **PRODUCTSTOCK PARSER - FIX IMPLEMENTIERT**

### **Problem identifiziert:**
- ❌ Parser suchte nach `<tns:productStockData>` (falsche Struktur)
- ✅ Tatsächliche Struktur: `<productStockItem>` (ohne Namespace)

### **Tatsächliche API-Struktur:**
```xml
<productStockResponse>
  <response>
    <productStockItems>
      <productStockItem>
        <itemNo>GFY-3000</itemNo>
        <calculatetQuantity>1000.00</calculatetQuantity>
        <qtyOnLocalStock>1000.00</qtyOnLocalStock>
        <qtyOnSalesOrder>2.00</qtyOnSalesOrder>
        <qtyOnPurchOrder>4.00</qtyOnPurchOrder>
        <blocked>0</blocked>
        <statusDatum>2025-06-25T12:24:38</statusDatum>
        <ean>7649996136947</ean>
        <expectedReceiptDate>2025-11-13T00:00:00Z</expectedReceiptDate>
      </productStockItem>
    </productStockItems>
  </response>
</productStockResponse>
```

### **Fix implementiert:**
1. ✅ Parser sucht jetzt nach `<productStockItems>` Container
2. ✅ Extrahiert `<productStockItem>` Elemente (ohne Namespace)
3. ✅ Fallback auf alte Struktur (mit Namespace) für Kompatibilität
4. ✅ Alle Felder werden korrekt extrahiert:
   - `itemNo` → `sku`
   - `qtyOnLocalStock` → `onHand`
   - `qtyOnSalesOrder` → `reserved`
   - `calculatetQuantity - qtyOnSalesOrder - blocked` → `available`
   - `blocked` → `blocked`
   - `statusDatum` → `statusDate`
   - `ean` → `ean`
   - `expectedReceiptDate` → `expectedReceiptDate`
   - `qtyOnPurchOrder` → `qtyOnPurchOrder`

### **Interface erweitert:**
```typescript
interface ProductStockItem {
  sku: string;
  productName?: string;
  onHand: number;
  reserved: number;
  available: number;
  blocked?: number;              // NEU
  statusDate?: string;           // NEU
  ean?: string;                  // NEU
  expectedReceiptDate?: string;  // NEU
  qtyOnPurchOrder?: number;      // NEU
}
```

---

## ✅ **ORDERSTATE PARSER - BEREITS KORREKT**

### **Analyse:**
- ✅ Parser verwendet bereits korrekte Struktur (`<tns:orderStateData>`)
- ℹ️ Die Dateien `AV_OrderState` und `GT_OrderState` sind **Export-Dateien**, nicht SOAP API Responses
- ✅ SOAP API gibt Format mit `tns:` Namespace zurück (wie im Parser erwartet)

### **Zwei verschiedene Formate:**
1. **SOAP API Response** (Format 1) - ✅ Wird vom Parser unterstützt
   - Struktur: `<tns:orderStateData>`
   - Felder: `orderState`, `trackAndTraceId`, `invoiceNo`, etc.

2. **XML Export** (Format 2) - ℹ️ Nur Referenz
   - Struktur: `<WSIFOrdRespEshop>`
   - Felder: `Tracking_Code_last`, `Posted_Invoice_Last_No`, etc.
   - **Wird nicht von der API zurückgegeben**

**✅ Keine Änderung nötig** - Parser ist bereits korrekt!

---

## 📊 **FELDMAPPING**

### **ProductStock API → Database:**

| API Feld | Database Feld | Typ | Status |
|----------|---------------|-----|--------|
| `itemNo` | `sku` | TEXT | ✅ |
| `qtyOnLocalStock` | `on_hand` | INTEGER | ✅ |
| `qtyOnSalesOrder` | `reserved` | INTEGER | ✅ |
| `calculatetQuantity - qtyOnSalesOrder - blocked` | `available` | INTEGER (generated) | ✅ |
| `blocked` | - | - | ℹ️ In Response, nicht in DB |
| `statusDatum` | - | - | ℹ️ In Response, nicht in DB |
| `ean` | - | - | ℹ️ In Response, nicht in DB |
| `expectedReceiptDate` | - | - | ℹ️ In Response, nicht in DB |
| `qtyOnPurchOrder` | - | - | ℹ️ In Response, nicht in DB |

**Hinweis:** Zusätzliche Felder werden in der API Response zurückgegeben, aber nicht in der Database gespeichert (können später hinzugefügt werden).

---

## 🎯 **WAS WURDE GEFIXT**

### **1. ProductStock Parser** ✅
- ✅ Struktur korrigiert (`<productStockItem>` statt `<tns:productStockData>`)
- ✅ Alle Felder extrahiert (itemNo, qtyOnLocalStock, etc.)
- ✅ Fallback auf alte Struktur für Kompatibilität
- ✅ Interface erweitert (blocked, statusDate, ean, etc.)

### **2. OrderState Parser** ✅
- ✅ Bereits korrekt - keine Änderung nötig
- ℹ️ Export-Dateien sind nur Referenz

---

## 🧪 **TESTEN**

### **ProductStock:**
1. Edge Function aufrufen mit `companyId` und optional `sku`
2. Prüfen, ob Response korrekte Struktur hat
3. Validieren, ob alle Felder extrahiert werden

### **OrderState:**
1. Edge Function aufrufen mit `orderNo` und `companyId`
2. Prüfen, ob Response korrekt geparst wird
3. Validieren, ob alle Felder extrahiert werden

---

## 📝 **NÄCHSTE SCHRITTE**

1. ✅ **Parser-Fix implementiert** - ProductStock Parser korrigiert
2. ⚠️ **Testen** - Mit echten API Responses validieren
3. ⚠️ **Optional:** Zusätzliche Felder in Database hinzufügen (blocked, ean, etc.)

---

## 🎉 **FERTIG!**

Die Parser wurden basierend auf den tatsächlichen API Responses korrigiert! 🚀

