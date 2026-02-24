# Company "NAM" (Namuk) erstellen

## Problem
Die Company "NAM" fehlt in der Datenbank, daher können keine Namuk Orders importiert werden.

## Lösung
Führe folgendes SQL in Lovable aus:

```sql
-- Create Namuk company if it doesn't exist
INSERT INTO public.companies (id, name, status)
VALUES ('NAM', 'Namuk', 'live')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    status = EXCLUDED.status;
```

## Nach der Erstellung
Nachdem die Company erstellt wurde, können die Namuk Orders importiert werden:
- Die Datei `NK_OrderState` enthält 482 Orders total
- Davon sind 240 Orders aus 2025
- 244 Orders ab 22.12.2024

## Import
Nach der Company-Erstellung kann der Import erneut ausgeführt werden:
```bash
node import-gt-nam-gf-only.js
```

Oder die Datei `NK_OrderState` manuell über die UI importieren.

