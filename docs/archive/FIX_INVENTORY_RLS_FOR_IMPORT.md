# 🔧 RLS-Policy für Inventory-Import fixen

## ⚠️ **PROBLEM**

Der Inventory-Import schlägt fehl wegen RLS (Row Level Security):
```
new row violates row-level security policy for table "inventory"
```

## ✅ **LÖSUNG**

Führe dieses SQL in Supabase aus (via Lovable oder Dashboard):

```sql
-- Allow system admins to insert/update inventory
CREATE POLICY IF NOT EXISTS "System admins can insert inventory"
ON public.inventory FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY IF NOT EXISTS "System admins can update inventory"
ON public.inventory FOR UPDATE
USING (public.has_role(auth.uid(), 'system_admin'::app_role));
```

**Oder:** Erlaube INSERT für alle authentifizierten User (weniger sicher):

```sql
-- Allow authenticated users to insert inventory (for imports)
CREATE POLICY IF NOT EXISTS "Authenticated users can insert inventory"
ON public.inventory FOR INSERT
TO authenticated
WITH CHECK (true);
```

## 🎯 **EMPFOHLENE LÖSUNG**

**Option 1: Via Edge Function (Service Role Key)**
- Edge Function verwendet Service Role Key
- Umgeht RLS komplett
- Sicherer

**Option 2: RLS-Policy anpassen**
- Erlaube INSERT für system_admin
- Oder für alle authenticated users (weniger sicher)

## 📋 **NACH DEM FIX**

Nach dem Ausführen des SQL, starte den Import erneut:

```bash
node import-golfyr-productstock.js
```

