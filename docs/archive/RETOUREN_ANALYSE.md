# 📋 Retouren-Daten Analyse

## ✅ **ERGEBNIS**

### 📦 **Retouren-Daten sind in OrderState-Dateien enthalten!**

Die Retouren-Informationen sind **nicht** in separaten Dateien, sondern sind Teil der `OrderState` XML-Dateien.

## 🔍 **GEFUNDENE RETURN-FELDER**

In den OrderState-Dateien wurden folgende Return-bezogene Felder gefunden:

### **Order-Level Return-Felder:**
- `<ReturnOrder_Date>` - Datum der Retoure
- `<ReturnOrderAmount_Info>` - Betrag der Retoure
- `<Return_Status>` - Status der Retoure
- `<Return_Tracking_Code_last>` - Tracking-Code für Retoure
- `<Return_Tracking_Link_last>` - Tracking-Link für Retoure
- `<Posted_RtrnShipmnt_Date>` - Datum der gebuchten Rücksendung
- `<Posted_CrMemo_Date>` - Datum des Credit Memos
- `<Posted_CrMemo_Amt_Total>` - Gesamtbetrag des Credit Memos
- `<Posted_CrMemo_Amt_Total_open>` - Offener Betrag des Credit Memos

### **Order Line-Level Return-Felder:**
- `<QTY_Returned>` - Zurückgegebene Menge
- `<QTY_Returned_Calc>` - Berechnete zurückgegebene Menge
- `<QTY_CredMemo>` - Credit Memo Menge
- `<Return_Reason>` - Grund der Retoure
- `<Return_Quality>` - Qualität der Retoure

## 📊 **STATISTIKEN**

Basierend auf der Analyse der `AV_OrderState_ 2025-09-02..2025-12-30` Datei:
- ✅ **432 Return-Erwähnungen** in der Datei
- ✅ Viele Orders haben `Return_Tracking_Code_last` Felder
- ✅ Return-Informationen sind Teil der Order-Datenstruktur

## 💡 **WICHTIGE ERKENNTNISSE**

1. **Keine separaten Retouren-Dateien:**
   - Es gibt keine separaten `*_Return` oder `*_Retour` Dateien
   - Alle Retouren-Daten sind in den OrderState-Dateien enthalten

2. **Return-Daten sind optional:**
   - Nicht alle Orders haben Retouren-Daten
   - Wenn vorhanden, sind sie in den OrderState-Feldern enthalten

3. **Aktuelle Implementierung:**
   - Die `parseReturnsXML()` Funktion ist noch **nicht implementiert**
   - Retouren müssen aus den OrderState-Daten extrahiert werden

## 🔧 **NÄCHSTE SCHRITTE**

### **Option 1: Retouren aus OrderState extrahieren**
- Beim Import von OrderState-Dateien prüfen, ob Return-Felder vorhanden sind
- Wenn `QTY_Returned > 0` oder `Return_Tracking_Code_last` vorhanden, Retoure erstellen
- Retouren mit dem zugehörigen Order verknüpfen

### **Option 2: Separate Retouren-Import-Funktion**
- Parser erweitern, um Retouren aus OrderState zu extrahieren
- Retouren in separate `returns` Tabelle importieren
- `return_lines` für zurückgegebene Artikel erstellen

## 📝 **BEISPIEL-DATENSTRUKTUR**

```xml
<WSIFOrdRespEshop>
  <Source_No>1863507</Source_No>
  <Return_Tracking_Code_last>996015369300022346</Return_Tracking_Code_last>
  <Return_Tracking_Link_last>https://www.post.ch/swisspost-tracking?formattedParcelCodes=996015369300022346</Return_Tracking_Link_last>
  <Return_Status>_blank_</Return_Status>
  <ReturnOrder_Date>0001-01-01</ReturnOrder_Date>
  <ReturnOrderAmount_Info>0</ReturnOrderAmount_Info>
  <Posted_RtrnShipmnt_Date>0001-01-01</Posted_RtrnShipmnt_Date>
  <Posted_CrMemo_Date>0001-01-01</Posted_CrMemo_Date>
  <Posted_CrMemo_Amt_Total>0</Posted_CrMemo_Amt_Total>
  <IF_OrdResp_NavOrd_Lines_Sub>
    <QTY_Returned>0</QTY_Returned>
    <QTY_Returned_Calc>0</QTY_Returned_Calc>
    <QTY_CredMemo>0</QTY_CredMemo>
  </IF_OrdResp_NavOrd_Lines_Sub>
</WSIFOrdRespEshop>
```

## ✅ **ZUSAMMENFASSUNG**

- ✅ Retouren-Daten **sind vorhanden** in OrderState-Dateien
- ✅ Return-Felder sind **identifiziert**
- ⚠️  Retouren-Import muss noch **implementiert werden**
- 📋 Retouren können aus bereits importierten OrderState-Daten extrahiert werden

