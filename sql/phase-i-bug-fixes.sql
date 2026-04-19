-- ================================================================
-- PHASE I — Fixes critiques identifies apres audit v11
-- Date : 2026-04-19
--
-- Contenu :
--  1. Recreation RPC undo_movement (colonnes DB erronees corrigees)
--  2. Rattachement des 17 produits au projet EK TOUR + sous-familles
--  3. Creation event 11/04 Jardin de Wael
--  4. Ajout T-shirt Solda Lanmou + 3 variantes couleur T-shirt EK25
--     + taille S manquante
-- ================================================================

-- 1. Fix RPC undo_movement : avant v_mov.location_id/to_location/from_location
-- (colonnes inexistantes) ; apres v_mov.from_loc, v_mov.to_loc (reelles)
CREATE OR REPLACE FUNCTION public.undo_movement(p_movement_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_mov RECORD;
  v_result JSON;
BEGIN
  SELECT * INTO v_mov FROM movements WHERE id = p_movement_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Mouvement introuvable');
  END IF;

  IF v_mov.note LIKE '%[ANNULÉ]%' OR v_mov.note LIKE '%[Annulé]%' OR v_mov.note LIKE '%[Annule]%' THEN
    RETURN json_build_object('success', false, 'error', 'Mouvement deja annule');
  END IF;

  IF v_mov.type = 'in' THEN
    v_result := move_stock(
      v_mov.product_id, v_mov.to_loc, v_mov.variant_id, v_mov.quantity,
      'out', v_mov.to_loc, NULL,
      '↩️ Annulation entree (mouvement ' || p_movement_id || ')', auth.uid()
    );
  ELSIF v_mov.type = 'out' THEN
    v_result := move_stock(
      v_mov.product_id, v_mov.from_loc, v_mov.variant_id, v_mov.quantity,
      'in', NULL, v_mov.from_loc,
      '↩️ Annulation sortie (mouvement ' || p_movement_id || ')', auth.uid()
    );
  ELSIF v_mov.type = 'transfer' THEN
    v_result := move_stock(
      v_mov.product_id, NULL, v_mov.variant_id, v_mov.quantity,
      'transfer', v_mov.to_loc, v_mov.from_loc,
      '↩️ Annulation transfert (mouvement ' || p_movement_id || ')', auth.uid()
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'Type inconnu: ' || v_mov.type);
  END IF;

  IF v_result IS NULL OR (v_result->>'success')::boolean IS FALSE THEN
    RETURN COALESCE(v_result, json_build_object('success', false, 'error', 'Echec move_stock'));
  END IF;

  UPDATE movements SET note = COALESCE(note, '') || ' [ANNULÉ]' WHERE id = p_movement_id;

  RETURN json_build_object(
    'success', true, 'original_movement_id', p_movement_id,
    'reverse_movement', v_result, 'message', 'Mouvement annule'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.undo_movement(uuid) TO authenticated;

-- 2. Rattachement des 17 produits au projet EK TOUR + sous-familles
DO $$
DECLARE
  v_project_id uuid := '718ba138-5249-4106-8d74-a7083cc30202';
  v_textiles uuid := '0f82b231-d201-4813-a6f1-213d6c30440b';
  v_goodies uuid := '746f8abf-f769-44c8-885a-057863c6f786';
  v_media uuid := '5badfa3a-bb96-40d5-b650-e219e7e9c01a';
  v_sacs uuid := 'a0b4ff26-f7dd-4724-855f-e7442bd08bba';
  v_affiches uuid := 'cbd466d4-6418-481f-b91a-2154cfad7006';
BEGIN
  UPDATE products SET project_id = v_project_id, subfamily_id = v_media
  WHERE sku IN ('EK-CD-EKTRIP', 'EK-DVD-OLYMPIA', 'EK-LIV-COL', 'EK-LIV-JARDIN', 'EK-LIV-POMKANEL');

  UPDATE products SET project_id = v_project_id, subfamily_id = v_affiches
  WHERE sku = 'EK-POSTER';

  UPDATE products SET project_id = v_project_id, subfamily_id = v_sacs
  WHERE sku = 'EK-TOTE-SL';

  UPDATE products SET project_id = v_project_id, subfamily_id = v_goodies
  WHERE sku IN ('EK-PCL-BOIS', 'EK-STICKERS');

  UPDATE products SET project_id = v_project_id, subfamily_id = v_textiles
  WHERE sku IN (
    'EK-POF', 'EK-POH', 'EK-TS-COLV', 'EK-TS-EK25-NOI',
    'EK-TS-EK25F-PAIL', 'EK-TS-UNIQ', 'EK-TSE-NOI-4', 'EK-TSE-NOI-6'
  );
END $$;

-- 3. Event Jardin de Wael (11/04/2026 Guadeloupe, concert Terminé)
INSERT INTO events (org_id, name, date, lieu, ville, territoire, format, capacite, statut, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '🎤 Jardin de Wael — Guadeloupe',
  '2026-04-11', 'Jardin de Wael', 'Guadeloupe', 'Guadeloupe',
  'Concert live', 150, 'Terminé', now()
) ON CONFLICT DO NOTHING;

-- 4. Nouveaux produits identifies sur photos 11/04
--    a) T-shirt Solda Lanmou col rond (distinct du polo, 20€)
INSERT INTO products (org_id, project_id, name, sku, category, family_id, subfamily_id,
                      unit, min_stock, cost_ht, sell_price_ttc, active, product_status, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '718ba138-5249-4106-8d74-a7083cc30202',
  'T-shirt Solda Lanmou (col rond)', 'EK-TS-SOLDA',
  'merch', '69849c95-54d5-45d1-ad03-e4674d855864', '0f82b231-d201-4813-a6f1-213d6c30440b',
  'unite', 10, 5.00, 20.00, true, 'active', now()
) ON CONFLICT (sku) DO NOTHING;

--    b) 3 variantes couleur T-shirt EK25 (Blanc, Kaki, Bleu marine)
INSERT INTO products (org_id, project_id, name, sku, category, family_id, subfamily_id,
                      unit, min_stock, cost_ht, sell_price_ttc, active, product_status)
VALUES
  ('00000000-0000-0000-0000-000000000001', '718ba138-5249-4106-8d74-a7083cc30202',
   'T-shirt EK 25 Célébration Blanc', 'EK-TS-EK25-BLA',
   'merch', '69849c95-54d5-45d1-ad03-e4674d855864', '0f82b231-d201-4813-a6f1-213d6c30440b',
   'unite', 10, 5.00, 25.00, true, 'active'),
  ('00000000-0000-0000-0000-000000000001', '718ba138-5249-4106-8d74-a7083cc30202',
   'T-shirt EK 25 Célébration Kaki', 'EK-TS-EK25-KAK',
   'merch', '69849c95-54d5-45d1-ad03-e4674d855864', '0f82b231-d201-4813-a6f1-213d6c30440b',
   'unite', 10, 5.00, 25.00, true, 'active'),
  ('00000000-0000-0000-0000-000000000001', '718ba138-5249-4106-8d74-a7083cc30202',
   'T-shirt EK 25 Célébration Bleu marine', 'EK-TS-EK25-BLM',
   'merch', '69849c95-54d5-45d1-ad03-e4674d855864', '0f82b231-d201-4813-a6f1-213d6c30440b',
   'unite', 10, 5.00, 25.00, true, 'active')
ON CONFLICT (sku) DO NOTHING;

--    c) Taille S manquante sur T-shirt EK25 Noir
DO $$
DECLARE v_ek25_id uuid;
BEGIN
  SELECT id INTO v_ek25_id FROM products WHERE sku = 'EK-TS-EK25-NOI';
  IF v_ek25_id IS NOT NULL THEN
    INSERT INTO product_variants (product_id, name, sku_suffix, sort_order)
    VALUES (v_ek25_id, 'Taille S', 'S', 1)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Verification finale
SELECT
  (SELECT count(*) FROM products WHERE project_id = '718ba138-5249-4106-8d74-a7083cc30202') as produits_tour,
  (SELECT count(*) FROM products WHERE project_id IS NULL) as orphelins,
  (SELECT count(*) FROM events WHERE date = '2026-04-11') as events_wael,
  (SELECT count(*) FROM product_variants) as total_variants;
