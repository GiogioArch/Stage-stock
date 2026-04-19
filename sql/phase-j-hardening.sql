-- ================================================================
-- PHASE J — Durcissement DB + conformite comptable FR
-- Date : 2026-04-19 (trace, deja appliquee en prod)
--
-- Contenu :
--  1. Cleanup : 2 indexes dupliques + 2 RPCs dead code
--  2. numeric(12,2) sur 22 colonnes monetaires (conformite FR)
--  3. 11 CHECK constraints >= 0 sur prix/montants
--  4. CHECK enum events.statut + events.territoire
--  5. FK project_members.project_id CASCADE
--  6. Trigger sync_product_prices etendu a INSERT
--  7. Reconciliation 4 prix desynchronises
--  8. Durcissement search_path = public, pg_temp sur 19 RPCs
-- ================================================================

-- 1. Cleanup
DROP INDEX IF EXISTS public.idx_projects_invite_code;
DROP INDEX IF EXISTS public.idx_user_details_user_id;
DROP FUNCTION IF EXISTS public.update_stock_atomic(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.debug_my_access();

-- 2. numeric(12,2) sur colonnes monetaires
ALTER TABLE public.sales ALTER COLUMN total_amount TYPE numeric(12,2);
ALTER TABLE public.sale_items ALTER COLUMN unit_price TYPE numeric(12,2);
ALTER TABLE public.sale_items ALTER COLUMN line_total TYPE numeric(12,2);
ALTER TABLE public.purchase_orders ALTER COLUMN total_ht TYPE numeric(12,2);
ALTER TABLE public.purchase_orders ALTER COLUMN total_ttc TYPE numeric(12,2);
ALTER TABLE public.purchase_orders ALTER COLUMN tva_rate TYPE numeric(5,2);
ALTER TABLE public.purchase_order_lines ALTER COLUMN unit_price_ht TYPE numeric(12,2);
ALTER TABLE public.purchase_order_lines ALTER COLUMN line_total_ht TYPE numeric(12,2);
ALTER TABLE public.expenses ALTER COLUMN amount TYPE numeric(12,2);
ALTER TABLE public.user_income ALTER COLUMN amount TYPE numeric(12,2);
ALTER TABLE public.live_orders ALTER COLUMN total TYPE numeric(12,2);
ALTER TABLE public.live_order_items ALTER COLUMN unit_price TYPE numeric(12,2);
ALTER TABLE public.products ALTER COLUMN sale_price TYPE numeric(12,2);
ALTER TABLE public.products ALTER COLUMN sell_price_ttc TYPE numeric(12,2);
ALTER TABLE public.events ALTER COLUMN ca_prevu TYPE numeric(12,2);
ALTER TABLE public.events ALTER COLUMN ca_reel TYPE numeric(12,2);
ALTER TABLE public.events ALTER COLUMN budget TYPE numeric(12,2);
ALTER TABLE public.events ALTER COLUMN ticket_revenue TYPE numeric(12,2);
ALTER TABLE public.events ALTER COLUMN sponsor_revenue TYPE numeric(12,2);
ALTER TABLE public.transport_bookings ALTER COLUMN cost TYPE numeric(12,2);
ALTER TABLE public.transport_costs ALTER COLUMN amount TYPE numeric(12,2);
ALTER TABLE public.transport_routes ALTER COLUMN default_cost TYPE numeric(12,2);

-- 3. CHECK >= 0 sur montants
ALTER TABLE public.expenses ADD CONSTRAINT expenses_amount_non_negative CHECK (amount IS NULL OR amount >= 0);
ALTER TABLE public.sale_items ADD CONSTRAINT sale_items_unit_price_non_negative CHECK (unit_price IS NULL OR unit_price >= 0);
ALTER TABLE public.sale_items ADD CONSTRAINT sale_items_line_total_non_negative CHECK (line_total IS NULL OR line_total >= 0);
ALTER TABLE public.sale_items ADD CONSTRAINT sale_items_quantity_positive CHECK (quantity IS NULL OR quantity > 0);
ALTER TABLE public.purchase_order_lines ADD CONSTRAINT pol_unit_price_non_negative CHECK (unit_price_ht IS NULL OR unit_price_ht >= 0);
ALTER TABLE public.purchase_order_lines ADD CONSTRAINT pol_line_total_non_negative CHECK (line_total_ht IS NULL OR line_total_ht >= 0);
ALTER TABLE public.purchase_orders ADD CONSTRAINT po_total_ht_non_negative CHECK (total_ht IS NULL OR total_ht >= 0);
ALTER TABLE public.products ADD CONSTRAINT products_cost_ht_non_negative CHECK (cost_ht IS NULL OR cost_ht >= 0);
ALTER TABLE public.products ADD CONSTRAINT products_sell_price_non_negative CHECK (sell_price_ttc IS NULL OR sell_price_ttc >= 0);
ALTER TABLE public.user_income ADD CONSTRAINT user_income_amount_non_negative CHECK (amount IS NULL OR amount >= 0);

-- 4. CHECK enum events
ALTER TABLE public.events ADD CONSTRAINT events_statut_check
  CHECK (statut IS NULL OR statut IN ('Brouillon', 'Pas commencé', 'Confirmé', 'Salle réservé', 'En cours', 'Terminé', 'Annulé'));

ALTER TABLE public.events ADD CONSTRAINT events_territoire_check
  CHECK (territoire IS NULL OR territoire IN ('Martinique', 'Guadeloupe', 'Guyane', 'Reunion', 'France', 'International'));

-- 5. FK CASCADE
ALTER TABLE public.project_members DROP CONSTRAINT project_members_project_id_fkey;
ALTER TABLE public.project_members ADD CONSTRAINT project_members_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

-- 6. Trigger sync_product_prices etendu INSERT
CREATE OR REPLACE FUNCTION public.sync_product_prices()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.sell_price_ttc IS NOT NULL AND NEW.sale_price IS NULL THEN
      NEW.sale_price := NEW.sell_price_ttc;
    ELSIF NEW.sale_price IS NOT NULL AND NEW.sell_price_ttc IS NULL THEN
      NEW.sell_price_ttc := NEW.sale_price;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.sell_price_ttc IS DISTINCT FROM OLD.sell_price_ttc THEN
      NEW.sale_price := NEW.sell_price_ttc;
    ELSIF NEW.sale_price IS DISTINCT FROM OLD.sale_price THEN
      NEW.sell_price_ttc := NEW.sale_price;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_product_prices ON public.products;
CREATE TRIGGER trg_sync_product_prices
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_prices();

-- 7. Reconciliation des 4 produits desynchronises
UPDATE public.products SET sale_price = sell_price_ttc
WHERE sell_price_ttc IS NOT NULL AND sale_price IS NOT NULL AND sale_price != sell_price_ttc;

-- 8. Durcir search_path de toutes les RPCs SECURITY DEFINER
ALTER FUNCTION public.accept_invitation(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.bulk_update_product_status(uuid, text[], text) SET search_path = public, pg_temp;
ALTER FUNCTION public.change_member_role(uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.complete_profile(text, text, text, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.create_project(text, text, text[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_project(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.delete_project_atomic(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_my_email() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_my_org_ids() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_my_profile() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_my_projects() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_project_members(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_user_org_ids(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_org_admin(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.join_project(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.move_stock(uuid, uuid, uuid, integer, text, uuid, uuid, text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.process_sale(uuid, uuid, text, text, numeric, integer, uuid, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.regenerate_invite_code(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.remove_member(uuid, uuid) SET search_path = public, pg_temp;
