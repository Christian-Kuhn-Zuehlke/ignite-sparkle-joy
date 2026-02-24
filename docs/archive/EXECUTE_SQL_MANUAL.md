# 🚀 SQL-Script ausführen - Anleitung

## ⚠️ **WICHTIG**

Die Edge Function ist noch nicht deployed. Du musst das SQL-Script **manuell** im Supabase Dashboard ausführen.

## 📋 **SCHRITTE**

### **1. Öffne Supabase Dashboard**
- Gehe zu: https://supabase.com/dashboard
- Wähle dein Projekt aus

### **2. Öffne SQL Editor**
- Klicke auf **SQL Editor** im linken Menü
- Klicke auf **New Query**

### **3. Kopiere und führe das SQL aus**

Kopiere diesen SQL-Code:

```sql
-- Create missing companies for productStock import
INSERT INTO public.companies (id, name, status)
VALUES
  ('AVI', 'Aviano', 'live'),
  ('GT', 'GetSA', 'live'),
  ('NAM', 'Namuk', 'live'),
  ('GF', 'Golfyr', 'live')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status;

-- Verify companies exist
SELECT id, name, status FROM public.companies WHERE id IN ('AVI', 'GT', 'NAM', 'GF') ORDER BY id;
```

### **4. Klicke auf "Run" oder "Execute"**

### **5. Prüfe das Ergebnis**

Du solltest 4 Companies sehen:
- AVI: Aviano
- GT: GetSA
- NAM: Namuk
- GF: Golfyr

## ✅ **NACH DEM SQL**

Nachdem die Companies erstellt wurden, kannst du den Inventory-Import starten:

```bash
cd /Users/milostoessel/clarity-flow-79/clarity-flow-79-1927e3ec
node import-productstock-direct.js
```

## 📄 **ALTERNATIVE: Migration**

Falls du die Supabase CLI installiert hast, kannst du auch die Migration ausführen:

```bash
supabase migration up
```

Die Migration-Datei ist bereits erstellt:
`supabase/migrations/20251230180000_create_missing_companies.sql`

