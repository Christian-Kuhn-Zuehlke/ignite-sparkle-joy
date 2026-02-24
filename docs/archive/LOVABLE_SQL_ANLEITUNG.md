# 📋 SQL in Lovable ausführen - Anleitung

## ⚠️ **WICHTIG**

Lovable ist primär für **Frontend-Entwicklung**. SQL muss direkt in **Supabase** ausgeführt werden.

## ✅ **OPTION 1: Supabase Dashboard (Empfohlen)**

### **Schritte:**

1. **Öffne Supabase Dashboard:**
   - Gehe zu: https://supabase.com/dashboard
   - Wähle dein Projekt aus

2. **Öffne SQL Editor:**
   - Klicke auf **SQL Editor** im linken Menü
   - Klicke auf **New Query**

3. **Kopiere und führe das SQL aus:**

```sql
INSERT INTO public.companies (id, name, status)
VALUES ('GF', 'Golfyr', 'live')
ON CONFLICT (id) DO NOTHING;
```

4. **Klicke auf "Run" oder "Execute"**

5. **Prüfe das Ergebnis:**
   - Du solltest sehen: `Success. No rows returned`

---

## ✅ **OPTION 2: Via Terminal in Lovable (falls verfügbar)**

Falls Lovable ein Terminal/Console hat:

1. Öffne das Terminal in Lovable
2. Führe aus:

```bash
# Prüfe ob Supabase CLI verfügbar ist
which supabase

# Falls ja, führe Migration aus:
supabase migration up
```

**Oder:** Führe das SQL direkt über Supabase CLI aus (falls installiert):

```bash
supabase db execute "INSERT INTO public.companies (id, name, status) VALUES ('GF', 'Golfyr', 'live') ON CONFLICT (id) DO NOTHING;"
```

---

## ✅ **OPTION 3: Via Edge Function (nach Deployment)**

Falls die Edge Function `create-companies` deployed ist:

```bash
node create-golfyr-company-via-api.js
```

**Aber:** Die Edge Function muss erst deployed werden, was auch SQL-Zugriff benötigt.

---

## 🎯 **EMPFOHLENE LÖSUNG**

**Am einfachsten:** Option 1 (Supabase Dashboard)

1. ✅ Öffne Supabase Dashboard
2. ✅ SQL Editor → New Query
3. ✅ Kopiere das SQL
4. ✅ Klicke auf Run
5. ✅ Fertig!

**Dann:** Starte den Import:

```bash
node create-golfyr-and-import.js
```

---

## 📝 **VOLLSTÄNDIGES SQL (für alle Companies)**

Falls du alle Companies auf einmal erstellen möchtest:

```sql
INSERT INTO public.companies (id, name, status)
VALUES
  ('AVI', 'Aviano', 'live'),
  ('GT', 'GetSA', 'live'),
  ('NAM', 'Namuk', 'live'),
  ('GF', 'Golfyr', 'live')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status;
```

---

## ⚠️ **HINWEIS**

Lovable hat **keine direkte SQL-Funktionalität**. SQL muss immer über:
- ✅ Supabase Dashboard (SQL Editor)
- ✅ Supabase CLI (falls installiert)
- ✅ Edge Functions (mit Service Role Key)

ausgeführt werden.

