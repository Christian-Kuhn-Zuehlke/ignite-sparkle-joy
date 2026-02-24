# Brief für Lovable Support

## Betreff: SQL-Ausführung in Supabase aus Lovable heraus

Hallo Lovable Team,

ich entwickle eine App mit Supabase als Backend und würde gerne **SQL direkt aus Lovable heraus ausführen** können, ohne das Supabase Dashboard öffnen zu müssen.

## Problem

Aktuell muss ich für SQL-Ausführungen:
1. Supabase Dashboard öffnen
2. SQL Editor öffnen
3. SQL manuell kopieren und ausführen

Das ist umständlich, besonders wenn ich während der Entwicklung schnell SQL ausführen möchte.

## Gewünschte Lösung

Ich würde gerne SQL direkt aus Lovable heraus ausführen können, z.B.:

### Option 1: Integrierter SQL Editor
- SQL Editor in Lovable UI
- Direkte Verbindung zur Supabase-Datenbank
- SQL-Queries ausführen

### Option 2: Supabase CLI im Terminal
- Supabase CLI im Lovable Terminal verfügbar
- SQL über CLI ausführen:
  ```bash
  supabase db execute "INSERT INTO ..."
  ```

### Option 3: Edge Function Deployment
- Edge Functions direkt aus Lovable deployen können
- Dann SQL über Edge Function ausführen

### Option 4: Migration Support
- Supabase Migrations direkt aus Lovable ausführen
- Migration-Dateien automatisch anwenden

## Konkreter Use Case

Ich muss Companies in der Datenbank erstellen:

```sql
INSERT INTO public.companies (id, name, status)
VALUES ('GF', 'Golfyr', 'live')
ON CONFLICT (id) DO NOTHING;
```

Aktuell muss ich dafür das Supabase Dashboard öffnen. Ich würde gerne das direkt aus Lovable machen können.

## Technische Details

- **Backend:** Supabase PostgreSQL
- **Frontend:** React (in Lovable)
- **Edge Functions:** Supabase Edge Functions
- **RLS:** Aktiviert
- **Service Role Key:** Verfügbar

## Frage

Gibt es bereits eine Möglichkeit, SQL aus Lovable heraus auszuführen? Falls nicht, wäre das eine Feature-Anfrage für die Zukunft?

Vielen Dank für eure Hilfe!

---

**Projekt:** clarity-flow-79  
**Supabase Project ID:** szruenulmfdxzhvupprf

