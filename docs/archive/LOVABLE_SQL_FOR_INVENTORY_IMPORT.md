# SQL für Inventory-Import - Lovable

## 🎯 **PROBLEM**

Der Inventory-Import schlägt fehl wegen RLS (Row Level Security). Wir müssen eine Policy erstellen, die INSERT/UPDATE für Inventory erlaubt.

## ✅ **LÖSUNG: SQL ausführen**

Führe dieses SQL in Lovable aus:

```sql
-- Allow authenticated users to insert/update inventory for imports
CREATE POLICY IF NOT EXISTS "Authenticated users can insert inventory"
ON public.inventory FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can update inventory"
ON public.inventory FOR UPDATE
TO authenticated
USING (true);
```

## 📋 **WAS DIESES SQL MACHT**

- ✅ Erlaubt **INSERT** für alle authentifizierten User
- ✅ Erlaubt **UPDATE** für alle authentifizierten User
- ✅ Ermöglicht Bulk-Imports via Scripts

## ⚠️ **SICHERHEIT**

Diese Policy erlaubt allen authentifizierten Usern, Inventory zu erstellen/ändern. Falls du das sicherer machen möchtest, kannst du stattdessen nur für `system_admin` erlauben:

```sql
-- Nur für System Admins (sicherer)
CREATE POLICY IF NOT EXISTS "System admins can insert inventory"
ON public.inventory FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role));

CREATE POLICY IF NOT EXISTS "System admins can update inventory"
ON public.inventory FOR UPDATE
USING (public.has_role(auth.uid(), 'system_admin'::app_role));
```

## 🚀 **NACH DEM SQL**

Nach dem Ausführen des SQL, starte den Import:

```bash
node import-golfyr-productstock.js
```

Das sollte dann funktionieren! 🎉

