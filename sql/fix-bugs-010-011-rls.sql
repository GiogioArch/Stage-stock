-- ============================================================
-- FIX BUG-010 + BUG-011 + RLS RECURSION
-- Stage Stock v10.7 — 13 mars 2026
--
-- Ce script corrige en UNE exécution :
-- 1. BUG-011 : Bouton "Créer projet" bloqué (policy INSERT manquante)
-- 2. BUG-010 : Projet EK TOUR 25 disparu (récursion RLS)
-- 3. F1 : project_members policies trop permissives
--
-- EXÉCUTER EN UNE SEULE FOIS dans l'éditeur SQL Supabase (service_role)
-- ============================================================

-- ============================================================
-- ÉTAPE 0 : DIAGNOSTIC AVANT CORRECTION
-- ============================================================
-- Voir les données existantes (exécuté en service_role = bypass RLS)
SELECT 'AVANT CORRECTION' AS phase;
SELECT 'organizations' AS table_name, id, name, slug FROM organizations;
SELECT 'project_members' AS table_name, id, user_id, org_id, is_admin, status FROM project_members;

-- ============================================================
-- ÉTAPE 1 : FONCTION SECURITY DEFINER (casse la récursion RLS)
-- ============================================================
-- PostgreSQL applique le RLS quand une policy fait un SELECT sur sa propre table
-- La solution : une fonction SECURITY DEFINER qui bypass le RLS pour le lookup interne

CREATE OR REPLACE FUNCTION get_user_org_ids(uid UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM project_members WHERE user_id = uid AND status = 'active';
$$;

-- Fonction pour vérifier si un user est admin d'une org
CREATE OR REPLACE FUNCTION is_org_admin(uid UUID, check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE user_id = uid AND org_id = check_org_id AND is_admin = true AND status = 'active'
  );
$$;

-- ============================================================
-- ÉTAPE 2 : DROP TOUTES LES POLICIES EXISTANTES
-- ============================================================
DO $$ BEGIN
  -- organizations
  DROP POLICY IF EXISTS org_select ON organizations;
  DROP POLICY IF EXISTS org_select_all ON organizations;
  DROP POLICY IF EXISTS org_insert ON organizations;

  -- project_members (toutes les variantes possibles)
  DROP POLICY IF EXISTS pm_select ON project_members;
  DROP POLICY IF EXISTS pm_self_select ON project_members;
  DROP POLICY IF EXISTS pm_select_own_orgs ON project_members;
  DROP POLICY IF EXISTS pm_insert ON project_members;
  DROP POLICY IF EXISTS pm_self_insert ON project_members;
  DROP POLICY IF EXISTS pm_insert_admin ON project_members;
  DROP POLICY IF EXISTS pm_update ON project_members;
END $$;

-- ============================================================
-- ÉTAPE 3 : RECREATE POLICIES — SANS RÉCURSION
-- ============================================================

-- ─── ORGANIZATIONS ───

-- SELECT : user voit les orgs dont il est membre (via fonction SECURITY DEFINER)
CREATE POLICY org_select ON organizations
  FOR SELECT USING (
    id IN (SELECT get_user_org_ids(auth.uid()))
  );

-- INSERT : tout user authentifié peut créer une org (onboarding)
CREATE POLICY org_insert ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ─── PROJECT_MEMBERS ───

-- SELECT propre membership : un user voit TOUJOURS ses propres enregistrements
-- C'est la policy de bootstrap — AUCUNE récursion possible
CREATE POLICY pm_self_select ON project_members
  FOR SELECT USING (user_id = auth.uid());

-- SELECT membres de ses orgs : un user voit les autres membres de ses orgs
-- Utilise la fonction SECURITY DEFINER pour éviter la récursion
CREATE POLICY pm_org_select ON project_members
  FOR SELECT USING (
    org_id IN (SELECT get_user_org_ids(auth.uid()))
  );

-- INSERT propre membership : un user peut s'ajouter lui-même (ProjectPicker auto-create)
CREATE POLICY pm_self_insert ON project_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- INSERT par admin : un admin peut inviter des membres dans son org
CREATE POLICY pm_admin_insert ON project_members
  FOR INSERT WITH CHECK (
    is_org_admin(auth.uid(), org_id)
  );

-- UPDATE par admin : un admin peut modifier les membres de son org
CREATE POLICY pm_admin_update ON project_members
  FOR UPDATE USING (
    is_org_admin(auth.uid(), org_id)
  );

-- UPDATE propre : un user peut modifier son propre membership (ex: module_access)
CREATE POLICY pm_self_update ON project_members
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- ÉTAPE 4 : CORRIGER les policies des AUTRES tables
-- (remplacer la sous-requête récursive par la fonction)
-- ============================================================

-- ─── PRODUCTS ───
DO $$ BEGIN
  DROP POLICY IF EXISTS products_select ON products;
  DROP POLICY IF EXISTS products_insert ON products;
  DROP POLICY IF EXISTS products_update ON products;
  DROP POLICY IF EXISTS products_delete ON products;

  CREATE POLICY products_select ON products
    FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY products_insert ON products
    FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY products_update ON products
    FOR UPDATE USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY products_delete ON products
    FOR DELETE USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── LOCATIONS ───
DO $$ BEGIN
  DROP POLICY IF EXISTS locations_select ON locations;
  DROP POLICY IF EXISTS locations_insert ON locations;
  DROP POLICY IF EXISTS locations_update ON locations;
  DROP POLICY IF EXISTS locations_delete ON locations;

  CREATE POLICY locations_select ON locations
    FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY locations_insert ON locations
    FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY locations_update ON locations
    FOR UPDATE USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY locations_delete ON locations
    FOR DELETE USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── STOCK ───
DO $$ BEGIN
  DROP POLICY IF EXISTS stock_select ON stock;
  DROP POLICY IF EXISTS stock_insert ON stock;
  DROP POLICY IF EXISTS stock_update ON stock;
  DROP POLICY IF EXISTS stock_delete ON stock;

  CREATE POLICY stock_select ON stock
    FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY stock_insert ON stock
    FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY stock_update ON stock
    FOR UPDATE USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY stock_delete ON stock
    FOR DELETE USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── MOVEMENTS ───
DO $$ BEGIN
  DROP POLICY IF EXISTS movements_select ON movements;
  DROP POLICY IF EXISTS movements_insert ON movements;

  CREATE POLICY movements_select ON movements
    FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY movements_insert ON movements
    FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── EVENTS ───
DO $$ BEGIN
  DROP POLICY IF EXISTS events_select ON events;
  DROP POLICY IF EXISTS events_insert ON events;
  DROP POLICY IF EXISTS events_update ON events;
  DROP POLICY IF EXISTS events_delete ON events;

  CREATE POLICY events_select ON events
    FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY events_insert ON events
    FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY events_update ON events
    FOR UPDATE USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY events_delete ON events
    FOR DELETE USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── FAMILIES ───
DO $$ BEGIN
  DROP POLICY IF EXISTS families_select ON families;
  DROP POLICY IF EXISTS families_insert ON families;

  CREATE POLICY families_select ON families
    FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY families_insert ON families
    FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── SUBFAMILIES ───
DO $$ BEGIN
  DROP POLICY IF EXISTS subfamilies_select ON subfamilies;
  DROP POLICY IF EXISTS subfamilies_insert ON subfamilies;

  CREATE POLICY subfamilies_select ON subfamilies
    FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY subfamilies_insert ON subfamilies
    FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── CHECKLISTS ───
DO $$ BEGIN
  DROP POLICY IF EXISTS checklists_select ON checklists;
  DROP POLICY IF EXISTS checklists_insert ON checklists;
  DROP POLICY IF EXISTS checklists_update ON checklists;
  DROP POLICY IF EXISTS checklists_delete ON checklists;

  CREATE POLICY checklists_select ON checklists
    FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY checklists_insert ON checklists
    FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY checklists_update ON checklists
    FOR UPDATE USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY checklists_delete ON checklists
    FOR DELETE USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── EVENT_PACKING ───
DO $$ BEGIN
  DROP POLICY IF EXISTS ep_select ON event_packing;
  DROP POLICY IF EXISTS ep_insert ON event_packing;
  DROP POLICY IF EXISTS ep_update ON event_packing;
  DROP POLICY IF EXISTS ep_delete ON event_packing;

  CREATE POLICY ep_select ON event_packing
    FOR SELECT USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY ep_insert ON event_packing
    FOR INSERT WITH CHECK (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY ep_update ON event_packing
    FOR UPDATE USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
  CREATE POLICY ep_delete ON event_packing
    FOR DELETE USING (org_id IN (SELECT get_user_org_ids(auth.uid())));
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================================
-- ÉTAPE 5 : VÉRIFICATION COMPLÈTE
-- ============================================================
SELECT 'APRÈS CORRECTION' AS phase;

-- Lister toutes les policies
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Vérifier les fonctions
SELECT proname, prosecdef AS security_definer
FROM pg_proc
WHERE proname IN ('get_user_org_ids', 'is_org_admin');

-- Vérifier les données
SELECT 'organizations' AS t, COUNT(*) FROM organizations
UNION ALL SELECT 'project_members', COUNT(*) FROM project_members;
