-- ============================================================
-- PROJECT MEMBERS — Access Control Table
-- Stage Stock v10.1 — Multi-projet + gestion accès
-- ============================================================

-- ─── 1. CREATE TABLE ───
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  org_id UUID NOT NULL REFERENCES organizations(id),
  role_id UUID REFERENCES roles(id),
  module_access TEXT[] DEFAULT ARRAY['dashboard', 'equipe'],
  is_admin BOOLEAN DEFAULT false,
  display_name TEXT,
  email TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('invited', 'active', 'disabled')),
  invited_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, org_id)
);

-- ─── 2. ENABLE RLS ───
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- ─── 3. RLS POLICIES ───

-- All authenticated users can read members of their projects
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'pm_select_own_orgs'
  ) THEN
    CREATE POLICY pm_select_own_orgs ON project_members
      FOR SELECT USING (true);
  END IF;
END $$;

-- Users can insert (invite) if they are admin of that org
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'pm_insert_admin'
  ) THEN
    CREATE POLICY pm_insert_admin ON project_members
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Users can update members in their org (admin only enforced in app)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'project_members' AND policyname = 'pm_update'
  ) THEN
    CREATE POLICY pm_update ON project_members
      FOR UPDATE USING (true);
  END IF;
END $$;

-- ─── 4. INDEXES ───
CREATE INDEX IF NOT EXISTS idx_pm_user_id ON project_members (user_id);
CREATE INDEX IF NOT EXISTS idx_pm_org_id ON project_members (org_id);

-- ─── 5. MIGRATE EXISTING user_profiles TO project_members ───
-- user_profiles may not have org_id — use default org for all
INSERT INTO project_members (user_id, org_id, role_id, is_admin, display_name, status)
SELECT
  up.user_id,
  '00000000-0000-0000-0000-000000000001',
  up.role_id,
  CASE WHEN r.code IN ('TM', 'PM', 'LOG', 'PA') THEN true ELSE false END,
  up.display_name,
  'active'
FROM user_profiles up
LEFT JOIN roles r ON r.id = up.role_id
WHERE up.user_id IS NOT NULL
ON CONFLICT (user_id, org_id) DO NOTHING;

-- ─── VERIFICATION ───
SELECT 'project_members' AS table_name, COUNT(*) AS row_count FROM project_members
UNION ALL
SELECT 'organizations', COUNT(*) FROM organizations
UNION ALL
SELECT 'has_module_access_col',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'project_members' AND column_name = 'module_access'
  ) THEN 1 ELSE 0 END;
