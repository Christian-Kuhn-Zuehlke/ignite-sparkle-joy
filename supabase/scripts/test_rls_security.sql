-- ============================================
-- RLS SECURITY TEST SCRIPT
-- ============================================
-- Dieses Script prüft, ob die RLS-Sicherheitslücke geschlossen wurde
-- Führe es in Supabase Dashboard → SQL Editor aus
-- ============================================

-- 1. Prüfe, ob die gefährliche Policy noch existiert
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'orders'
  AND policyname = 'Require authentication for orders access';

-- 2. Zeige ALLE Policies für die orders-Tabelle
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual::text
    ELSE 'No USING clause'
  END as policy_condition
FROM pg_policies
WHERE tablename = 'orders'
ORDER BY policyname;

-- 3. Prüfe, ob RLS aktiviert ist
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'orders'
  AND schemaname = 'public';

-- ============================================
-- ERWARTETE ERGEBNISSE:
-- ============================================
-- 1. Query 1 sollte KEINE Zeile zurückgeben (Policy sollte nicht existieren)
-- 2. Query 2 sollte zeigen:
--    - "MSD staff can view all orders" (für MSD-Staff)
--    - "Users can view own company orders" (für eigene Company)
--    - KEINE "Require authentication for orders access" Policy!
-- 3. Query 3 sollte rls_enabled = true zeigen
-- ============================================

-- 4. ZUSÄTZLICHER TEST: Prüfe die Policy-Details genauer
SELECT 
  p.policyname,
  p.cmd as operation,
  pg_get_expr(p.qual, p.polrelid) as using_expression,
  pg_get_expr(p.with_check, p.polrelid) as with_check_expression
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'orders'
  AND n.nspname = 'public'
ORDER BY p.policyname;

