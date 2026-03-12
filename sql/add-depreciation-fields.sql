-- Ajout champs amortissement sur products
-- Idempotent : IF NOT EXISTS / OR REPLACE

-- 1. Nouvelles colonnes
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_ht NUMERIC(10,2) DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_date DATE DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS useful_life_months INTEGER DEFAULT NULL;

-- 2. Vue amortissement linéaire (comptabilite francaise)
-- Prorata temporis base 360 jours (30j/mois)
-- Seuil immobilisation : 500 EUR HT
CREATE OR REPLACE VIEW product_depreciation AS
SELECT
  p.id,
  p.name,
  p.sku,
  p.category,
  p.cost_ht,
  p.purchase_date,
  p.useful_life_months,
  CASE
    WHEN p.cost_ht IS NULL OR p.cost_ht < 500 THEN 'charge'
    ELSE 'immobilisation'
  END AS regime,
  CASE
    WHEN p.cost_ht IS NULL OR p.cost_ht < 500 OR p.useful_life_months IS NULL OR p.useful_life_months = 0 THEN 0
    ELSE ROUND(p.cost_ht / p.useful_life_months, 2)
  END AS monthly_depreciation,
  CASE
    WHEN p.cost_ht IS NULL OR p.cost_ht < 500 OR p.purchase_date IS NULL OR p.useful_life_months IS NULL OR p.useful_life_months = 0 THEN 0
    ELSE ROUND(
      LEAST(
        p.cost_ht,
        (p.cost_ht / p.useful_life_months) * GREATEST(0,
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.purchase_date)) * 12
          + EXTRACT(MONTH FROM AGE(CURRENT_DATE, p.purchase_date))
        )
      ), 2)
  END AS cumulative_depreciation,
  CASE
    WHEN p.cost_ht IS NULL OR p.cost_ht < 500 OR p.purchase_date IS NULL OR p.useful_life_months IS NULL OR p.useful_life_months = 0 THEN p.cost_ht
    ELSE ROUND(
      GREATEST(0,
        p.cost_ht - (p.cost_ht / p.useful_life_months) * GREATEST(0,
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.purchase_date)) * 12
          + EXTRACT(MONTH FROM AGE(CURRENT_DATE, p.purchase_date))
        )
      ), 2)
  END AS net_book_value,
  CASE
    WHEN p.purchase_date IS NULL OR p.useful_life_months IS NULL THEN NULL
    ELSE p.purchase_date + (p.useful_life_months || ' months')::INTERVAL
  END AS end_date
FROM products p
WHERE p.cost_ht IS NOT NULL AND p.cost_ht > 0;

-- 3. Verification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'products' AND column_name IN ('cost_ht','purchase_date','useful_life_months')
ORDER BY column_name;
