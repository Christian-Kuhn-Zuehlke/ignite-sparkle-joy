# Edge Function Deployment: Status Code Mapping

## Übersicht

Die `universal-import` Edge Function wurde erweitert, um die Status-Zuordnungslogik basierend auf der IT-Spezifikation zu implementieren. Diese Logik verwendet `Return_Status` und `Shipment_Status` um korrekte Status-Codes (1-9) zu generieren.

## Änderungen

### 1. Neue Funktionen in `orderUtils.ts`

**Header Status Code Mapping:**
- `getHeaderStatusCode(returnStatus, shipmentStatus)` - Generiert Code 1-9 basierend auf Return_Status und Shipment_Status
- Wenn Return_Status leer: Mappe basierend auf Shipment_Status
- Wenn Return_Status nicht leer: Mappe basierend auf Return_Status

**Position Status Code Mapping:**
- `getPositionStatusCode(qtyReturnedCalc, qty, shipmentStatus)` - Generiert Code 1-9 für Order Lines
- Wenn QTY_Returned_Calc = 0: Mappe basierend auf Shipment_Status
- Wenn QTY_Returned_Calc > 0: Vergleiche mit Qty für Codes 8/9

**Status Code zu OrderStatus Mapping:**
- `mapStatusCodeToOrderStatus(code)` - Mappt Codes 1-9 zu internen OrderStatus-Werten
- `mapStatusWithReturnStatus(returnStatus, shipmentStatus)` - Kombiniert beide Mappings

### 2. Änderungen in `universal-import/index.ts`

**ParsedOrder Interface erweitert:**
- `ReturnStatus?: string` hinzugefügt
- `Lines` erweitert um `QtyReturnedCalc` und `ShipmentStatus`

**parseOrdersXML erweitert:**
- Extrahiert `Return_Status` aus XML
- Extrahiert `QTY_Returned_Calc` für jede Order Line
- Extrahiert `Shipment_Status` auf Line-Ebene

**importOrdersChunked angepasst:**
- Verwendet `mapStatusWithReturnStatus` statt `mapStatus`
- Berücksichtigt `Return_Status` und `Shipment_Status` für korrekte Status-Zuordnung

## Deployment-Schritte

### Option 1: Supabase CLI (empfohlen)

```bash
# 1. Login (falls noch nicht eingeloggt)
supabase login

# 2. Link zum Projekt (falls noch nicht verlinkt)
supabase link --project-ref szruenulmfdxzhvupprf

# 3. Deploy universal-import
supabase functions deploy universal-import
```

### Option 2: Supabase Dashboard

1. Gehe zu: https://supabase.com/dashboard/project/szruenulmfdxzhvupprf/functions
2. Wähle `universal-import`
3. Klicke auf "Deploy" oder "Redeploy"
4. Lade die Dateien aus `supabase/functions/universal-import/` hoch

### Option 3: Git Push (falls CI/CD eingerichtet)

```bash
git add supabase/functions/universal-import/index.ts
git add supabase/functions/_shared/orderUtils.ts
git commit -m "feat: Implement status code mapping based on Return_Status and Shipment_Status"
git push
```

## Wichtige Dateien

### Zu deployende Dateien:

1. **`supabase/functions/universal-import/index.ts`**
   - Haupt-Edge Function mit erweitertem Parsing und Status-Mapping

2. **`supabase/functions/_shared/orderUtils.ts`**
   - Neue Funktionen: `getHeaderStatusCode`, `getPositionStatusCode`, `mapStatusCodeToOrderStatus`, `mapStatusWithReturnStatus`

### Abhängigkeiten:

- `supabase/functions/_shared/security.ts` (unverändert)
- `supabase/functions/_shared/orderUtils.ts` (erweitert)

## Verifikation nach Deployment

### Test 1: Order mit Return_Status = 'Partially_Returned'

```bash
# Erwartetes Ergebnis: Status = 'shipped' (Code 8)
curl -X POST https://szruenulmfdxzhvupprf.supabase.co/functions/v1/universal-import \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/xml" \
  -d '<ReadMultiple_Result>
    <WSIFOrdRespEshop>
      <Source_No>TEST001</Source_No>
      <Company_ID>GT</Company_ID>
      <Company_Name>GetSA</Company_Name>
      <OrderDate>2025-01-01</OrderDate>
      <ShipTo_Name>Test</ShipTo_Name>
      <Shipment_Status>Shipped</Shipment_Status>
      <Return_Status>Partially_Returned</Return_Status>
    </WSIFOrdRespEshop>
  </ReadMultiple_Result>'
```

### Test 2: Order mit Return_Status = blank, Shipment_Status = 'Shipped'

```bash
# Erwartetes Ergebnis: Status = 'shipped' (Code 1)
```

### Test 3: Order mit Return_Status = blank, Shipment_Status = 'In_Process'

```bash
# Erwartetes Ergebnis: Status = 'received' (Code 4)
```

## Erwartete Ergebnisse

Nach dem Deployment sollten:
- ✅ Orders mit `Return_Status = 'Partially_Returned'` → Status Code 8 → `shipped`
- ✅ Orders mit `Return_Status = blank` und `Shipment_Status = 'Shipped'` → Status Code 1 → `shipped`
- ✅ Orders mit `Return_Status = blank` und `Shipment_Status = 'In_Process'` → Status Code 4 → `received`
- ✅ Orders mit anderen Return_Status → Status Code 9 → `shipped`

## Troubleshooting

### Fehler: "Access token not provided"
- Lösung: `supabase login` ausführen

### Fehler: "Project not linked"
- Lösung: `supabase link --project-ref szruenulmfdxzhvupprf` ausführen

### Fehler: "Function not found"
- Lösung: Stelle sicher, dass die Edge Function `universal-import` existiert

### Fehler: "Import failed"
- Lösung: Prüfe die Logs in Supabase Dashboard → Edge Functions → Logs

## Nächste Schritte nach Deployment

1. ✅ Edge Function deployen (dieser Schritt)
2. ⏭️ Company "NAM" erstellen (SQL in Lovable)
3. ⏭️ Namuk Orders erneut importieren

## Technische Details

### Status Code Mapping Tabelle

| Bedingung | Return_Status | Shipment_Status | Code | OrderStatus |
|-----------|---------------|-----------------|------|-------------|
| Return_Status = blank | _blank_ | Shipped | 1 | shipped |
| Return_Status = blank | _blank_ | Cancelled | 2 | received |
| Return_Status = blank | _blank_ | Partial_Delivery | 3 | shipped |
| Return_Status = blank | _blank_ | In_Process | 4 | received |
| Return_Status = blank | _blank_ | Delivery_to_Store_in_Process | 5 | delivered |
| Return_Status = blank | _blank_ | Delivered_to_Store | 6 | delivered |
| Return_Status = blank | _blank_ | Picked_up_from_Store_by_Customer | 7 | delivered |
| Return_Status ≠ blank | Partially_Returned | - | 8 | shipped |
| Return_Status ≠ blank | Andere | - | 9 | shipped |

## Checkliste

- [ ] Supabase CLI installiert und authentifiziert
- [ ] Projekt verlinkt (`supabase link`)
- [ ] Edge Function deployt (`supabase functions deploy universal-import`)
- [ ] Deployment erfolgreich verifiziert
- [ ] Test-Import durchgeführt
- [ ] Status-Zuordnung korrekt getestet

