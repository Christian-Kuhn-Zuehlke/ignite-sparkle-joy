# Namuk Orders Import - Komplette Anleitung

## Übersicht

Diese Anleitung führt dich durch den kompletten Prozess, um Namuk Orders zu importieren.

## Schritt 1: Company "NAM" erstellen

**WICHTIG:** Die Company muss zuerst erstellt werden, bevor Orders importiert werden können!

### Option A: In Lovable (empfohlen)

1. Öffne Lovable
2. Gehe zu SQL Editor oder Database
3. Führe dieses SQL aus:

```sql
INSERT INTO public.companies (id, name, status)
VALUES ('NAM', 'Namuk', 'live')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    status = EXCLUDED.status;
```

### Option B: Im Supabase Dashboard

1. Gehe zu: https://supabase.com/dashboard/project/szruenulmfdxzhvupprf/editor
2. Öffne SQL Editor
3. Führe das SQL aus (siehe Option A)

### Verifikation

```sql
SELECT * FROM public.companies WHERE id = 'NAM';
```

Erwartetes Ergebnis: `{ id: 'NAM', name: 'Namuk', status: 'live' }`

## Schritt 2: Edge Function deployen

Die Edge Function `universal-import` muss mit der neuen Status-Zuordnungslogik deployed sein.

Siehe: `LOVABLE_DEPLOY_STATUS_MAPPING.md`

## Schritt 3: Namuk Orders importieren

### Option A: Automatisches Script (empfohlen)

```bash
node import-namuk-orders.js
```

Das Script:
- ✅ Prüft, ob Company "NAM" existiert
- ✅ Prüft vorhandene Orders
- ✅ Importiert nur Orders ab 22.12.2024
- ✅ Zeigt detaillierte Ergebnisse
- ✅ Verifiziert finale Anzahl

### Option B: Manueller Import über UI

1. Öffne die App
2. Gehe zu Orders → Import
3. Wähle die Datei `NK_OrderState` aus `/Users/milostoessel/Downloads/Test_Files/`
4. Klicke auf "Import"

### Option C: Alle GT/NAM/GF Orders importieren

```bash
node import-gt-nam-gf-only.js
```

Importiert alle Orders ab 22.12.2024 für GetSA, Namuk und Golfyr.

## Erwartete Ergebnisse

### Datei-Statistik:
- **Total Orders in Datei:** 482
- **Orders in 2025:** 240
- **Orders ab 22.12.2024:** 244

### Nach Import:
- ✅ **482 Orders** sollten in der DB sein (total)
- ✅ **240 Orders** aus 2025
- ✅ **244 Orders** ab 22.12.2024

## Verifikation

### SQL-Abfragen:

```sql
-- Total Namuk Orders
SELECT COUNT(*) FROM public.orders WHERE company_id = 'NAM';

-- Orders in 2025
SELECT COUNT(*) FROM public.orders 
WHERE company_id = 'NAM' 
AND order_date >= '2025-01-01' 
AND order_date <= '2025-12-31';

-- Orders ab 22.12.2024
SELECT COUNT(*) FROM public.orders 
WHERE company_id = 'NAM' 
AND order_date >= '2024-12-22';

-- Neueste Orders
SELECT source_no, order_date, status, order_amount
FROM public.orders 
WHERE company_id = 'NAM'
ORDER BY order_date DESC
LIMIT 10;
```

### In der UI:

1. Öffne die App
2. Wähle Company "Namuk" im Filter
3. Prüfe die Anzahl der Orders
4. Filtere nach 2025: Es sollten 240 Orders sein

## Troubleshooting

### Fehler: "Company NAM existiert nicht"

**Lösung:** Führe Schritt 1 aus (Company erstellen)

### Fehler: "0 Orders importiert"

**Mögliche Ursachen:**
1. Company existiert nicht → Führe Schritt 1 aus
2. Edge Function nicht deployed → Führe Schritt 2 aus
3. RLS-Problem → Prüfe RLS Policies
4. Alle Orders bereits importiert → Prüfe vorhandene Orders

**Lösung:**
```bash
# Prüfe vorhandene Orders
node check-namuk-orders-in-db.js

# Prüfe Company
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://szruenulmfdxzhvupprf.supabase.co', 'YOUR_ANON_KEY');
const { data } = await supabase.from('companies').select('*').eq('id', 'NAM').maybeSingle();
console.log(data);
"
```

### Fehler: "HTTP 404: Function not found"

**Ursache:** Edge Function nicht deployed

**Lösung:** Deploye die Edge Function (Schritt 2)

### Fehler: "RLS policy violation"

**Ursache:** Row Level Security verhindert den Import

**Lösung:** Prüfe RLS Policies für `orders` Tabelle

## Checkliste

- [ ] Company "NAM" erstellt (Schritt 1)
- [ ] Company verifiziert (`SELECT * FROM companies WHERE id = 'NAM'`)
- [ ] Edge Function deployed (Schritt 2)
- [ ] Namuk Orders importiert (Schritt 3)
- [ ] Anzahl verifiziert (482 total, 240 aus 2025)
- [ ] Orders in der UI sichtbar
- [ ] Status-Zuordnung korrekt (basierend auf Return_Status)

## Nächste Schritte

Nach erfolgreichem Import:
1. ✅ Prüfe die Orders in der UI
2. ✅ Verifiziere die Status-Zuordnung (sollte basierend auf Return_Status sein)
3. ✅ Prüfe Retouren (falls vorhanden)
4. ✅ Teste Filter und Suche

## Support

Bei Problemen:
1. Prüfe die Edge Function Logs in Supabase Dashboard
2. Prüfe die Browser Console (bei UI-Import)
3. Prüfe die Terminal-Ausgabe (bei Script-Import)

