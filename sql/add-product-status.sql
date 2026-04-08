-- ═══════════════════════════════════════════════
-- Add product_status column to products table
-- Values: active, inactif, stock_mort, stock_dormant, sur_stock
-- ═══════════════════════════════════════════════

-- 1. Add column with default 'active'
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_status TEXT DEFAULT 'active';

-- 2. Check constraint for valid values
DO $$ BEGIN
  ALTER TABLE products ADD CONSTRAINT products_status_check
    CHECK (product_status IN ('active', 'inactif', 'stock_mort', 'stock_dormant', 'sur_stock'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Index for filtering
CREATE INDEX IF NOT EXISTS idx_products_status ON products(product_status);

-- 4. RPC: bulk update product status by SKU list
CREATE OR REPLACE FUNCTION bulk_update_product_status(
  p_org_id UUID,
  p_skus TEXT[],
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
  v_not_found TEXT[];
  v_sku TEXT;
BEGIN
  -- Validate status
  IF p_status NOT IN ('active', 'inactif', 'stock_mort', 'stock_dormant', 'sur_stock') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Statut invalide: ' || p_status);
  END IF;

  -- Update matching products
  UPDATE products
  SET product_status = p_status
  WHERE org_id = p_org_id AND sku = ANY(p_skus);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- Find SKUs that didn't match
  SELECT array_agg(s) INTO v_not_found
  FROM unnest(p_skus) AS s
  WHERE NOT EXISTS (
    SELECT 1 FROM products WHERE org_id = p_org_id AND sku = s
  );

  RETURN jsonb_build_object(
    'success', true,
    'updated', v_updated,
    'not_found', COALESCE(v_not_found, ARRAY[]::TEXT[])
  );
END;
$$;

-- Vérification
SELECT column_name, data_type, column_default FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'product_status';
