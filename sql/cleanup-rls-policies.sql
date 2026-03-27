-- ============================================================
-- CLEANUP: Remove redundant RLS policies
-- Applied 2026-03-26 — fixes BUG-010/BUG-011 investigation
-- ============================================================

-- ─── project_members: Replace 13 overlapping policies with 4 clean ones ───

-- Drop all old SELECT policies (pm_select 'true' was too permissive)
DROP POLICY IF EXISTS pm_select ON project_members;
DROP POLICY IF EXISTS pm_org_select ON project_members;
DROP POLICY IF EXISTS pm_self_select ON project_members;

-- Drop all old INSERT policies (pm_insert 'true' was too permissive)
DROP POLICY IF EXISTS pm_insert ON project_members;
DROP POLICY IF EXISTS pm_admin_insert ON project_members;
DROP POLICY IF EXISTS pm_self_insert ON project_members;

-- Drop all old UPDATE policies (pm_update 'true' was too permissive)
DROP POLICY IF EXISTS pm_update ON project_members;
DROP POLICY IF EXISTS pm_admin_update ON project_members;
DROP POLICY IF EXISTS pm_self_update ON project_members;

-- Drop all old DELETE policies (pm_delete 'true' was too permissive)
DROP POLICY IF EXISTS pm_delete ON project_members;

-- Also drop the broken pm_select_own (used get_user_org_ids() which caused 403 via PostgREST)
DROP POLICY IF EXISTS pm_select_own ON project_members;
DROP POLICY IF EXISTS pm_select_invited_email ON project_members;

-- Recreate clean, minimal policies
-- SELECT: unified policy — own memberships + same-org members + invitations by email
-- IMPORTANT: uses direct subquery, NOT function call (PostgREST 403 regression with functions)
DO $$ BEGIN
  CREATE POLICY pm_select_all ON project_members
    FOR SELECT USING (
      user_id = auth.uid()
      OR org_id IN (SELECT pm2.org_id FROM project_members pm2 WHERE pm2.user_id = auth.uid())
      OR (status = 'invited' AND email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- INSERT: self-insert (onboarding) or admin can invite
DO $$ BEGIN
  CREATE POLICY pm_insert_clean ON project_members
    FOR INSERT WITH CHECK (
      user_id = auth.uid()
      OR is_org_admin(auth.uid(), org_id)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UPDATE: self or admin
DO $$ BEGIN
  CREATE POLICY pm_update_clean ON project_members
    FOR UPDATE USING (
      user_id = auth.uid()
      OR is_org_admin(auth.uid(), org_id)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- UPDATE: invited users can claim (update user_id + status) their invitation
DO $$ BEGIN
  CREATE POLICY pm_update_claim_invite ON project_members
    FOR UPDATE USING (
      status = 'invited' AND email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DELETE: admin only
DO $$ BEGIN
  CREATE POLICY pm_delete_admin ON project_members
    FOR DELETE USING (
      is_org_admin(auth.uid(), org_id)
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── user_details: Remove duplicates ───
DROP POLICY IF EXISTS ud_insert ON user_details;
DROP POLICY IF EXISTS ud_select ON user_details;
DROP POLICY IF EXISTS ud_update ON user_details;

-- ─── project_invitations: Remove duplicates ───
DROP POLICY IF EXISTS pi_insert ON project_invitations;
DROP POLICY IF EXISTS pi_select ON project_invitations;

-- ─── VERIFICATION ───
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'project_members'
ORDER BY cmd;
