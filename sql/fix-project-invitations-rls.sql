-- ═══════════════════════════════════════════════
-- Fix: project_invitations — RLS policies
-- RLS est activé mais aucune policy n'existait
-- ═══════════════════════════════════════════════

-- S'assurer que RLS est activé
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- ─── SELECT : tout user authentifié peut lire une invitation non acceptée par son token ───
-- (nécessaire pour valider le token d'invitation côté client)
DROP POLICY IF EXISTS invitations_select_by_token ON project_invitations;
CREATE POLICY invitations_select_by_token ON project_invitations
  FOR SELECT TO authenticated USING (
    accepted_at IS NULL
    OR org_id IN (SELECT get_user_org_ids(auth.uid()))
  );

-- ─── INSERT : seuls les membres de l'org peuvent créer des invitations ───
DROP POLICY IF EXISTS invitations_insert ON project_invitations;
CREATE POLICY invitations_insert ON project_invitations
  FOR INSERT TO authenticated WITH CHECK (
    org_id IN (SELECT get_user_org_ids(auth.uid()))
  );

-- ─── UPDATE : seuls les membres de l'org peuvent marquer comme acceptée ───
DROP POLICY IF EXISTS invitations_update ON project_invitations;
CREATE POLICY invitations_update ON project_invitations
  FOR UPDATE TO authenticated USING (
    org_id IN (SELECT get_user_org_ids(auth.uid()))
    OR accepted_at IS NULL -- permettre à l'invité de marquer l'invite comme acceptée
  );

-- ─── DELETE : seuls les admins de l'org (via membership) ───
DROP POLICY IF EXISTS invitations_delete ON project_invitations;
CREATE POLICY invitations_delete ON project_invitations
  FOR DELETE TO authenticated USING (
    org_id IN (SELECT get_user_org_ids(auth.uid()))
  );

-- ─── Vérification ───
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename = 'project_invitations'
ORDER BY policyname;
