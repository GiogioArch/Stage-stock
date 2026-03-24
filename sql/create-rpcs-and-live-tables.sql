-- ============================================================
-- MIGRATION — RPCs atomiques + Tables Live interactives
-- BackStage — Idempotent, un seul fichier
-- ============================================================

-- ═══════════════════════════════════════════════════
-- PARTIE 1 : RPCs
-- ═══════════════════════════════════════════════════

-- ─── 1.1 move_stock ───
-- Incrémente/décrémente atomiquement le stock.
-- Crée la ligne stock si elle n'existe pas (upsert).
CREATE OR REPLACE FUNCTION move_stock(
  p_product_id UUID,
  p_location_id UUID,
  p_delta INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO stock (product_id, location_id, quantity, org_id)
  SELECT p_product_id, p_location_id, GREATEST(0, p_delta),
         (SELECT org_id FROM products WHERE id = p_product_id LIMIT 1)
  ON CONFLICT (product_id, location_id)
  DO UPDATE SET
    quantity = GREATEST(0, stock.quantity + p_delta),
    updated_at = now();
END;
$$;

-- ─── 1.2 delete_product_atomic ───
-- Supprime un produit et toutes ses données liées en une transaction.
CREATE OR REPLACE FUNCTION delete_product_atomic(p_product_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Vérifier que le produit existe et récupérer l'org
  SELECT org_id INTO v_org_id FROM products WHERE id = p_product_id;
  IF v_org_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Produit introuvable');
  END IF;

  -- Vérifier que l'utilisateur a accès à cette org
  IF v_org_id NOT IN (SELECT get_user_org_ids(auth.uid())) THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé');
  END IF;

  -- Supprimer dans l'ordre des dépendances
  DELETE FROM movements WHERE product_id = p_product_id;
  DELETE FROM event_packing WHERE product_id = p_product_id;
  DELETE FROM product_variants WHERE product_id = p_product_id;
  DELETE FROM stock WHERE product_id = p_product_id;
  DELETE FROM products WHERE id = p_product_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ─── 1.3 delete_location_atomic ───
-- Supprime un dépôt et toutes ses données liées.
CREATE OR REPLACE FUNCTION delete_location_atomic(p_location_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM locations WHERE id = p_location_id;
  IF v_org_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Dépôt introuvable');
  END IF;

  IF v_org_id NOT IN (SELECT get_user_org_ids(auth.uid())) THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé');
  END IF;

  -- Supprimer mouvements liés (from_loc ou to_loc)
  DELETE FROM movements WHERE from_loc = p_location_id OR to_loc = p_location_id;
  DELETE FROM stock WHERE location_id = p_location_id;
  DELETE FROM locations WHERE id = p_location_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ─── 1.4 delete_project_atomic ───
-- Supprime un projet (organisation) et TOUTES ses données.
CREATE OR REPLACE FUNCTION delete_project_atomic(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier accès
  IF p_org_id NOT IN (SELECT get_user_org_ids(auth.uid())) THEN
    RETURN json_build_object('success', false, 'error', 'Accès refusé');
  END IF;

  -- Vérifier que l'utilisateur est admin du projet
  IF NOT EXISTS (
    SELECT 1 FROM project_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND is_admin = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Seul un admin peut supprimer le projet');
  END IF;

  -- Supprimer toutes les données org-scoped (ordre des dépendances)
  DELETE FROM movements WHERE org_id = p_org_id;
  DELETE FROM event_packing WHERE org_id = p_org_id;
  DELETE FROM checklists WHERE org_id = p_org_id;
  DELETE FROM stock WHERE org_id = p_org_id;
  DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE org_id = p_org_id);
  DELETE FROM products WHERE org_id = p_org_id;
  DELETE FROM locations WHERE org_id = p_org_id;
  DELETE FROM events WHERE org_id = p_org_id;
  DELETE FROM project_members WHERE org_id = p_org_id;
  DELETE FROM user_profiles WHERE org_id = p_org_id;
  DELETE FROM organizations WHERE id = p_org_id;

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ═══════════════════════════════════════════════════
-- PARTIE 2 : Tables Live interactives
-- ═══════════════════════════════════════════════════

-- ─── 2.1 live_songs — Setlist pour le vote public ───
CREATE TABLE IF NOT EXISTS live_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  duration_sec INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2.2 live_reactions — Réactions emoji en temps réel ───
CREATE TABLE IF NOT EXISTS live_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  fan_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2.3 live_votes — Votes setlist par les fans ───
CREATE TABLE IF NOT EXISTS live_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES live_songs(id) ON DELETE CASCADE,
  fan_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, song_id, fan_id)
);


-- ═══════════════════════════════════════════════════
-- PARTIE 3 : Index
-- ═══════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_live_songs_event ON live_songs(event_id);
CREATE INDEX IF NOT EXISTS idx_live_reactions_event ON live_reactions(event_id);
CREATE INDEX IF NOT EXISTS idx_live_votes_event ON live_votes(event_id);
CREATE INDEX IF NOT EXISTS idx_live_votes_song ON live_votes(song_id);


-- ═══════════════════════════════════════════════════
-- PARTIE 4 : RLS
-- ═══════════════════════════════════════════════════

ALTER TABLE live_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_votes ENABLE ROW LEVEL SECURITY;

-- live_songs : staff peut tout faire, fans lisent
DROP POLICY IF EXISTS live_songs_select ON live_songs;
CREATE POLICY live_songs_select ON live_songs
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS live_songs_manage ON live_songs;
CREATE POLICY live_songs_manage ON live_songs
  FOR ALL TO authenticated USING (
    event_id IN (SELECT id FROM events WHERE org_id IN (SELECT get_user_org_ids(auth.uid())))
  );

-- live_reactions : tout le monde peut insérer et lire
DROP POLICY IF EXISTS live_reactions_insert ON live_reactions;
CREATE POLICY live_reactions_insert ON live_reactions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS live_reactions_select ON live_reactions;
CREATE POLICY live_reactions_select ON live_reactions
  FOR SELECT TO anon, authenticated USING (true);

-- live_votes : tout le monde peut insérer et lire
DROP POLICY IF EXISTS live_votes_insert ON live_votes;
CREATE POLICY live_votes_insert ON live_votes
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS live_votes_select ON live_votes;
CREATE POLICY live_votes_select ON live_votes
  FOR SELECT TO anon, authenticated USING (true);


-- ═══════════════════════════════════════════════════
-- PARTIE 5 : Realtime (publication pour Supabase Realtime)
-- ═══════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'live_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE live_reactions;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'live_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE live_votes;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════
-- VÉRIFICATION
-- ═══════════════════════════════════════════════════

SELECT 'live_songs' AS table_name, COUNT(*) AS row_count FROM live_songs
UNION ALL
SELECT 'live_reactions', COUNT(*) FROM live_reactions
UNION ALL
SELECT 'live_votes', COUNT(*) FROM live_votes
UNION ALL
SELECT 'rpc_move_stock',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'move_stock') THEN 1 ELSE 0 END
UNION ALL
SELECT 'rpc_delete_product_atomic',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_product_atomic') THEN 1 ELSE 0 END
UNION ALL
SELECT 'rpc_delete_location_atomic',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_location_atomic') THEN 1 ELSE 0 END
UNION ALL
SELECT 'rpc_delete_project_atomic',
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_project_atomic') THEN 1 ELSE 0 END;
