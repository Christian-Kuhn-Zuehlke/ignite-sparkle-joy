# 🚨 KRITISCHES SICHERHEITSPROBLEM - SOFORT BEHEBEN! 🚨

## Problem
Die RLS-Policy "Require authentication for orders access" erlaubt **ALLEN** authentifizierten Usern Zugriff auf **ALLE** Orders!

**Beispiel:** Ein Golfyr-User sieht Aviano-Orders, obwohl er nur Golfyr-Orders sehen sollte.

## Lösung - SOFORT AUSFÜHREN!

### Option 1: Supabase Dashboard (Empfohlen)
1. Öffne Supabase Dashboard: https://supabase.com/dashboard
2. Gehe zu deinem Projekt
3. Klicke auf **SQL Editor**
4. Kopiere den Inhalt von `FIX_CRITICAL_SECURITY.sql`
5. Füge ihn in den SQL Editor ein
6. Klicke auf **Run** oder **Execute**

### Option 2: Supabase CLI (falls installiert)
```bash
cd /Users/milostoessel/clarity-flow-79
supabase db reset
# Oder manuell:
supabase migration up
```

### Option 3: Direkt in der Datenbank
Führe dieses SQL direkt in deiner Supabase-Datenbank aus:
```sql
DROP POLICY IF EXISTS "Require authentication for orders access" ON public.orders;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
```

## Nach der Ausführung testen:
1. Logge dich mit `test@golfyr.ch` ein
2. Gehe zum Dashboard oder Orders
3. **Golfyr sollte NUR Golfyr-Orders sehen, NICHT Aviano-Orders!**

## Warum ist das passiert?
Die Migration `20251224002502_0dabeaf0-1f10-4e0b-b066-0bb346823a05.sql` hat eine zu permissive Policy erstellt, die allen authentifizierten Usern Zugriff gibt.

## Welche Policies sollten aktiv bleiben?
1. ✅ **"MSD staff can view all orders"** - nur für MSD-Staff (msd_csm, msd_ma, system_admin)
2. ✅ **"Users can view own company orders"** - nur für die eigene Company

3. ❌ **"Require authentication for orders access"** - DIESE MUSS ENTFERNT WERDEN!

## Status
- ✅ Migration erstellt: `supabase/migrations/20251224020000_fix_critical_rls_security_issue.sql`
- ✅ SQL-Script erstellt: `FIX_CRITICAL_SECURITY.sql`
- ⚠️ **MUSS NOCH IN DER DATENBANK AUSGEFÜHRT WERDEN!**

