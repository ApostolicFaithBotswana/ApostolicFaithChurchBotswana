-- AFC Botswana — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor

-- ─────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  start_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS site_config (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

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

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_site_events_start_date ON site_events (start_date);
CREATE INDEX IF NOT EXISTS idx_camp_announcements_timestamp ON camp_announcements (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_camp_testimonies_published ON camp_testimonies (published, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_camp_attendance_session ON camp_attendance (session);
CREATE INDEX IF NOT EXISTS idx_store_products_key ON store_products (product_key);
CREATE INDEX IF NOT EXISTS idx_camp_service_att_date ON camp_service_attendance (service_date DESC);

-- ─────────────────────────────────────────────
-- DEFAULT SITE CONFIG
-- ─────────────────────────────────────────────

INSERT INTO site_config (id, data) VALUES
  ('main', '{
    "key": "main",
    "hero_title": "Welcome to Apostolic Faith Church",
    "about_text": "The Apostolic Faith Church of Portland, Oregon – Botswana Branch is a vibrant community of believers dedicated to spreading the Gospel of Jesus Christ.",
    "contact_email": "contact@afcobotswana.org",
    "contact_phone": "+267 71 234 567"
  }'::jsonb),
  ('hero_verse', '{
    "text": "For where two or three gather in my name, there am I with them.",
    "reference": "Matthew 18:20"
  }'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_registrations ENABLE ROW LEVEL SECURITY;
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

-- Public read (site + camp public pages)
CREATE POLICY "public_read_site_events" ON site_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_site_config" ON site_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_camp_announcements" ON camp_announcements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_camp_schedule" ON camp_schedule FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_store_products" ON store_products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_published_testimonies" ON camp_testimonies FOR SELECT TO anon, authenticated USING (published = true);

-- Public inserts (forms)
CREATE POLICY "public_insert_site_registrations" ON site_registrations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_insert_camp_registrations" ON camp_registrations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_insert_camp_orders" ON camp_orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_insert_camp_prayers" ON camp_prayers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_insert_camp_journal" ON camp_journal FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "public_insert_camp_testimonies" ON camp_testimonies FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Authenticated admins — full access
CREATE POLICY "admin_all_site_events" ON site_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_site_config" ON site_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_read_site_registrations" ON site_registrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all_camp_registrations" ON camp_registrations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_camp_orders" ON camp_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_camp_announcements" ON camp_announcements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_camp_attendance" ON camp_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_camp_prayers" ON camp_prayers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_camp_journal" ON camp_journal FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_camp_testimonies" ON camp_testimonies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_store_products" ON store_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_camp_service_attendance" ON camp_service_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_camp_schedule" ON camp_schedule FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "public_read_camp_registrations" ON camp_registrations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_camp_orders" ON camp_orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read_camp_journal" ON camp_journal FOR SELECT TO anon, authenticated USING (true);

-- Optional: enable Realtime in Dashboard → Database → Replication for:
-- camp_announcements, camp_orders, camp_testimonies, camp_schedule
