-- ============================================================
-- FIX: RLS pour onboarding — organizations + project_members
-- Un nouveau user doit pouvoir creer une org et s'y ajouter
-- ============================================================

-- 1. Organizations: tout user authentifie peut creer une org
DO $$ BEGIN
  DROP POLICY IF EXISTS org_insert ON organizations;
  CREATE POLICY org_insert ON organizations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 2. Organizations: le createur peut UPDATE son org
DO $$ BEGIN
  DROP POLICY IF EXISTS org_update ON organizations;
  CREATE POLICY org_update ON organizations
    FOR UPDATE USING (
      id IN (
        SELECT org_id FROM project_members
        WHERE user_id = auth.uid() AND is_admin = true
      )
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 3. project_members: un user peut inserer sa propre ligne (onboarding)
-- Cette policy devrait deja exister mais on la recree par securite
DO $$ BEGIN
  DROP POLICY IF EXISTS pm_self_insert ON project_members;
  CREATE POLICY pm_self_insert ON project_members
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 4. user_details: un user peut inserer/update sa propre ligne
DO $$ BEGIN
  ALTER TABLE user_details ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS ud_select ON user_details;
  DROP POLICY IF EXISTS ud_insert ON user_details;
  DROP POLICY IF EXISTS ud_update ON user_details;
  CREATE POLICY ud_select ON user_details FOR SELECT USING (user_id = auth.uid());
  CREATE POLICY ud_insert ON user_details FOR INSERT WITH CHECK (user_id = auth.uid());
  CREATE POLICY ud_update ON user_details FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── VERIFICATION ───
SELECT tablename, policyname, cmd, permissive
FROM pg_policies
WHERE tablename IN ('organizations', 'project_members', 'user_details')
ORDER BY tablename, cmd;
