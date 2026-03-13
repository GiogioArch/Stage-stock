-- ============================================================
-- RLS ORG ISOLATION — Stage Stock v10.1
-- Sécurité multi-tenant : chaque user ne voit que son org
-- ============================================================

-- ─── HELPER: auth.uid() retourne l'ID du user connecté ───

-- ============================================================
-- 1. ENABLE RLS on all tables that don't have it yet
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE subfamilies ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. DROP existing permissive policies
-- ============================================================
DO $$ BEGIN
  -- organizations
  DROP POLICY IF EXISTS org_select_all ON organizations;
  DROP POLICY IF EXISTS org_select ON organizations;
  -- project_members
  DROP POLICY IF EXISTS pm_select_own_orgs ON project_members;
  DROP POLICY IF EXISTS pm_insert_admin ON project_members;
  DROP POLICY IF EXISTS pm_update ON project_members;
  -- user_profiles
  DROP POLICY IF EXISTS user_profiles_select_all ON user_profiles;
  DROP POLICY IF EXISTS user_profiles_insert_own ON user_profiles;
  DROP POLICY IF EXISTS user_profiles_update_own ON user_profiles;
  DROP POLICY IF EXISTS up_select ON user_profiles;
  DROP POLICY IF EXISTS up_insert ON user_profiles;
  DROP POLICY IF EXISTS up_update ON user_profiles;
  -- event_packing
  DROP POLICY IF EXISTS event_packing_select ON event_packing;
  DROP POLICY IF EXISTS event_packing_insert ON event_packing;
  DROP POLICY IF EXISTS event_packing_update ON event_packing;
  DROP POLICY IF EXISTS event_packing_delete ON event_packing;
  DROP POLICY IF EXISTS ep_select ON event_packing;
  DROP POLICY IF EXISTS ep_insert ON event_packing;
  DROP POLICY IF EXISTS ep_update ON event_packing;
  DROP POLICY IF EXISTS ep_delete ON event_packing;
  -- roles
  DROP POLICY IF EXISTS roles_select_all ON roles;
  DROP POLICY IF EXISTS roles_select ON roles;
END $$;

-- ============================================================
-- 3. CREATE SECURE POLICIES — org-isolated
-- ============================================================

-- Helper subquery used in all policies:
-- SELECT org_id FROM project_members WHERE user_id = auth.uid()
-- Returns all org_ids the current user belongs to

-- ─── ORGANIZATIONS ───
CREATE POLICY org_select ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

-- ─── PROJECT_MEMBERS ───
-- Users can see members of their own orgs only
CREATE POLICY pm_select ON project_members
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

-- Admins can insert (invite) into their own org
CREATE POLICY pm_insert ON project_members
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM project_members
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Admins can update members of their own org
CREATE POLICY pm_update ON project_members
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM project_members
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- ─── USER_PROFILES ───
CREATE POLICY up_select ON user_profiles
  FOR SELECT USING (true);
-- Everyone can read profiles (needed for role display)

CREATE POLICY up_insert ON user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY up_update ON user_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- ─── ROLES ───
-- Roles are reference data, everyone can read
CREATE POLICY roles_select ON roles
  FOR SELECT USING (true);

-- ─── PRODUCTS ───
CREATE POLICY products_select ON products
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY products_insert ON products
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY products_update ON products
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY products_delete ON products
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

-- ─── LOCATIONS ───
CREATE POLICY locations_select ON locations
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY locations_insert ON locations
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY locations_update ON locations
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY locations_delete ON locations
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

-- ─── STOCK ───
CREATE POLICY stock_select ON stock
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY stock_insert ON stock
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY stock_update ON stock
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY stock_delete ON stock
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

-- ─── MOVEMENTS ───
CREATE POLICY movements_select ON movements
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY movements_insert ON movements
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

-- ─── EVENTS ───
CREATE POLICY events_select ON events
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY events_insert ON events
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY events_update ON events
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY events_delete ON events
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

-- ─── FAMILIES ───
CREATE POLICY families_select ON families
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY families_insert ON families
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

-- ─── SUBFAMILIES ───
CREATE POLICY subfamilies_select ON subfamilies
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY subfamilies_insert ON subfamilies
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

-- ─── CHECKLISTS ───
CREATE POLICY checklists_select ON checklists
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY checklists_insert ON checklists
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY checklists_update ON checklists
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY checklists_delete ON checklists
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

-- ─── EVENT_PACKING ───
CREATE POLICY ep_select ON event_packing
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY ep_insert ON event_packing
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY ep_update ON event_packing
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY ep_delete ON event_packing
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- 4. SPECIAL CASE: project_members self-insert for new users
-- ============================================================
-- A new user with NO memberships needs to be able to get one
-- This is handled by ProjectPicker auto-creating a default membership
-- We need a policy that allows inserting your own record
CREATE POLICY pm_self_insert ON project_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Also allow users to read their own memberships (bootstrap)
CREATE POLICY pm_self_select ON project_members
  FOR SELECT USING (user_id = auth.uid());

-- ============================================================
-- 5. VERIFICATION
-- ============================================================
SELECT
  schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
