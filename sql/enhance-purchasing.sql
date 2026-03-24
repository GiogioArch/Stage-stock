-- ============================================================
-- ACHATS & FOURNISSEURS — Enhancement
-- BackStage v13 — Idempotent
-- Adds: supplier codes, extra fields, documents, supplier_products
-- ============================================================

-- ─── 1. Enhance suppliers table ───
DO $$ BEGIN
  -- Code fournisseur interne (ex: FRN-001)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='code') THEN
    ALTER TABLE suppliers ADD COLUMN code TEXT;
  END IF;
  -- SIRET (ou équivalent outre-mer)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='siret') THEN
    ALTER TABLE suppliers ADD COLUMN siret TEXT;
  END IF;
  -- N° TVA intracommunautaire
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='tva_intra') THEN
    ALTER TABLE suppliers ADD COLUMN tva_intra TEXT;
  END IF;
  -- Catégorie fournisseur (merch, technique, consommables, logistique, autre)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='category') THEN
    ALTER TABLE suppliers ADD COLUMN category TEXT DEFAULT 'autre';
  END IF;
  -- Devise
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='currency') THEN
    ALTER TABLE suppliers ADD COLUMN currency TEXT DEFAULT 'EUR';
  END IF;
  -- Commande minimum (en €)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='min_order_amount') THEN
    ALTER TABLE suppliers ADD COLUMN min_order_amount NUMERIC DEFAULT 0;
  END IF;
  -- Évaluation (1-5)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='rating') THEN
    ALTER TABLE suppliers ADD COLUMN rating INTEGER DEFAULT 0;
  END IF;
  -- IBAN pour virements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='iban') THEN
    ALTER TABLE suppliers ADD COLUMN iban TEXT;
  END IF;
  -- Ville / Pays
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='city') THEN
    ALTER TABLE suppliers ADD COLUMN city TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='country') THEN
    ALTER TABLE suppliers ADD COLUMN country TEXT DEFAULT 'FR';
  END IF;
END $$;

-- Unique constraint on code per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_code_org ON suppliers (org_id, code) WHERE code IS NOT NULL;

-- ─── 2. supplier_documents — Factures, BL, devis, etc. ───
CREATE TABLE IF NOT EXISTS supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('facture', 'bl', 'devis', 'bon_commande', 'avoir', 'contrat', 'autre')),
  doc_number TEXT,
  label TEXT,
  file_url TEXT,
  amount_ht NUMERIC,
  amount_ttc NUMERIC,
  doc_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid BOOLEAN DEFAULT false,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. supplier_products — Catalogue fournisseur (quel produit chez quel fournisseur) ───
CREATE TABLE IF NOT EXISTS supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_ref TEXT,
  unit_price_ht NUMERIC,
  lead_time_days INTEGER,
  min_quantity INTEGER DEFAULT 1,
  is_preferred BOOLEAN DEFAULT false,
  last_order_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, supplier_id, product_id)
);

-- ─── 4. RLS ───
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['supplier_documents', 'supplier_products'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'allow_auth_' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      'allow_auth_' || t, t
    );
  END LOOP;
END $$;

-- ─── 5. Indexes ───
CREATE INDEX IF NOT EXISTS idx_supplier_docs_supplier ON supplier_documents (supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_docs_order ON supplier_documents (order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_docs_org ON supplier_documents (org_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON supplier_products (supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product ON supplier_products (product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_org ON supplier_products (org_id);

-- ─── 6. Vérification ───
SELECT 'supplier_documents' AS tbl, count(*) FROM supplier_documents
UNION ALL SELECT 'supplier_products', count(*) FROM supplier_products;
