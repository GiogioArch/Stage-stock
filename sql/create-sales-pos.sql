-- ============================================================
-- SALES & POS — Tables pour le mode concert
-- Stage Stock v12 — Idempotent
-- ============================================================

-- 1. SALES — Une vente = une transaction (un client, un passage en caisse)
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  sale_number TEXT,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'mobile', 'mixed', 'free')),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  items_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  sold_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. SALE_ITEMS — Lignes de vente (panier multi-articles)
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CASH_REPORTS — Rapport de caisse fin de soirée
CREATE TABLE IF NOT EXISTS cash_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  total_sales NUMERIC DEFAULT 0,
  total_cash NUMERIC DEFAULT 0,
  total_card NUMERIC DEFAULT 0,
  total_mobile NUMERIC DEFAULT 0,
  nb_transactions INTEGER DEFAULT 0,
  nb_items_sold INTEGER DEFAULT 0,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ DEFAULT now(),
  closed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_reports ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['sales', 'sale_items', 'cash_reports'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'allow_auth_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'allow_auth_' || t, t
    );
  END LOOP;
END $$;

-- 5. INDEX
CREATE INDEX IF NOT EXISTS idx_sales_event_id ON sales (event_id);
CREATE INDEX IF NOT EXISTS idx_sales_org_id ON sales (org_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items (sale_id);

-- 6. VERIFICATION
SELECT 'sales' AS tbl, count(*) FROM sales
UNION ALL SELECT 'sale_items', count(*) FROM sale_items
UNION ALL SELECT 'cash_reports', count(*) FROM cash_reports;
