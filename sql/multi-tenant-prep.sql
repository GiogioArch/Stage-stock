-- ============================================================
-- MULTI-TENANT PREPARATION — Stage Stock v9.0
-- Adds org_id to all main tables for future SaaS isolation
-- ============================================================

-- ─── 1. CREATE ORGANIZATIONS TABLE ───
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  logo TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. ADD org_id TO MAIN TABLES (idempotent) ───

-- Helper function to add org_id column if not exists
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'products', 'locations', 'stock', 'movements', 'events',
    'families', 'subfamilies', 'checklists', 'roles',
    'event_packing', 'user_profiles'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = tbl AND column_name = 'org_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN org_id UUID REFERENCES organizations(id)', tbl);
    END IF;
  END LOOP;
END $$;

-- ─── 3. CREATE DEFAULT ORGANIZATION ───
INSERT INTO organizations (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'EK SHOP', 'ek-shop', 'pro')
ON CONFLICT (id) DO NOTHING;

-- ─── 4. SET DEFAULT org_id FOR EXISTING DATA ───
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'products', 'locations', 'stock', 'movements', 'events',
    'families', 'subfamilies', 'checklists', 'roles',
    'event_packing', 'user_profiles'
  ] LOOP
    EXECUTE format(
      'UPDATE %I SET org_id = ''00000000-0000-0000-0000-000000000001'' WHERE org_id IS NULL',
      tbl
    );
  END LOOP;
END $$;

-- ─── 5. CREATE INDEXES FOR org_id (performance) ───
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'products', 'locations', 'stock', 'movements', 'events',
    'families', 'subfamilies', 'checklists', 'roles',
    'event_packing', 'user_profiles'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = format('idx_%s_org_id', tbl)
    ) THEN
      EXECUTE format('CREATE INDEX idx_%s_org_id ON %I (org_id)', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- ─── 6. ENABLE RLS ON ORGANIZATIONS ───
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'org_select_all'
  ) THEN
    CREATE POLICY org_select_all ON organizations FOR SELECT USING (true);
  END IF;
END $$;

-- ─── VERIFICATION ───
SELECT 'organizations' AS item, COUNT(*) AS count FROM organizations
UNION ALL
SELECT 'products_has_org_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'org_id'
  ) THEN 1 ELSE 0 END
UNION ALL
SELECT 'events_has_org_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'org_id'
  ) THEN 1 ELSE 0 END
UNION ALL
SELECT 'roles_has_org_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'org_id'
  ) THEN 1 ELSE 0 END;
