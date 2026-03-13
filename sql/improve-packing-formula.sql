-- ============================================================
-- IMPROVED PACKING LIST FORMULA — Stage Stock v9.0
-- Better calculation: format-aware, territory-aware, role-aware
-- ============================================================

-- Drop old version first (return type may differ)
DROP FUNCTION IF EXISTS generate_packing_list(uuid);

-- Recreate with improved logic
CREATE OR REPLACE FUNCTION generate_packing_list(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
  v_event RECORD;
  v_format TEXT;
  v_capacite INT;
  v_territoire TEXT;
  v_conversion_rate NUMERIC;
  v_territory_mult NUMERIC;
  v_format_mult NUMERIC;
  v_role RECORD;
  v_product RECORD;
  v_qty INT;
  v_current_stock INT;
BEGIN
  -- Get event info
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found: %', p_event_id;
  END IF;

  v_format := COALESCE(v_event.format, 'concert');
  v_capacite := COALESCE(v_event.capacite, 500);
  v_territoire := COALESCE(v_event.territoire, 'martinique');

  -- Conversion rates by format (% of audience that buys merch)
  v_conversion_rate := CASE LOWER(v_format)
    WHEN 'concert' THEN 0.11       -- 11% concert live
    WHEN 'concert live' THEN 0.11
    WHEN 'sound system' THEN 0.07  -- 7% sound system
    WHEN 'sound' THEN 0.07
    WHEN 'impro' THEN 0.13         -- 13% impro
    WHEN 'festival' THEN 0.09      -- 9% festival (shared audience)
    WHEN 'showcase' THEN 0.15      -- 15% showcase (targeted audience)
    ELSE 0.10
  END;

  -- Territory multiplier
  v_territory_mult := CASE LOWER(v_territoire)
    WHEN 'martinique' THEN 1.0
    WHEN 'guadeloupe' THEN 0.85
    WHEN 'guyane' THEN 0.70
    WHEN 'reunion' THEN 0.75
    ELSE 0.90
  END;

  -- Format multiplier for matériel/consommables
  v_format_mult := CASE LOWER(v_format)
    WHEN 'concert' THEN 1.0
    WHEN 'concert live' THEN 1.0
    WHEN 'sound system' THEN 0.7    -- Less gear needed
    WHEN 'sound' THEN 0.7
    WHEN 'impro' THEN 0.5           -- Minimal setup
    WHEN 'festival' THEN 1.2        -- Extra gear for big stage
    WHEN 'showcase' THEN 0.6        -- Small venue
    ELSE 1.0
  END;

  -- Clear existing packing items for this event
  DELETE FROM event_packing WHERE event_id = p_event_id;

  -- For each role
  FOR v_role IN SELECT * FROM roles ORDER BY code LOOP
    -- For each product assigned to this role (via subfamily_ids)
    FOR v_product IN
      SELECT p.*, sf.family_id
      FROM products p
      LEFT JOIN subfamilies sf ON sf.id = p.subfamily_id
      WHERE p.subfamily_id = ANY(v_role.subfamily_ids)
    LOOP
      -- Get current total stock
      SELECT COALESCE(SUM(quantity), 0) INTO v_current_stock
      FROM stock WHERE product_id = v_product.id;

      -- Calculate quantity needed based on category
      v_qty := CASE
        -- MERCH: capacity × conversion_rate × territory_mult, divided among products in same subfamily
        WHEN v_product.category = 'merch' THEN
          GREATEST(1, CEIL(
            (v_capacite * v_conversion_rate * v_territory_mult) /
            GREATEST(1, (
              SELECT COUNT(*) FROM products
              WHERE subfamily_id = v_product.subfamily_id AND category = 'merch'
            ))
          ))

        -- MATERIEL: take current stock (you need what you have)
        WHEN v_product.category = 'materiel' THEN
          GREATEST(1, CEIL(v_current_stock * v_format_mult))

        -- CONSOMMABLES: min_stock × format_mult (replenishment-based)
        WHEN v_product.category = 'consommables' THEN
          GREATEST(1, CEIL(COALESCE(v_product.min_stock, 5) * v_format_mult))

        ELSE GREATEST(1, v_current_stock)
      END;

      -- Insert packing item
      INSERT INTO event_packing (event_id, product_id, role_code, quantity_needed, quantity_packed, packed)
      VALUES (p_event_id, v_product.id, v_role.code, v_qty, 0, false);
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ─── VERIFICATION ───
SELECT 'generate_packing_list function' AS item,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'generate_packing_list'
  ) THEN 'OK' ELSE 'MISSING' END AS status;
