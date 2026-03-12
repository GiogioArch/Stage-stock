-- ============================================================
-- ROLES & AUTO-PACKING LIST — Idempotent SQL Script
-- Stage Stock v8.0 — EK TOUR 25 ANS
-- ============================================================

-- ─── 1. ROLES TABLE ───
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  subfamily_ids UUID[] DEFAULT '{}',
  dependency_codes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- RLS: anyone authenticated can SELECT
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'roles' AND policyname = 'roles_select_all'
  ) THEN
    CREATE POLICY roles_select_all ON roles FOR SELECT USING (true);
  END IF;
END $$;

-- ─── 2. EVENT_PACKING TABLE ───
CREATE TABLE IF NOT EXISTS event_packing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  role_code TEXT,
  quantity_needed INTEGER DEFAULT 0,
  quantity_packed INTEGER DEFAULT 0,
  packed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, product_id)
);

ALTER TABLE event_packing ENABLE ROW LEVEL SECURITY;

-- RLS: full CRUD for authenticated users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_packing' AND policyname = 'event_packing_select'
  ) THEN
    CREATE POLICY event_packing_select ON event_packing FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_packing' AND policyname = 'event_packing_insert'
  ) THEN
    CREATE POLICY event_packing_insert ON event_packing FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_packing' AND policyname = 'event_packing_update'
  ) THEN
    CREATE POLICY event_packing_update ON event_packing FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'event_packing' AND policyname = 'event_packing_delete'
  ) THEN
    CREATE POLICY event_packing_delete ON event_packing FOR DELETE USING (true);
  END IF;
END $$;

-- ─── 3. ADD role_id TO user_profiles ───
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN role_id UUID REFERENCES roles(id);
  END IF;
END $$;

-- ─── 4. SEED 12 ROLES ───
-- Subfamily UUIDs:
-- MERCH: Textiles=0f82b231..., Affiches=cbd466d4..., Media=5badfa3a..., Accessoires=4943007f..., Goodies=746f8abf..., Sacs=a0b4ff26...
-- MAT:   Son=491d6275..., Instruments=67301e84..., Lumiere=e4073195..., Tech & Regie=a0bc3290..., Scene & Decor=51848958...
-- CONSO: Cablage=0a0dc0e8..., Energie=91e24645..., Adhesifs=4f909739..., Cordes instruments=e384989a..., Bureau=e32cb931..., Entretien=0cbd2741...

INSERT INTO roles (name, code, description, subfamily_ids, dependency_codes) VALUES
(
  'Tour Manager', 'TM', 'Responsable global de la tournée — accès à toutes les sous-familles',
  ARRAY[
    '0f82b231-d201-4813-a6f1-213d6c30440b','cbd466d4-6418-481f-b91a-2154cfad7006','5badfa3a-bb96-40d5-b650-e219e7e9c01a','4943007f-771c-4bd1-b455-e97f164ebf7f','746f8abf-f769-44c8-885a-057863c6f786','a0b4ff26-f7dd-4724-855f-e7442bd08bba',
    '491d6275-c3b3-4aaa-907f-5b4c2be5fd87','67301e84-6197-4ae9-9c9e-ba67192606cb','e4073195-adbd-4264-9218-bd0467a2275a','a0bc3290-a002-49da-90c8-4c4f8deaca64','51848958-6410-46b2-8600-db8aab50dc2b',
    '0a0dc0e8-9b02-4c33-85f1-6f2ff8800c33','91e24645-0d44-4c73-8772-ed16a278c9e4','4f909739-4899-4e6a-accc-be3b11d447b7','e384989a-89d9-43a0-915a-7d7414617109','e32cb931-795e-4207-ac6d-5da8d34b7ba0','0cbd2741-534d-4ea7-8b24-792dc6a7e5d2'
  ]::UUID[],
  '{}'::TEXT[]
),
(
  'Chef de Production', 'PM', 'Responsable de la production — accès à toutes les sous-familles',
  ARRAY[
    '0f82b231-d201-4813-a6f1-213d6c30440b','cbd466d4-6418-481f-b91a-2154cfad7006','5badfa3a-bb96-40d5-b650-e219e7e9c01a','4943007f-771c-4bd1-b455-e97f164ebf7f','746f8abf-f769-44c8-885a-057863c6f786','a0b4ff26-f7dd-4724-855f-e7442bd08bba',
    '491d6275-c3b3-4aaa-907f-5b4c2be5fd87','67301e84-6197-4ae9-9c9e-ba67192606cb','e4073195-adbd-4264-9218-bd0467a2275a','a0bc3290-a002-49da-90c8-4c4f8deaca64','51848958-6410-46b2-8600-db8aab50dc2b',
    '0a0dc0e8-9b02-4c33-85f1-6f2ff8800c33','91e24645-0d44-4c73-8772-ed16a278c9e4','4f909739-4899-4e6a-accc-be3b11d447b7','e384989a-89d9-43a0-915a-7d7414617109','e32cb931-795e-4207-ac6d-5da8d34b7ba0','0cbd2741-534d-4ea7-8b24-792dc6a7e5d2'
  ]::UUID[],
  ARRAY['TM']::TEXT[]
),
(
  'Ingé Son', 'SE', 'Ingénieur son — Son, Câblage, Énergie',
  ARRAY['491d6275-c3b3-4aaa-907f-5b4c2be5fd87','0a0dc0e8-9b02-4c33-85f1-6f2ff8800c33','91e24645-0d44-4c73-8772-ed16a278c9e4']::UUID[],
  ARRAY['TM','BL']::TEXT[]
),
(
  'Régisseur Lumière', 'LD', 'Régisseur lumière — Lumière, Câblage, Énergie',
  ARRAY['e4073195-adbd-4264-9218-bd0467a2275a','0a0dc0e8-9b02-4c33-85f1-6f2ff8800c33','91e24645-0d44-4c73-8772-ed16a278c9e4']::UUID[],
  ARRAY['TM','SM']::TEXT[]
),
(
  'Backline / Instruments', 'BL', 'Backline — Instruments, Cordes instruments, Accessoires',
  ARRAY['67301e84-6197-4ae9-9c9e-ba67192606cb','e384989a-89d9-43a0-915a-7d7414617109','4943007f-771c-4bd1-b455-e97f164ebf7f']::UUID[],
  ARRAY['SE']::TEXT[]
),
(
  'Régisseur Scène', 'SM', 'Régisseur scène — Scène & Décor, Adhésifs',
  ARRAY['51848958-6410-46b2-8600-db8aab50dc2b','4f909739-4899-4e6a-accc-be3b11d447b7']::UUID[],
  ARRAY['TM','LD']::TEXT[]
),
(
  'Directeur Technique', 'TD', 'Directeur technique — Tech & Régie, Énergie, Câblage',
  ARRAY['a0bc3290-a002-49da-90c8-4c4f8deaca64','91e24645-0d44-4c73-8772-ed16a278c9e4','0a0dc0e8-9b02-4c33-85f1-6f2ff8800c33']::UUID[],
  ARRAY['SE','LD']::TEXT[]
),
(
  'Merch Manager', 'MM', 'Manager merchandising — Textiles, Affiches, Media, Accessoires, Goodies, Sacs',
  ARRAY['0f82b231-d201-4813-a6f1-213d6c30440b','cbd466d4-6418-481f-b91a-2154cfad7006','5badfa3a-bb96-40d5-b650-e219e7e9c01a','4943007f-771c-4bd1-b455-e97f164ebf7f','746f8abf-f769-44c8-885a-057863c6f786','a0b4ff26-f7dd-4724-855f-e7442bd08bba']::UUID[],
  ARRAY['TM']::TEXT[]
),
(
  'Logistique / Transport', 'LOG', 'Logistique — accès transport scope (toutes sous-familles)',
  ARRAY[
    '0f82b231-d201-4813-a6f1-213d6c30440b','cbd466d4-6418-481f-b91a-2154cfad7006','5badfa3a-bb96-40d5-b650-e219e7e9c01a','4943007f-771c-4bd1-b455-e97f164ebf7f','746f8abf-f769-44c8-885a-057863c6f786','a0b4ff26-f7dd-4724-855f-e7442bd08bba',
    '491d6275-c3b3-4aaa-907f-5b4c2be5fd87','67301e84-6197-4ae9-9c9e-ba67192606cb','e4073195-adbd-4264-9218-bd0467a2275a','a0bc3290-a002-49da-90c8-4c4f8deaca64','51848958-6410-46b2-8600-db8aab50dc2b',
    '0a0dc0e8-9b02-4c33-85f1-6f2ff8800c33','91e24645-0d44-4c73-8772-ed16a278c9e4','4f909739-4899-4e6a-accc-be3b11d447b7','e384989a-89d9-43a0-915a-7d7414617109','e32cb931-795e-4207-ac6d-5da8d34b7ba0','0cbd2741-534d-4ea7-8b24-792dc6a7e5d2'
  ]::UUID[],
  ARRAY['TM','PM']::TEXT[]
),
(
  'Sécurité', 'SAFE', 'Responsable sécurité — Énergie, Entretien',
  ARRAY['91e24645-0d44-4c73-8772-ed16a278c9e4','0cbd2741-534d-4ea7-8b24-792dc6a7e5d2']::UUID[],
  ARRAY['PM']::TEXT[]
),
(
  'Assistant Artiste', 'AA', 'Assistant artiste — Textiles, Accessoires, Instruments',
  ARRAY['0f82b231-d201-4813-a6f1-213d6c30440b','4943007f-771c-4bd1-b455-e97f164ebf7f','67301e84-6197-4ae9-9c9e-ba67192606cb']::UUID[],
  ARRAY['TM']::TEXT[]
),
(
  'Assistant Production', 'PA', 'Assistant production — support scope (toutes sous-familles)',
  ARRAY[
    '0f82b231-d201-4813-a6f1-213d6c30440b','cbd466d4-6418-481f-b91a-2154cfad7006','5badfa3a-bb96-40d5-b650-e219e7e9c01a','4943007f-771c-4bd1-b455-e97f164ebf7f','746f8abf-f769-44c8-885a-057863c6f786','a0b4ff26-f7dd-4724-855f-e7442bd08bba',
    '491d6275-c3b3-4aaa-907f-5b4c2be5fd87','67301e84-6197-4ae9-9c9e-ba67192606cb','e4073195-adbd-4264-9218-bd0467a2275a','a0bc3290-a002-49da-90c8-4c4f8deaca64','51848958-6410-46b2-8600-db8aab50dc2b',
    '0a0dc0e8-9b02-4c33-85f1-6f2ff8800c33','91e24645-0d44-4c73-8772-ed16a278c9e4','4f909739-4899-4e6a-accc-be3b11d447b7','e384989a-89d9-43a0-915a-7d7414617109','e32cb931-795e-4207-ac6d-5da8d34b7ba0','0cbd2741-534d-4ea7-8b24-792dc6a7e5d2'
  ]::UUID[],
  ARRAY['PM']::TEXT[]
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subfamily_ids = EXCLUDED.subfamily_ids,
  dependency_codes = EXCLUDED.dependency_codes;

-- ─── 5. FUNCTION: generate_packing_list ───
CREATE OR REPLACE FUNCTION generate_packing_list(p_event_id UUID)
RETURNS SETOF event_packing
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_format TEXT;
  v_capacite INTEGER;
  v_territoire TEXT;
  v_format_mult NUMERIC;
  v_territory_mult NUMERIC;
  v_conversion_rate NUMERIC;
  v_product RECORD;
  v_role_code TEXT;
  v_qty INTEGER;
  v_family_name TEXT;
  v_merch_count INTEGER;
  v_stock_qty INTEGER;
  v_min_stock INTEGER;
BEGIN
  -- Read event info
  SELECT format, capacite, territoire
  INTO v_format, v_capacite, v_territoire
  FROM events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event % not found', p_event_id;
  END IF;

  -- Format multiplier
  v_format_mult := CASE
    WHEN v_format ILIKE '%concert%' OR v_format ILIKE '%live%' THEN 1.0
    WHEN v_format ILIKE '%sound%' THEN 0.7
    WHEN v_format ILIKE '%impro%' OR v_format ILIKE '%acoustic%' THEN 0.4
    ELSE 0.7  -- default
  END;

  -- Conversion rate for merch
  v_conversion_rate := CASE
    WHEN v_format ILIKE '%concert%' OR v_format ILIKE '%live%' THEN 0.11
    WHEN v_format ILIKE '%sound%' THEN 0.07
    WHEN v_format ILIKE '%impro%' OR v_format ILIKE '%acoustic%' THEN 0.13
    ELSE 0.07
  END;

  -- Territory multiplier
  v_territory_mult := CASE
    WHEN v_territoire ILIKE '%guadeloupe%' THEN 0.85
    ELSE 1.0  -- Martinique or default
  END;

  -- Default capacite if null
  IF v_capacite IS NULL OR v_capacite = 0 THEN
    v_capacite := 200;
  END IF;

  -- For each product, compute qty and assign role
  FOR v_product IN
    SELECT p.id AS product_id, p.subfamily_id, p.category, p.min_stock AS p_min_stock,
           f.name AS family_name, sf.name AS subfamily_name
    FROM products p
    LEFT JOIN subfamilies sf ON sf.id = p.subfamily_id
    LEFT JOIN families f ON f.id = sf.family_id
  LOOP
    v_family_name := UPPER(COALESCE(v_product.family_name, ''));

    -- Calculate quantity_needed based on family
    IF v_family_name LIKE '%MERCH%' OR v_product.category = 'merch' THEN
      -- Count merch products in same subfamily for distribution
      SELECT COUNT(*) INTO v_merch_count
      FROM products
      WHERE subfamily_id = v_product.subfamily_id;
      IF v_merch_count < 1 THEN v_merch_count := 1; END IF;

      v_qty := CEIL(
        v_capacite::NUMERIC * v_conversion_rate * v_territory_mult * v_format_mult
        / v_merch_count
      );
      IF v_qty < 1 THEN v_qty := 1; END IF;

    ELSIF v_family_name LIKE '%MAT%' OR v_product.category = 'materiel' THEN
      -- Take current stock qty (everything needed)
      SELECT COALESCE(SUM(quantity), 0) INTO v_stock_qty
      FROM stock
      WHERE product_id = v_product.product_id;
      v_qty := GREATEST(v_stock_qty, 1);

    ELSIF v_family_name LIKE '%CONSO%' OR v_product.category = 'consommables' THEN
      -- Base on min_stock with format multiplier
      v_min_stock := COALESCE(v_product.p_min_stock, 5);
      v_qty := CEIL(v_min_stock::NUMERIC * v_format_mult * v_territory_mult);
      IF v_qty < 1 THEN v_qty := 1; END IF;

    ELSE
      v_qty := 1;
    END IF;

    -- Find the most specific role for this product's subfamily
    -- Pick the role with fewest subfamily_ids that contains this subfamily (most specific)
    SELECT r.code INTO v_role_code
    FROM roles r
    WHERE v_product.subfamily_id = ANY(r.subfamily_ids)
    ORDER BY array_length(r.subfamily_ids, 1) ASC NULLS LAST
    LIMIT 1;

    -- Default to TM if no role found
    IF v_role_code IS NULL THEN
      v_role_code := 'TM';
    END IF;

    -- Upsert into event_packing
    INSERT INTO event_packing (event_id, product_id, role_code, quantity_needed, quantity_packed, packed)
    VALUES (p_event_id, v_product.product_id, v_role_code, v_qty, 0, false)
    ON CONFLICT (event_id, product_id) DO UPDATE SET
      role_code = EXCLUDED.role_code,
      quantity_needed = EXCLUDED.quantity_needed;

  END LOOP;

  -- Return all packing items for this event
  RETURN QUERY
    SELECT * FROM event_packing WHERE event_id = p_event_id ORDER BY role_code, created_at;
END;
$fn$;

-- ─── VERIFICATION ───
SELECT 'roles' AS table_name, COUNT(*) AS row_count FROM roles
UNION ALL
SELECT 'event_packing', COUNT(*) FROM event_packing
UNION ALL
SELECT 'user_profiles_has_role_id',
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role_id'
  ) THEN 1 ELSE 0 END;
