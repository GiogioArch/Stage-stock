-- ═══════════════════════════════════════════════
-- Fix: project_members RLS infinite recursion + delete_project_atomic RPC
-- ═══════════════════════════════════════════════

-- 1. Helper SECURITY DEFINER : bypass RLS pour récupérer les org_ids du user
CREATE OR REPLACE FUNCTION get_my_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM project_members WHERE user_id = auth.uid();
$$;

-- 2. Helper SECURITY DEFINER : récupérer l'email du user (auth.users inaccessible en authenticated)
CREATE OR REPLACE FUNCTION get_my_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid();
$$;

-- 3. Recréer is_org_admin en SECURITY DEFINER (casse la récursion)
CREATE OR REPLACE FUNCTION is_org_admin(uid UUID, check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE user_id = uid AND org_id = check_org_id AND is_admin = true AND status = 'active'
  );
$$;

-- 4. Recréer pm_select_all sans récursion
DROP POLICY IF EXISTS pm_select_all ON project_members;
CREATE POLICY pm_select_all ON project_members
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR org_id IN (SELECT get_my_org_ids())
    OR (status = 'invited' AND email = get_my_email())
  );

-- 5. Corriger pm_update_claim_invite (même problème auth.users)
DROP POLICY IF EXISTS pm_update_claim_invite ON project_members;
CREATE POLICY pm_update_claim_invite ON project_members
  FOR UPDATE TO authenticated USING (
    status = 'invited' AND email = get_my_email()
  );

-- 6. RPC delete_project_atomic — suppression atomique d'un projet
DROP FUNCTION IF EXISTS delete_project_atomic(UUID);
CREATE OR REPLACE FUNCTION delete_project_atomic(p_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_admin BOOLEAN;
  v_org_name TEXT;
  v_member_count INT;
BEGIN
  -- Vérifier que le user est admin de l'org
  SELECT is_admin INTO v_is_admin
  FROM project_members
  WHERE user_id = v_uid AND org_id = p_org_id AND status = 'active';

  IF v_is_admin IS NULL OR v_is_admin = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seul un admin peut supprimer ce projet');
  END IF;

  SELECT name INTO v_org_name FROM organizations WHERE id = p_org_id;
  SELECT count(*) INTO v_member_count FROM project_members WHERE org_id = p_org_id AND status = 'active';

  -- Supprimer les données enfants (feuilles → racines)
  DELETE FROM cash_reports WHERE org_id = p_org_id;
  DELETE FROM expenses WHERE org_id = p_org_id;
  DELETE FROM sale_items WHERE org_id = p_org_id;
  DELETE FROM sales WHERE org_id = p_org_id;
  DELETE FROM purchase_receipts WHERE org_id = p_org_id;
  DELETE FROM purchase_order_lines WHERE org_id = p_org_id;
  DELETE FROM purchase_orders WHERE org_id = p_org_id;
  DELETE FROM supplier_documents WHERE org_id = p_org_id;
  DELETE FROM supplier_products WHERE org_id = p_org_id;
  DELETE FROM suppliers WHERE org_id = p_org_id;
  DELETE FROM transport_costs WHERE org_id = p_org_id;
  DELETE FROM transport_manifests WHERE org_id = p_org_id;
  DELETE FROM transport_bookings WHERE org_id = p_org_id;
  DELETE FROM transport_needs WHERE org_id = p_org_id;
  DELETE FROM transport_routes WHERE org_id = p_org_id;
  DELETE FROM vehicles WHERE org_id = p_org_id;
  DELETE FROM transport_providers WHERE org_id = p_org_id;
  DELETE FROM partner_deliverables WHERE org_id = p_org_id;
  DELETE FROM partnership_agreements WHERE org_id = p_org_id;
  DELETE FROM partner_interactions WHERE org_id = p_org_id;
  DELETE FROM partner_documents WHERE org_id = p_org_id;
  DELETE FROM partner_events WHERE org_id = p_org_id;
  DELETE FROM partner_contacts WHERE org_id = p_org_id;
  DELETE FROM partners WHERE org_id = p_org_id;
  DELETE FROM event_packing WHERE org_id = p_org_id;
  DELETE FROM event_task_templates WHERE org_id = p_org_id;
  DELETE FROM event_tasks WHERE org_id = p_org_id;
  DELETE FROM checklists WHERE org_id = p_org_id;
  DELETE FROM feedback WHERE org_id = p_org_id;
  DELETE FROM movements WHERE org_id = p_org_id;
  DELETE FROM stock WHERE org_id = p_org_id;
  DELETE FROM events WHERE org_id = p_org_id;
  DELETE FROM locations WHERE org_id = p_org_id;
  DELETE FROM products WHERE org_id = p_org_id;
  DELETE FROM subfamilies WHERE org_id = p_org_id;
  DELETE FROM families WHERE org_id = p_org_id;
  DELETE FROM user_profiles WHERE org_id = p_org_id;
  DELETE FROM project_invitations WHERE org_id = p_org_id;
  DELETE FROM project_members WHERE org_id = p_org_id;
  DELETE FROM projects WHERE org_id = p_org_id;
  DELETE FROM roles WHERE org_id = p_org_id;
  DELETE FROM organizations WHERE id = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_org', v_org_name,
    'members_removed', v_member_count
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Vérification
SELECT proname FROM pg_proc WHERE proname IN ('delete_project_atomic', 'get_my_org_ids', 'get_my_email');
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'project_members' ORDER BY policyname;
