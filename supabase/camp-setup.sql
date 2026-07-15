-- ═══════════════════════════════════════════════════════════
-- AFC Botswana — Camp Meeting 2026 Supabase setup
-- Paste into Supabase Dashboard → SQL Editor → Run
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT)
-- ═══════════════════════════════════════════════════════════

-- Core camp tables (no-op if you already ran schema.sql)
CREATE TABLE IF NOT EXISTS camp_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  session TEXT,
  registrant_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp_prayers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp_testimonies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  published BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  product_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp_service_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  service_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  day_name TEXT,
  time_slot TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Editable camp landing config (hero, venue, contact, theme)
CREATE TABLE IF NOT EXISTS camp_config (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_camp_announcements_timestamp ON camp_announcements (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_camp_testimonies_published ON camp_testimonies (published, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_camp_attendance_session ON camp_attendance (session);
CREATE INDEX IF NOT EXISTS idx_store_products_key ON store_products (product_key);
CREATE INDEX IF NOT EXISTS idx_camp_service_att_date ON camp_service_attendance (service_date DESC);
CREATE INDEX IF NOT EXISTS idx_camp_regs_created ON camp_registrations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_camp_orders_created ON camp_orders (created_at DESC);

INSERT INTO camp_config (id, data) VALUES
  ('main', '{
    "theme_line1": "The Just Shall",
    "theme_line2": "Live by Faith",
    "theme_ref": "Romans 1:17 (KJV)",
    "theme_quote": "For therein is the righteousness of God revealed from faith to faith: as it is written, The just shall live by faith.",
    "theme_body": "This year'\''s camp meeting calls us to a deeper walk of faith — trusting God completely, living by His Word, and standing firm in His righteousness.",
    "dates_label": "19–26 July 2026",
    "start_date": "2026-07-19",
    "end_date": "2026-07-26",
    "venue_name": "Apostolic Faith Church — Greater Gaborone Branch",
    "venue_address": "Plot 54201, Phase 4, Gaborone",
    "opening_service": "09:00 AM",
    "phone": "+267 75 222 415",
    "whatsapp": "26776159933",
    "map_lat": -24.68379308147856,
    "map_lng": 25.882944318902148
  }'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE camp_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_prayers ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_testimonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_service_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE camp_config ENABLE ROW LEVEL SECURITY;

-- Drop-and-recreate select policies that may already exist (ignore errors if names differ)
DO $$ BEGIN
  CREATE POLICY "public_read_camp_config" ON camp_config FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_camp_config" ON camp_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_read_camp_announcements" ON camp_announcements FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_read_camp_schedule" ON camp_schedule FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_read_store_products" ON store_products FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_read_published_testimonies" ON camp_testimonies FOR SELECT TO anon, authenticated USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_insert_camp_registrations" ON camp_registrations FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_insert_camp_orders" ON camp_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_insert_camp_prayers" ON camp_prayers FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_insert_camp_journal" ON camp_journal FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_insert_camp_testimonies" ON camp_testimonies FOR INSERT TO anon, authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_read_camp_registrations" ON camp_registrations FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_read_camp_orders" ON camp_orders FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "public_read_camp_journal" ON camp_journal FOR SELECT TO anon, authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_camp_registrations" ON camp_registrations FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_camp_orders" ON camp_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_camp_announcements" ON camp_announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_camp_attendance" ON camp_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_camp_prayers" ON camp_prayers FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_camp_journal" ON camp_journal FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_camp_testimonies" ON camp_testimonies FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_store_products" ON store_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_camp_service_attendance" ON camp_service_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "admin_all_camp_schedule" ON camp_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Realtime (skip any line that errors if already enabled)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE camp_announcements;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE camp_schedule;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE camp_orders;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE camp_registrations;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE camp_testimonies;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE camp_config;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

-- Done.
-- Camp registrations appear in Camp Admin → Manager AND Main Site Admin → Registrations.
