-- ============================================================
-- FIX: Allow authenticated users to create organizations
-- Needed for onboarding (new user creates their first project)
-- ============================================================

-- Allow any authenticated user to insert an organization
DO $$ BEGIN
  DROP POLICY IF EXISTS org_insert ON organizations;
  CREATE POLICY org_insert ON organizations
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── VERIFICATION ───
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'organizations'
ORDER BY cmd;
