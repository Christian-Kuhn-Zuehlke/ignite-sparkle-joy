# Company "NAM" (Namuk) erstellen

## Problem
Die Company "NAM" fehlt in der Datenbank, daher können keine Namuk Orders importiert werden. Aktuell sind **0 Orders** in der DB für Namuk, obwohl die Datei `NK_OrderState` **482 Orders** enthält.

## Lösung: SQL ausführen

Führe folgendes SQL in Lovable aus (oder im Supabase Dashboard):

```sql
-- Create Namuk company if it doesn't exist
INSERT INTO public.companies (id, name, status)
VALUES ('NAM', 'Namuk', 'live')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    status = EXCLUDED.status;
```

## Alternative: Migration ausführen

Falls du Migrations bevorzugst, führe diese Migration aus:
- Datei: `supabase/migrations/20251230192000_create_namuk_company.sql`

## Nach der Erstellung

Nachdem die Company erstellt wurde:

1. **Verifiziere die Company:**
   ```sql
   SELECT * FROM public.companies WHERE id = 'NAM';
   ```
   Erwartetes Ergebnis: `{ id: 'NAM', name: 'Namuk', status: 'live' }`

2. **Importiere Namuk Orders:**
   - Die Datei `NK_OrderState` enthält **482 Orders total**
   - Davon sind **240 Orders aus 2025**
   - **244 Orders ab 22.12.2024**

3. **Import ausführen:**
   ```bash
   node import-gt-nam-gf-only.js
   ```
   
   Oder die Datei `NK_OrderState` manuell über die UI importieren.

## Erwartete Ergebnisse nach Import

- ✅ **482 Orders** sollten in der DB sein (total)
- ✅ **240 Orders** aus 2025
- ✅ **244 Orders** ab 22.12.2024

## Verifikation

Nach dem Import, prüfe die Anzahl:

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
```

## Troubleshooting

### Fehler: "new row violates row-level security policy"
- **Ursache:** RLS verhindert die Erstellung über den anon key
- **Lösung:** Führe das SQL direkt in Lovable/Supabase Dashboard aus (nicht über API)

### Fehler: "duplicate key value violates unique constraint"
- **Ursache:** Company existiert bereits
- **Lösung:** Das ist OK, die Migration verwendet `ON CONFLICT DO UPDATE`

### Keine Orders nach Import
- **Ursache:** Möglicherweise RLS-Problem oder Import-Fehler
- **Lösung:** Prüfe die Edge Function Logs und stelle sicher, dass die Company existiert

## Checkliste

- [ ] SQL in Lovable/Supabase Dashboard ausgeführt
- [ ] Company "NAM" erstellt und verifiziert
- [ ] Namuk Orders importiert (`node import-gt-nam-gf-only.js`)
- [ ] Anzahl der Orders verifiziert (482 total, 240 aus 2025)
- [ ] Orders in der UI sichtbar

