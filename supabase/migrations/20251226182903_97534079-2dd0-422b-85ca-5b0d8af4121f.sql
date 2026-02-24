-- ============================================
-- CRITICAL SECURITY FIX - RLS Policy korrigieren
-- ============================================
-- Entferne die gefährliche Policy, die ALLEN authentifizierten Usern 
-- Zugriff auf ALLE Orders gibt (falls sie noch existiert)

DROP POLICY IF EXISTS "Require authentication for orders access" ON public.orders;

-- Stelle sicher, dass RLS aktiviert ist
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Nach diesem Fix sollten nur noch diese Policies aktiv sein:
-- 1. "MSD staff can view all orders" - für MSD-Staff (msd_csm, msd_ma, system_admin)
-- 2. "Users can view own company orders" - nur für die eigene Company
-- 3. "System admins can insert/update orders" - für Imports
-- ============================================