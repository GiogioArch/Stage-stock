-- ================================================================
-- PHASE E — Performance DB
-- Date : 2026-04-19
-- Migration UNIQUE, IDEMPOTENTE
--
-- Contenu :
--  1. Wrap auth.uid() et auth.jwt() en (SELECT ...) dans toutes les policies RLS
--     -> Performance x10-100 sur grosses requetes (Supabase recommended)
--  2. Creer 30 indexes sur FK non indexees
--     -> DELETE CASCADE + JOIN plus rapides
--  3. NOT NULL sur tous les org_id (backfill check : 0 NULL actuellement)
--     -> Garde-fou multi-tenant
--  4. Verification finale
-- ================================================================

BEGIN;

-- ================================================================
-- 1. Wrap auth.uid() dans toutes les policies
-- Algorithme : pour chaque policy avec un auth.uid() non-wrappe,
-- DROP + CREATE avec (SELECT auth.uid())
-- ================================================================

DO $$
DECLARE
  pol record;
  new_qual text;
  new_check text;
  roles_str text;
  create_sql text;
BEGIN
  FOR pol IN
    SELECT
      p.schemaname, p.tablename, p.policyname, p.cmd, p.permissive, p.roles,
      p.qual, p.with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND (
        (p.qual ~ 'auth\.uid\(\)' AND p.qual !~ 'SELECT\s+auth\.uid')
        OR (p.with_check ~ 'auth\.uid\(\)' AND p.with_check !~ 'SELECT\s+auth\.uid')
        OR (p.qual ~ 'auth\.jwt\(\)' AND p.qual !~ 'SELECT\s+auth\.jwt')
        OR (p.with_check ~ 'auth\.jwt\(\)' AND p.with_check !~ 'SELECT\s+auth\.jwt')
      )
  LOOP
    -- Remplacer auth.uid() par (SELECT auth.uid()) et auth.jwt() par (SELECT auth.jwt())
    new_qual := regexp_replace(
                  regexp_replace(
                    COALESCE(pol.qual, ''),
                    '(?<!SELECT\s)auth\.uid\(\)',
                    '(SELECT auth.uid())',
                    'g'
                  ),
                  '(?<!SELECT\s)auth\.jwt\(\)',
                  '(SELECT auth.jwt())',
                  'g'
                );
    new_check := regexp_replace(
                   regexp_replace(
                     COALESCE(pol.with_check, ''),
                     '(?<!SELECT\s)auth\.uid\(\)',
                     '(SELECT auth.uid())',
                     'g'
                   ),
                   '(?<!SELECT\s)auth\.jwt\(\)',
                   '(SELECT auth.jwt())',
                   'g'
                 );

    -- Construire la liste des roles
    roles_str := array_to_string(pol.roles, ', ');

    -- Construire le CREATE POLICY
    create_sql := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      pol.policyname,
      pol.schemaname,
      pol.tablename,
      CASE WHEN pol.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
      pol.cmd,
      roles_str
    );

    IF new_qual != '' THEN
      create_sql := create_sql || format(' USING (%s)', new_qual);
    END IF;
    IF new_check != '' THEN
      create_sql := create_sql || format(' WITH CHECK (%s)', new_check);
    END IF;

    -- DROP + CREATE
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    EXECUTE create_sql;

    RAISE NOTICE 'Wrapped policy: %.% (%)', pol.tablename, pol.policyname, pol.cmd;
  END LOOP;
END $$;

-- ================================================================
-- 2. Creer les 30 indexes sur FK non indexees
-- ================================================================

-- movements (table chaude)
CREATE INDEX IF NOT EXISTS idx_movements_product_id ON public.movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_variant_id ON public.movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_movements_from_loc ON public.movements(from_loc);
CREATE INDEX IF NOT EXISTS idx_movements_to_loc ON public.movements(to_loc);

-- stock
CREATE INDEX IF NOT EXISTS idx_stock_product_id ON public.stock(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_location_id ON public.stock(location_id);

-- ventes
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);

-- achats
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_product_id ON public.purchase_order_lines(product_id);

-- events liens
CREATE INDEX IF NOT EXISTS idx_event_packing_product_id ON public.event_packing(product_id);
CREATE INDEX IF NOT EXISTS idx_checklists_event_id ON public.checklists(event_id);
CREATE INDEX IF NOT EXISTS idx_expenses_event_id ON public.expenses(event_id);

-- transport
CREATE INDEX IF NOT EXISTS idx_transport_bookings_need_id ON public.transport_bookings(need_id);
CREATE INDEX IF NOT EXISTS idx_transport_bookings_provider_id ON public.transport_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_transport_bookings_route_id ON public.transport_bookings(route_id);
CREATE INDEX IF NOT EXISTS idx_transport_bookings_vehicle_id ON public.transport_bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_transport_costs_booking_id ON public.transport_costs(booking_id);
CREATE INDEX IF NOT EXISTS idx_transport_costs_event_id ON public.transport_costs(event_id);
CREATE INDEX IF NOT EXISTS idx_transport_manifests_booking_id ON public.transport_manifests(booking_id);
CREATE INDEX IF NOT EXISTS idx_transport_manifests_product_id ON public.transport_manifests(product_id);
CREATE INDEX IF NOT EXISTS idx_transport_needs_event_id ON public.transport_needs(event_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_provider_id ON public.vehicles(provider_id);

-- live
CREATE INDEX IF NOT EXISTS idx_live_order_items_order_id ON public.live_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_live_order_items_product_id ON public.live_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_current_song_id ON public.live_sessions(current_song_id);

-- users + projects
CREATE INDEX IF NOT EXISTS idx_project_invitations_invited_by ON public.project_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_project_members_role_id ON public.project_members(role_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_id ON public.user_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_reports_closed_by ON public.cash_reports(closed_by);

-- ================================================================
-- 3. NOT NULL sur org_id (backfill verifie : 0 NULL actuellement)
-- ================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'audit_logs','checklists','event_packing','events','expenses','families',
    'feedback','locations','movements','products','project_invitations','projects',
    'purchase_order_lines','purchase_orders','roles','sale_items','sales','stock',
    'subfamilies','suppliers','transport_bookings','transport_costs',
    'transport_manifests','transport_needs','transport_providers','transport_routes',
    'user_profiles','vehicles'
  ] LOOP
    -- Double check zero NULL avant ALTER
    EXECUTE format('SELECT count(*) FROM public.%I WHERE org_id IS NULL', t) INTO STRICT t;
    IF t = '0' THEN
      -- Safe ok but the var t is now the count, not the table. Let me rewrite.
      NULL;
    END IF;
  END LOOP;
END $$;

-- Simpler : un ALTER par table (idempotent via information_schema check)
DO $$
DECLARE
  tbl text;
  null_count integer;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'audit_logs','checklists','event_packing','events','expenses','families',
    'feedback','locations','movements','products','project_invitations','projects',
    'purchase_order_lines','purchase_orders','roles','sale_items','sales','stock',
    'subfamilies','suppliers','transport_bookings','transport_costs',
    'transport_manifests','transport_needs','transport_providers','transport_routes',
    'user_profiles','vehicles'
  ] LOOP
    -- Verifier que la colonne existe et est nullable
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl
        AND column_name = 'org_id' AND is_nullable = 'YES'
    ) THEN
      -- Safety check : 0 NULL avant ALTER
      EXECUTE format('SELECT count(*)::int FROM public.%I WHERE org_id IS NULL', tbl) INTO null_count;
      IF null_count = 0 THEN
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET NOT NULL', tbl);
        RAISE NOTICE 'SET NOT NULL on %.org_id', tbl;
      ELSE
        RAISE WARNING 'SKIP %.org_id : % NULL rows present', tbl, null_count;
      END IF;
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ================================================================
-- 4. VERIFICATION FINALE
-- ================================================================

-- Policies non-wrapped restantes (devrait etre 0)
SELECT 'Policies avec auth.uid() non-wrap :' as check_label,
       count(*) as remaining
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    (qual ~ 'auth\.uid\(\)' AND qual !~ 'SELECT\s+auth\.uid')
    OR (with_check ~ 'auth\.uid\(\)' AND with_check !~ 'SELECT\s+auth\.uid')
  );

-- FK sans index restantes
WITH fk_cols AS (
  SELECT tc.table_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
),
indexed_cols AS (
  SELECT tablename, regexp_replace(indexdef, '.*\((\w+)[,)]?.*', '\1') as first_col
  FROM pg_indexes WHERE schemaname = 'public'
)
SELECT 'FK sans index restantes :' as check_label, count(*) as remaining
FROM fk_cols fk
LEFT JOIN indexed_cols ic ON ic.tablename = fk.table_name AND ic.first_col = fk.column_name
WHERE ic.first_col IS NULL;

-- org_id nullable restants
SELECT 'Tables avec org_id nullable :' as check_label, count(*) as remaining
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'org_id' AND is_nullable = 'YES';
