-- ================================================================
-- PHASE C — Coherence schema + cleanup
-- Date : 2026-04-18
-- Migration UNIQUE, IDEMPOTENTE
--
-- Contenu :
--  1. Policies destructives scopees admin (products, locations, events, suppliers, PO, PO_lines)
--  2. Sync sale_price <-> sell_price_ttc (trigger bidirectionnel)
--  3. Nettoyer sale_items orphelins (product_id IS NULL, demo data)
--  4. DROP duplicate indexes (purchase_orders, stock)
--  5. DROP 12 tables dead (partners*, event_tasks*, cash_reports, purchase_receipts, data_integrity_check)
--  6. Verification finale
-- ================================================================

BEGIN;

-- ================================================================
-- 1. Policies DELETE scopees admin uniquement
-- Avant : tout membre de l'org pouvait DELETE
-- Apres : seuls les admins peuvent DELETE
-- ================================================================

DROP POLICY IF EXISTS products_delete ON public.products;
CREATE POLICY products_delete ON public.products FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid()))
         AND is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS locations_delete ON public.locations;
CREATE POLICY locations_delete ON public.locations FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid()))
         AND is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS events_delete ON public.events;
CREATE POLICY events_delete ON public.events FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid()))
         AND is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS suppliers_delete ON public.suppliers;
CREATE POLICY suppliers_delete ON public.suppliers FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid()))
         AND is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS purchase_orders_delete ON public.purchase_orders;
CREATE POLICY purchase_orders_delete ON public.purchase_orders FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid()))
         AND is_org_admin(auth.uid(), org_id));

DROP POLICY IF EXISTS purchase_order_lines_delete ON public.purchase_order_lines;
CREATE POLICY purchase_order_lines_delete ON public.purchase_order_lines FOR DELETE
  USING (org_id IN (SELECT get_user_org_ids(auth.uid()))
         AND is_org_admin(auth.uid(), org_id));

-- ================================================================
-- 2. Sync sale_price <-> sell_price_ttc (trigger bidirectionnel)
-- Le frontend ecrit sell_price_ttc, mais ConcertMode/DepotDetail/EventDetail
-- lisent sale_price. On garde les 2 synchros pour retrocompat.
-- ================================================================

CREATE OR REPLACE FUNCTION public.sync_product_prices()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Si sell_price_ttc change -> copier dans sale_price
  IF NEW.sell_price_ttc IS DISTINCT FROM OLD.sell_price_ttc THEN
    NEW.sale_price := NEW.sell_price_ttc;
  -- Sinon si sale_price change -> copier dans sell_price_ttc
  ELSIF NEW.sale_price IS DISTINCT FROM OLD.sale_price THEN
    NEW.sell_price_ttc := NEW.sale_price;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_prices ON public.products;
CREATE TRIGGER trg_sync_product_prices
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_prices();

-- Sync les lignes existantes : si sell_price_ttc renseigne mais sale_price vide, copier
UPDATE public.products
SET sale_price = sell_price_ttc
WHERE sell_price_ttc IS NOT NULL
  AND sell_price_ttc > 0
  AND (sale_price IS NULL OR sale_price = 0);

-- Inverse : si sale_price renseigne mais sell_price_ttc vide, copier
UPDATE public.products
SET sell_price_ttc = sale_price
WHERE sale_price IS NOT NULL
  AND sale_price > 0
  AND (sell_price_ttc IS NULL OR sell_price_ttc = 0);

-- ================================================================
-- 3. Nettoyer sale_items orphelins
-- 12 rows de demo avec product_id NULL, CA simule ~310 EUR non-tracable
-- ================================================================

DELETE FROM public.sale_items WHERE product_id IS NULL;

-- Purger aussi les sales orphelines (sans aucun line)
DELETE FROM public.sales s
WHERE NOT EXISTS (SELECT 1 FROM public.sale_items si WHERE si.sale_id = s.id);

-- ================================================================
-- 4. DROP duplicate indexes
-- ================================================================

-- purchase_orders : idx_purchase_orders_org et idx_purchase_orders_org_id dupliques
DROP INDEX IF EXISTS public.idx_purchase_orders_org_id;

-- stock : stock_product_location_unique bloque les variantes
-- (remplace par stock_product_location_variant_idx qui gere les variantes)
DROP INDEX IF EXISTS public.stock_product_location_unique;

-- ================================================================
-- 5. DROP tables dead (toutes verifiees vides)
-- ================================================================

-- Module Partenaires jamais branche (7 tables)
DROP TABLE IF EXISTS public.partnership_deliverables CASCADE;
DROP TABLE IF EXISTS public.partnership_agreements CASCADE;
DROP TABLE IF EXISTS public.partner_interactions CASCADE;
DROP TABLE IF EXISTS public.partner_events CASCADE;
DROP TABLE IF EXISTS public.partner_documents CASCADE;
DROP TABLE IF EXISTS public.partner_contacts CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;

-- Event tasks jamais utilises
DROP TABLE IF EXISTS public.event_tasks CASCADE;
DROP TABLE IF EXISTS public.event_task_templates CASCADE;

-- Cash reports : declare dans registry mais UI inexistante
DROP TABLE IF EXISTS public.cash_reports CASCADE;

-- Purchase receipts : Achats.jsx n'insere jamais dedans
DROP TABLE IF EXISTS public.purchase_receipts CASCADE;

-- Vue utilitaire non utilisee par le frontend
DROP VIEW IF EXISTS public.data_integrity_check CASCADE;

COMMIT;

-- ================================================================
-- 6. VERIFICATION FINALE
-- ================================================================

-- Tables restantes (devraient etre ~42 au lieu de 54)
SELECT 'Tables publiques restantes :' as check_label, count(*) as nb
FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE';

-- Pas d'orphelins sale_items
SELECT 'Sale_items orphelins :' as check_label,
       count(*) as nb
FROM sale_items WHERE product_id IS NULL;

-- Policies DELETE admin-scoped
SELECT 'Policies DELETE sans check is_admin :' as check_label,
       count(*) as nb
FROM pg_policies
WHERE schemaname='public' AND cmd='DELETE'
  AND tablename IN ('products', 'locations', 'events', 'suppliers', 'purchase_orders', 'purchase_order_lines')
  AND qual NOT LIKE '%is_org_admin%';

-- Index dupliques plus la
SELECT 'Index idx_purchase_orders_org_id supprime :' as check_label,
       NOT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_purchase_orders_org_id') as ok;

SELECT 'Index stock_product_location_unique supprime :' as check_label,
       NOT EXISTS(SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='stock_product_location_unique') as ok;

-- Trigger sync prix
SELECT 'Trigger sync_product_prices actif :' as check_label,
       EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_sync_product_prices' AND NOT tgisinternal) as ok;
