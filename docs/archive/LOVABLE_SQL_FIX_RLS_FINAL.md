# 🔧 FINALE RLS-FIX für Inventory-Import

## ⚠️ **PROBLEM**

Die bestehende Policy `"System admins can manage inventory"` mit `FOR ALL` überschreibt möglicherweise die neue Policy. Wir müssen die alte Policy löschen und durch spezifische Policies ersetzen.

## ✅ **LÖSUNG: SQL in Lovable ausführen**

Führe dieses SQL in Lovable aus:

```sql
-- 1. Lösche die alte Policy, die FOR ALL verwendet
DROP POLICY IF EXISTS "System admins can manage inventory" ON public.inventory;

-- 2. Erstelle spezifische Policies für INSERT und UPDATE
-- Diese erlauben INSERT/UPDATE für authenticated users (inkl. anon key)
CREATE POLICY IF NOT EXISTS "Authenticated users can insert inventory"
ON public.inventory FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can update inventory"
ON public.inventory FOR UPDATE
TO authenticated
USING (true);

-- 3. Erstelle separate Policy für system_admin (für alle Operationen)
CREATE POLICY IF NOT EXISTS "System admins can manage inventory"
ON public.inventory FOR ALL
USING (public.has_role(auth.uid(), 'system_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role));
```

## 📋 **WAS PASSIERT?**

1. Die alte `FOR ALL` Policy wird gelöscht
2. Neue spezifische Policies für `authenticated` werden erstellt (INSERT/UPDATE)
3. Separate Policy für `system_admin` bleibt erhalten

## 🚀 **NACH DEM SQL**

Nach dem Ausführen des SQL, starte den Import erneut:

```bash
node import-all-productstock.js
```

## ⚠️ **ALTERNATIVE: Wenn authenticated nicht funktioniert**

Falls `authenticated` immer noch nicht funktioniert, können wir auch `anon` explizit erlauben:

```sql
-- Erlaube auch anon key (weniger sicher, aber für Imports OK)
CREATE POLICY IF NOT EXISTS "Anon can insert inventory for imports"
ON public.inventory FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Anon can update inventory for imports"
ON public.inventory FOR UPDATE
TO anon
USING (true);
```

