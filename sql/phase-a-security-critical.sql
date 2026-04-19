-- ================================================================
-- PHASE A — Corrections de securite CRITIQUES
-- Date : 2026-04-18
-- Migration UNIQUE, IDEMPOTENTE, executable de bout en bout
--
-- Contenu :
--  1. Fonction helper event_has_active_session (si manquante)
--  2. Fix RLS projects (les 4 policies USING(true) etaient wide-open)
--  3. Fix RLS organizations.org_select (USING(true) -> scoped)
--  4. Fix RLS user_profiles.up_select (USING(true) -> scoped)
--  5. Fix RLS project_invitations (leak token, hijack pending)
--  6. Fix RLS live_* inserts (accept anon mais valider event_id)
--  7. Creation table audit_logs + RLS
--  8. ALTER VIEW security_invoker sur les 2 vues SECURITY DEFINER
--  9. Fix search_path mutable sur 2 fonctions
-- 10. Verification finale
-- ================================================================

BEGIN;

-- ================================================================
-- 1. Helper : event_has_active_session(event_id)
-- Utilise par les policies live_* INSERT pour valider l'event
-- ================================================================

CREATE OR REPLACE FUNCTION public.event_has_active_session(eid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM live_sessions ls
    WHERE ls.event_id = eid
      AND ls.created_at > now() - interval '12 hours'
  );
$$;

GRANT EXECUTE ON FUNCTION public.event_has_active_session(uuid) TO anon, authenticated;

-- ================================================================
-- 2. Fix RLS `projects` (etait wide-open sur DELETE/UPDATE/INSERT/SELECT)
-- ================================================================

DROP POLICY IF EXISTS projects_select ON public.projects;
DROP POLICY IF EXISTS projects_insert ON public.projects;
DROP POLICY IF EXISTS projects_update ON public.projects;
DROP POLICY IF EXISTS projects_delete ON public.projects;

CREATE POLICY projects_select ON public.projects FOR SELECT
  USING (org_id IN (SELECT get_user_org_ids(auth.uid())));

CREATE POLICY projects_insert ON public.projects FOR INSERT
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid()))
              AND is_org_admin(auth.uid(), org_id));

CREATE POLICY projects_update ON public.projects FOR UPDATE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid()))
         AND is_org_admin(auth.uid(), org_id))
  WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid()))
              AND is_org_admin(auth.uid(), org_id));

CREATE POLICY projects_delete ON public.projects FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid()))
         AND is_org_admin(auth.uid(), org_id));

-- ================================================================
-- 3. Fix RLS `organizations.org_select` (etait USING(true))
-- ================================================================

DROP POLICY IF EXISTS org_select ON public.organizations;

CREATE POLICY org_select ON public.organizations FOR SELECT
  USING (id IN (SELECT get_user_org_ids(auth.uid())));

-- ================================================================
-- 4. Fix RLS `user_profiles.up_select` (etait USING(true) -> PII leak)
-- ================================================================

DROP POLICY IF EXISTS up_select ON public.user_profiles;

CREATE POLICY up_select ON public.user_profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR org_id IN (SELECT get_user_org_ids(auth.uid()))
  );

-- ================================================================
-- 5. Fix RLS `project_invitations`
--    Avant : (accepted_at IS NULL) OR ... -> tout user voit tous les tokens
--    Avant : UPDATE ... OR (accepted_at IS NULL) -> hijack possible
-- ================================================================

DROP POLICY IF EXISTS invitations_select_by_token ON public.project_invitations;
DROP POLICY IF EXISTS invitations_update ON public.project_invitations;

CREATE POLICY invitations_select_by_token ON public.project_invitations FOR SELECT
  USING (
    org_id IN (SELECT get_user_org_ids(auth.uid()))
    OR (accepted_at IS NULL AND email = get_my_email())
  );

CREATE POLICY invitations_update ON public.project_invitations FOR UPDATE
  USING (
    (org_id IN (SELECT get_user_org_ids(auth.uid()))
     AND is_org_admin(auth.uid(), org_id))
    OR (accepted_at IS NULL AND email = get_my_email())
  );

-- ================================================================
-- 6. Fix RLS live_* (INSERT WITH CHECK(true) -> valider event_id)
-- ================================================================

-- live_sessions : creation uniquement par staff de l'org
DROP POLICY IF EXISTS live_sessions_insert_fan ON public.live_sessions;
DROP POLICY IF EXISTS live_sessions_insert_staff ON public.live_sessions;

CREATE POLICY live_sessions_insert_staff ON public.live_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    event_id IN (SELECT id FROM events WHERE org_id IN (SELECT get_user_org_ids(auth.uid())))
  );

-- live_orders : fan peut inserer uniquement si l'event a une session active
DROP POLICY IF EXISTS live_orders_insert_fan ON public.live_orders;

CREATE POLICY live_orders_insert_fan ON public.live_orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (event_has_active_session(event_id));

-- live_order_items : fan peut inserer uniquement si l'order parent existe et est recent
DROP POLICY IF EXISTS live_order_items_insert_fan ON public.live_order_items;

CREATE POLICY live_order_items_insert_fan ON public.live_order_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM live_orders
      WHERE created_at > now() - interval '2 hours'
    )
  );

-- live_votes : fan peut voter uniquement si l'event a une session active
DROP POLICY IF EXISTS live_votes_insert_fan ON public.live_votes;

CREATE POLICY live_votes_insert_fan ON public.live_votes FOR INSERT
  TO anon, authenticated
  WITH CHECK (event_has_active_session(event_id));

-- live_reactions : idem
DROP POLICY IF EXISTS live_reactions_insert_fan ON public.live_reactions;

CREATE POLICY live_reactions_insert_fan ON public.live_reactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (event_has_active_session(event_id));

-- ================================================================
-- 7. Creer table audit_logs + RLS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL,
  user_id uuid,
  org_id uuid,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created
  ON public.audit_logs(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
  ON public.audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target
  ON public.audit_logs(target_type, target_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies audit_logs
DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;

CREATE POLICY audit_logs_select ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (org_id IS NOT NULL
        AND org_id IN (SELECT get_user_org_ids(auth.uid()))
        AND is_org_admin(auth.uid(), org_id))
  );

CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (org_id IS NULL OR org_id IN (SELECT get_user_org_ids(auth.uid())))
  );

-- audit_logs immuable : pas de UPDATE ni DELETE via l'API
-- (pas de policy = deny par defaut avec RLS active)

-- ================================================================
-- 8. Fermer les 2 vues SECURITY DEFINER (bypass RLS)
-- ================================================================

-- Postgres 15+ : security_invoker force la vue a respecter les RLS du caller
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='product_depreciation') THEN
    ALTER VIEW public.product_depreciation SET (security_invoker = true);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='data_integrity_check') THEN
    ALTER VIEW public.data_integrity_check SET (security_invoker = true);
  END IF;
END $$;

-- ================================================================
-- 9. Fix search_path mutable sur 2 fonctions SECURITY DEFINER
-- ================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='delete_product_atomic' AND pronamespace='public'::regnamespace) THEN
    ALTER FUNCTION public.delete_product_atomic(uuid) SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname='delete_location_atomic' AND pronamespace='public'::regnamespace) THEN
    ALTER FUNCTION public.delete_location_atomic(uuid) SET search_path = public, pg_temp;
  END IF;
END $$;

COMMIT;

-- ================================================================
-- 10. VERIFICATION FINALE
-- ================================================================

-- Les policies doivent toutes etre scopees (aucune USING(true) non-justifiee)
SELECT 'Policies avec USING(true) restantes :' as check_label;
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual = 'true' OR with_check = 'true')
  -- On exclut les SELECT fan des live_* (intentionnellement publics pour l'affichage fan)
  AND policyname NOT IN (
    'live_sessions_select_fan', 'live_orders_select_fan',
    'live_order_items_select_fan', 'live_votes_select_fan',
    'live_reactions_select_fan'
  )
ORDER BY tablename, cmd;

-- Table audit_logs doit exister
SELECT 'Table audit_logs exists :' as check_label,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_logs') as exists;

-- Vues SECURITY DEFINER doivent etre fermees
SELECT 'Vues avec security_invoker :' as check_label;
SELECT schemaname, viewname,
       (SELECT option_value FROM pg_options_to_table(relc.reloptions)
        WHERE option_name='security_invoker') as security_invoker
FROM pg_views pv
JOIN pg_class relc ON relc.relname = pv.viewname
WHERE pv.schemaname = 'public'
  AND pv.viewname IN ('product_depreciation', 'data_integrity_check');

-- Fonctions search_path
SELECT 'Fonctions search_path :' as check_label;
SELECT proname, proconfig
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('delete_product_atomic', 'delete_location_atomic', 'event_has_active_session');
