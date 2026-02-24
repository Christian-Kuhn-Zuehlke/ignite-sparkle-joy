-- ============================================
-- CRITICAL SECURITY FIX - SOFORT AUSFÜHREN!
-- ============================================
-- Dieses Script entfernt die gefährliche RLS-Policy, die allen
-- authentifizierten Usern Zugriff auf ALLE Orders gibt.
--
-- PROBLEM: Kunden sehen Orders von anderen Kunden (z.B. Golfyr sieht Aviano Orders)
-- LÖSUNG: Diese Policy entfernen, damit nur noch die korrekten Policies aktiv sind
--
-- WICHTIG: Dieses Script SOFORT in Supabase Dashboard → SQL Editor ausführen!
-- ============================================

-- Entferne die gefährliche Policy, die ALLEN authentifizierten Usern Zugriff gibt
DROP POLICY IF EXISTS "Require authentication for orders access" ON public.orders;

-- Stelle sicher, dass RLS aktiviert ist
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Prüfe, welche Policies noch aktiv sind (nur zur Info)
-- Die folgenden Policies sollten aktiv bleiben:
-- 1. "MSD staff can view all orders" - nur für MSD-Staff (msd_csm, msd_ma, system_admin)
-- 2. "Users can view own company orders" - nur für die eigene Company

-- ============================================
-- NACH AUSFÜHRUNG: Bitte testen mit test@golfyr.ch
-- Golfyr sollte NUR Golfyr Orders sehen, NICHT Aviano Orders!
-- ============================================

