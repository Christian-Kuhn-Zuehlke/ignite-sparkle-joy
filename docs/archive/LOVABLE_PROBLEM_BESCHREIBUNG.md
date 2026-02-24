# Problem-Beschreibung für Lovable

## 🎯 **HAUPTPROBLEM**

Ich muss **SQL direkt in Supabase ausführen**, um Companies zu erstellen, aber ich möchte das **direkt aus Lovable heraus** machen können, ohne das Supabase Dashboard zu öffnen.

## 📋 **KONKRETES SZENARIO**

### **Was ich brauche:**
1. **Company erstellen** in der Supabase-Datenbank:
   ```sql
   INSERT INTO public.companies (id, name, status)
   VALUES ('GF', 'Golfyr', 'live')
   ON CONFLICT (id) DO NOTHING;
   ```

2. **Aktuell:** Ich muss das Supabase Dashboard öffnen → SQL Editor → SQL manuell ausführen

3. **Gewünscht:** SQL direkt aus Lovable heraus ausführen können

## 🔧 **MÖGLICHE LÖSUNGEN**

### **Option 1: SQL Editor in Lovable**
- Ein integrierter SQL Editor in Lovable
- Direkte Verbindung zur Supabase-Datenbank
- SQL-Queries ausführen können

### **Option 2: Supabase CLI Integration**
- Supabase CLI in Lovable Terminal verfügbar
- SQL über CLI ausführen können:
  ```bash
  supabase db execute "INSERT INTO ..."
  ```

### **Option 3: Edge Function Deployment**
- Edge Functions direkt aus Lovable deployen können
- Dann SQL über Edge Function ausführen

### **Option 4: Migration ausführen**
- Supabase Migrations direkt aus Lovable ausführen können
- Migration-Datei: `supabase/migrations/20251230180000_create_missing_companies.sql`

## 📝 **TECHNISCHE DETAILS**

### **Projekt:**
- Supabase Backend
- React Frontend (in Lovable)
- Edge Functions für API-Logik

### **Datenbank:**
- Supabase PostgreSQL
- RLS (Row Level Security) aktiviert
- Service Role Key verfügbar

### **Aktueller Workflow:**
1. SQL in Supabase Dashboard ausführen
2. Dann Node.js Script lokal ausführen
3. Daten werden importiert

### **Gewünschter Workflow:**
1. SQL direkt aus Lovable ausführen
2. Oder Edge Function deployen
3. Dann Import starten

## 🎯 **KONKRETE ANFRAGE**

**Kann Lovable:**
- ✅ SQL direkt in Supabase ausführen?
- ✅ Supabase CLI integrieren?
- ✅ Edge Functions deployen?
- ✅ Migrations ausführen?

**Falls nicht:**
- Welche Alternative gibt es?
- Wie kann ich SQL aus Lovable heraus ausführen?

## 📄 **RELEVANTE DATEIEN**

- Migration: `supabase/migrations/20251230180000_create_missing_companies.sql`
- Edge Function: `supabase/functions/create-companies/index.ts`
- SQL Script: `create-missing-companies.sql`

## ⚠️ **WICHTIG**

Ich brauche **keine Frontend-Lösung** (z.B. UI-Komponente zum Erstellen von Companies), sondern die Möglichkeit, **SQL direkt auszuführen** oder **Edge Functions zu deployen**.

---

**Erstellt:** 2025-12-30  
**Projekt:** clarity-flow-79  
**Supabase Project:** szruenulmfdxzhvupprf

