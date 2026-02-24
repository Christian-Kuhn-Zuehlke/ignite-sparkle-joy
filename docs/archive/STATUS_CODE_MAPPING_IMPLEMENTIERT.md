# Status Code Mapping Implementiert

## Übersicht

Die Status-Zuordnungslogik basierend auf der IT-Spezifikation wurde implementiert. Diese Logik verwendet `Return_Status` und `Shipment_Status` um korrekte Status-Codes (1-9) zu generieren, die dann in interne OrderStatus-Werte gemappt werden.

## Implementierte Funktionen

### 1. Header Status Code Mapping (`getHeaderStatusCode`)

**Logik:**
- Wenn `Return_Status` leer/blank ist: Mappe basierend auf `Shipment_Status`
- Wenn `Return_Status` nicht leer ist: Mappe basierend auf `Return_Status`

**Code-Zuordnung:**
- 1: Shipped
- 2: Cancelled / Declined_by_Customer
- 3: Partial_Delivery
- 4: Default / In_Process / blank
- 5: Delivery_to_Store_in_Process
- 6: Delivered_to_Store
- 7: Picked_up_from_Store_by_Customer
- 8: Partially_Returned
- 9: Alle anderen Return_Status

### 2. Position Status Code Mapping (`getPositionStatusCode`)

**Logik:**
- Wenn `QTY_Returned_Calc = 0`: Mappe basierend auf `Shipment_Status`
- Wenn `QTY_Returned_Calc > 0`: 
  - Wenn `Qty > QTY_Returned_Calc` → Code 8 (teilweise retourniert)
  - Sonst → Code 9 (vollständig retourniert)

### 3. Status Code zu OrderStatus Mapping (`mapStatusCodeToOrderStatus`)

**Mapping:**
- Code 1 → `shipped`
- Code 2 → `received` (Cancelled)
- Code 3 → `shipped` (Partial Delivery)
- Code 4 → `received` (Default/In Process)
- Code 5-7 → `delivered` (Store-related)
- Code 8-9 → `shipped` (Returned orders)

### 4. Enhanced Status Mapping (`mapStatusWithReturnStatus`)

**Verwendung:**
Diese Funktion kombiniert Header Status Code Mapping und Code-zu-Status-Mapping in einem Schritt.

```typescript
const status = mapStatusWithReturnStatus(returnStatus, shipmentStatus);
```

## Integration in universal-import

### Änderungen:

1. **ParsedOrder Interface erweitert:**
   - `ReturnStatus?: string` hinzugefügt
   - `Lines` erweitert um `QtyReturnedCalc` und `ShipmentStatus`

2. **parseOrdersXML erweitert:**
   - Extrahiert `Return_Status` aus XML
   - Extrahiert `QTY_Returned_Calc` für jede Order Line
   - Extrahiert `Shipment_Status` auf Line-Ebene (falls vorhanden)

3. **importOrdersChunked angepasst:**
   - Verwendet `mapStatusWithReturnStatus` statt `mapStatus`
   - Berücksichtigt `Return_Status` und `Shipment_Status` für korrekte Status-Zuordnung

## Vorteile

1. **Korrekte Status-Zuordnung:** Orders werden basierend auf Return-Status korrekt kategorisiert
2. **Return-Erkennung:** Orders mit Returns werden korrekt identifiziert (Code 8/9)
3. **Konsistenz:** Verwendet die gleiche Logik wie die IT-Spezifikation
4. **Erweiterbar:** Position Status Codes können später für Line-Level-Status verwendet werden

## Nächste Schritte

1. **Testing:** Teste die Status-Zuordnung mit verschiedenen Kombinationen von `Return_Status` und `Shipment_Status`
2. **Position Status Codes:** Optional können Position Status Codes für Line-Level-Status verwendet werden
3. **UI-Anpassung:** Eventuell müssen UI-Komponenten angepasst werden, um die neuen Status korrekt anzuzeigen

## Beispiel

```typescript
// Order mit Return_Status = 'Partially_Returned'
const status = mapStatusWithReturnStatus('Partially_Returned', 'Shipped');
// Ergebnis: 'shipped' (Code 8 → shipped)

// Order mit Return_Status = blank, Shipment_Status = 'Shipped'
const status = mapStatusWithReturnStatus('_blank_', 'Shipped');
// Ergebnis: 'shipped' (Code 1 → shipped)

// Order mit Return_Status = blank, Shipment_Status = 'In_Process'
const status = mapStatusWithReturnStatus('', 'In_Process');
// Ergebnis: 'received' (Code 4 → received)
```

