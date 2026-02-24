# 🔧 RLS für Inventory-Import fixen - SQL für Lovable

## ⚠️ **PROBLEM**

Der Import schlägt immer noch fehl mit:
```
new row violates row-level security policy for table "inventory"
```

## ✅ **LÖSUNG: SQL in Lovable ausführen**

Führe dieses SQL in Lovable aus:

```sql
-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "System admins can manage inventory" ON public.inventory;

-- Create permissive policies for INSERT and UPDATE
CREATE POLICY "Authenticated users can insert inventory"
ON public.inventory FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory"
ON public.inventory FOR UPDATE
TO authenticated
USING (true);

-- Keep SELECT policies as they are
-- (Users can view own company inventory)
-- (MSD staff can view all inventory)
```

## 🔍 **ALTERNATIVE: Nur für System Admins (sicherer)**

Falls du es sicherer machen möchtest:

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "System admins can manage inventory" ON public.inventory;

-- Create new policy that allows INSERT and UPDATE for system admins
CREATE POLICY "System admins can manage inventory"
ON public.inventory FOR ALL
USING (public.has_role(auth.uid(), 'system_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role));
```

**Aber:** Dann muss der Import über eine Edge Function mit Service Role Key laufen, nicht direkt mit anon key.

## 📋 **WAS PASSIERT?**

Die bestehende Policy `"System admins can manage inventory"` verwendet `FOR ALL`, was theoretisch INSERT/UPDATE erlauben sollte, aber nur für `system_admin`. Der anon key hat diese Rolle nicht.

Die neue Policy erlaubt INSERT/UPDATE für **alle authentifizierten User** (`authenticated`), was für Bulk-Imports nötig ist.

## 🚀 **NACH DEM SQL**

Nach dem Ausführen des SQL, starte den Import erneut:

```bash
node import-all-productstock.js
```

