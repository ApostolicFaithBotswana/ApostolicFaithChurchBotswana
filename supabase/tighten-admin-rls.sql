-- ─────────────────────────────────────────────
-- TIGHTEN ADMIN RLS — role-based access
--
-- Run this in the Supabase Dashboard → SQL Editor, AFTER schema.sql has
-- already been applied. It replaces the blanket "any authenticated user
-- gets full access to every table" policies with a two-tier split:
--
--   bw.ycm.2024@gmail.com  (Camp Manager + Main Site editor) → full access
--   bwstore2026@gmail.com  (Store Manager + Secretary)       → store,
--     orders, registrations, attendance, and records tables only —
--     NOT main-site content or camp settings.
--
-- NOTE: Store Manager and Secretary share this one login today, so they
-- cannot be separated from each other at the database level — only from
-- the Manager account. If you later create a distinct account for one of
-- them, split is_store_or_secretary() into two functions and update the
-- relevant policies below.
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_camp_manager() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'bw.ycm.2024@gmail.com';
$$;

CREATE OR REPLACE FUNCTION is_store_or_secretary() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'bwstore2026@gmail.com';
$$;

-- Drop the old blanket "any authenticated user" admin policies
DROP POLICY IF EXISTS "admin_all_site_events" ON site_events;
DROP POLICY IF EXISTS "admin_all_site_config" ON site_config;
DROP POLICY IF EXISTS "admin_read_site_registrations" ON site_registrations;
DROP POLICY IF EXISTS "admin_all_camp_registrations" ON camp_registrations;
DROP POLICY IF EXISTS "admin_all_camp_orders" ON camp_orders;
DROP POLICY IF EXISTS "admin_all_camp_announcements" ON camp_announcements;
DROP POLICY IF EXISTS "admin_all_camp_attendance" ON camp_attendance;
DROP POLICY IF EXISTS "admin_all_camp_prayers" ON camp_prayers;
DROP POLICY IF EXISTS "admin_all_camp_journal" ON camp_journal;
DROP POLICY IF EXISTS "admin_all_camp_testimonies" ON camp_testimonies;
DROP POLICY IF EXISTS "admin_all_store_products" ON store_products;
DROP POLICY IF EXISTS "admin_all_camp_service_attendance" ON camp_service_attendance;
DROP POLICY IF EXISTS "admin_all_camp_schedule" ON camp_schedule;
DROP POLICY IF EXISTS "admin_all_camp_config" ON camp_config;
DROP POLICY IF EXISTS "admin_all_site_blocks" ON site_blocks;

-- ── Manager-only: main site content + camp settings ──
CREATE POLICY "manager_all_site_events" ON site_events
  FOR ALL TO authenticated USING (is_camp_manager()) WITH CHECK (is_camp_manager());
CREATE POLICY "manager_all_site_config" ON site_config
  FOR ALL TO authenticated USING (is_camp_manager()) WITH CHECK (is_camp_manager());
CREATE POLICY "manager_all_site_blocks" ON site_blocks
  FOR ALL TO authenticated USING (is_camp_manager()) WITH CHECK (is_camp_manager());
CREATE POLICY "manager_read_site_registrations" ON site_registrations
  FOR SELECT TO authenticated USING (is_camp_manager());
CREATE POLICY "manager_all_camp_announcements" ON camp_announcements
  FOR ALL TO authenticated USING (is_camp_manager()) WITH CHECK (is_camp_manager());
CREATE POLICY "manager_all_camp_schedule" ON camp_schedule
  FOR ALL TO authenticated USING (is_camp_manager()) WITH CHECK (is_camp_manager());
CREATE POLICY "manager_all_camp_config" ON camp_config
  FOR ALL TO authenticated USING (is_camp_manager()) WITH CHECK (is_camp_manager());

-- ── Manager + Store/Secretary: store, orders, registrations, records ──
CREATE POLICY "store_secretary_all_store_products" ON store_products
  FOR ALL TO authenticated USING (is_camp_manager() OR is_store_or_secretary()) WITH CHECK (is_camp_manager() OR is_store_or_secretary());
CREATE POLICY "store_secretary_all_camp_orders" ON camp_orders
  FOR ALL TO authenticated USING (is_camp_manager() OR is_store_or_secretary()) WITH CHECK (is_camp_manager() OR is_store_or_secretary());
CREATE POLICY "store_secretary_all_camp_registrations" ON camp_registrations
  FOR ALL TO authenticated USING (is_camp_manager() OR is_store_or_secretary()) WITH CHECK (is_camp_manager() OR is_store_or_secretary());
CREATE POLICY "store_secretary_all_camp_attendance" ON camp_attendance
  FOR ALL TO authenticated USING (is_camp_manager() OR is_store_or_secretary()) WITH CHECK (is_camp_manager() OR is_store_or_secretary());
CREATE POLICY "store_secretary_all_camp_service_attendance" ON camp_service_attendance
  FOR ALL TO authenticated USING (is_camp_manager() OR is_store_or_secretary()) WITH CHECK (is_camp_manager() OR is_store_or_secretary());
CREATE POLICY "store_secretary_all_camp_journal" ON camp_journal
  FOR ALL TO authenticated USING (is_camp_manager() OR is_store_or_secretary()) WITH CHECK (is_camp_manager() OR is_store_or_secretary());
CREATE POLICY "store_secretary_all_camp_prayers" ON camp_prayers
  FOR ALL TO authenticated USING (is_camp_manager() OR is_store_or_secretary()) WITH CHECK (is_camp_manager() OR is_store_or_secretary());
CREATE POLICY "store_secretary_all_camp_testimonies" ON camp_testimonies
  FOR ALL TO authenticated USING (is_camp_manager() OR is_store_or_secretary()) WITH CHECK (is_camp_manager() OR is_store_or_secretary());
