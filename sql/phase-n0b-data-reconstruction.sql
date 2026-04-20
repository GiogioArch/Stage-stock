-- ================================================================
-- PHASE N.0b — Reconstruction data merch + customers (CRM)
-- Date : 2026-04-20
-- Source : Drive 02_EK TOUR / Ventes-Concert-Arobase-20mars2026.xlsx
--
-- Objectifs :
--  1. Creer table customers (CRM RGPD)
--  2. Lier sales -> customers + flag is_aggregate + sale_date
--  3. Creer variants manquants (T-shirt unique, col V, pailletee, Polo F)
--  4. Reconstruire les 9 tickets individuels Arobase (au lieu d'un bilan agrege)
--  5. Marquer Lamentin 07/04 comme is_aggregate=true (en attente tickets SumUp)
--  6. Recalculer customers.total_* via triggers
-- ================================================================

-- =============== 1. TABLE CUSTOMERS ===============
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  phone text,
  email text,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'FR',
  rgpd_consent boolean DEFAULT false,
  rgpd_consent_date timestamptz,
  marketing_consent boolean DEFAULT false,
  source text DEFAULT 'concert', -- 'concert' | 'site' | 'bizouk' | 'import' | 'manuel'
  notes text,
  first_purchase_at timestamptz,
  last_purchase_at timestamptz,
  total_purchases_count integer DEFAULT 0,
  total_spent numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_select_org ON public.customers;
DROP POLICY IF EXISTS customers_insert_org ON public.customers;
DROP POLICY IF EXISTS customers_update_org ON public.customers;
DROP POLICY IF EXISTS customers_delete_org ON public.customers;

CREATE POLICY customers_select_org ON public.customers
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids((SELECT auth.uid()))));
CREATE POLICY customers_insert_org ON public.customers
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids((SELECT auth.uid()))));
CREATE POLICY customers_update_org ON public.customers
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids((SELECT auth.uid()))));
CREATE POLICY customers_delete_org ON public.customers
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids((SELECT auth.uid()))));

CREATE INDEX IF NOT EXISTS idx_customers_org_id ON public.customers(org_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email) WHERE email IS NOT NULL;

COMMENT ON TABLE public.customers IS 'Base clients consolidee (concerts + site e-commerce). RGPD strict.';

-- =============== 2. SALES : customer_id + is_aggregate + sale_date ===============
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_aggregate boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sale_date date;

-- Backfill sale_date depuis created_at pour les sales existantes
UPDATE public.sales SET sale_date = created_at::date WHERE sale_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_is_aggregate ON public.sales(is_aggregate) WHERE is_aggregate = true;

COMMENT ON COLUMN public.sales.is_aggregate IS 'TRUE = bilan concert agrege (pas un ticket individuel). Les KPIs panier moyen les excluent.';
COMMENT ON COLUMN public.sales.sale_date IS 'Date effective de la vente (concert). created_at = date d''import/saisie.';
COMMENT ON COLUMN public.sales.customer_id IS 'Client si identifie (nullable car la plupart des ventes stand merch sont anonymes).';

-- =============== 3. VARIANTS MANQUANTS ===============
-- T-shirt Femme unique (EK-TS-UNIQ) — 5 variants wax/dentelle/rouge/bleu/rose
INSERT INTO public.product_variants (product_id, name, sku_suffix, sort_order)
SELECT 'fa749e22-22ef-42e3-a581-d63598243c3d'::uuid, v.name, v.suffix, v.ord
FROM (VALUES
  ('Wax noir', '-WAX-NOI', 10),
  ('Dentelle noir', '-DENT-NOI', 20),
  ('Rouge/Fuchsia', '-RGE', 30),
  ('Bleu Turquoise', '-BLEU', 40),
  ('Rose/Fuchsia', '-ROSE', 50)
) AS v(name, suffix, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_variants pv
  WHERE pv.product_id = 'fa749e22-22ef-42e3-a581-d63598243c3d'::uuid AND pv.name = v.name
);

-- T-shirt col V Femme (EK-TS-COLV) — 3 variants M/L/T3
INSERT INTO public.product_variants (product_id, name, sku_suffix, sort_order)
SELECT '1c4ed901-2cb3-412a-b580-ea18371fbf70'::uuid, v.name, v.suffix, v.ord
FROM (VALUES ('M', '-M', 10), ('L', '-L', 20), ('T3', '-T3', 30)) AS v(name, suffix, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_variants pv
  WHERE pv.product_id = '1c4ed901-2cb3-412a-b580-ea18371fbf70'::uuid AND pv.name = v.name
);

-- T-shirt EK 25 Femme pailletee (EK-TS-EK25F-PAIL) — 2 variants M/L
INSERT INTO public.product_variants (product_id, name, sku_suffix, sort_order)
SELECT '18fb4545-77bc-4e8a-9712-56ffec556aaf'::uuid, v.name, v.suffix, v.ord
FROM (VALUES ('M', '-M', 10), ('L', '-L', 20)) AS v(name, suffix, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_variants pv
  WHERE pv.product_id = '18fb4545-77bc-4e8a-9712-56ffec556aaf'::uuid AND pv.name = v.name
);

-- Polo Femme Solda Lanmou (EK-POF) — 1 variant Noir/Blanc
INSERT INTO public.product_variants (product_id, name, sku_suffix, sort_order)
SELECT 'd74db3c2-4b24-4cb7-948d-00acbe2830e9'::uuid, v.name, v.suffix, v.ord
FROM (VALUES ('Noir/Blanc', '-NOIBLC', 10)) AS v(name, suffix, ord)
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_variants pv
  WHERE pv.product_id = 'd74db3c2-4b24-4cb7-948d-00acbe2830e9'::uuid AND pv.name = v.name
);

-- =============== 4. CUSTOMERS IDENTIFIES (Arobase 20-21/03) ===============
INSERT INTO public.customers (id, org_id, first_name, last_name, phone, address, city, postal_code, rgpd_consent, source, first_purchase_at, last_purchase_at, notes)
VALUES
  (
    'c0001c0a-0000-4000-a000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Rene', 'Coail', NULL, NULL, NULL, NULL, false, 'concert',
    '2026-03-20 20:00:00+00', '2026-03-20 20:00:00+00',
    'Concert Arobase J1 — 2 T-shirts EK25 Noir M + 1 Polo offert au patron (Danielle presente)'
  ),
  (
    'c0001c0a-0000-4000-a000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Roselyne', 'Nestoret', '0696 02 22 29', NULL, NULL, NULL, false, 'concert',
    '2026-03-20 20:30:00+00', '2026-03-20 20:30:00+00',
    'Concert Arobase J1 — Polo Femme Solda Lanmou (surnom Yolande)'
  ),
  (
    'c0001c0a-0000-4000-a000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Catherine', 'Beroard-Gabbidom', '0696 97 42 68', '39 rue des Amours, Terre Ville', 'Schoelcher', '97233', false, 'concert',
    '2026-03-21 20:00:00+00', '2026-03-21 20:00:00+00',
    'Concert Arobase J2 — T-shirt EK25 Noir M (coupe femme)'
  )
ON CONFLICT (id) DO NOTHING;

-- =============== 5. RECONSTRUCTION VENTES AROBASE (9 tickets) ===============
-- Suppression de la sale agrege Arobase (ARO-20MAR)
DELETE FROM public.sale_items WHERE sale_id = '5c27989d-e2cf-4334-9c31-c059da1e5b49';
DELETE FROM public.sales WHERE id = '5c27989d-e2cf-4334-9c31-c059da1e5b49';

-- Event Arobase 20/03 : 7a84cb80-e75e-46ea-b596-da7df9a26cbf
-- Org EK         : 00000000-0000-0000-0000-000000000001

-- Ticket 1 (20/03) : Rene Coail + Danielle + Polo offert — 50€
INSERT INTO public.sales (id, org_id, event_id, sale_number, payment_method, total_amount, items_count, customer_id, sale_date, created_at, notes)
VALUES ('5a1e0001-0000-4000-a000-000000000001', '00000000-0000-0000-0000-000000000001', '7a84cb80-e75e-46ea-b596-da7df9a26cbf',
        'ARO-01', 'card', 50.00, 3, 'c0001c0a-0000-4000-a000-000000000001', '2026-03-20', '2026-03-20 20:00:00+00',
        'Arobase J1 — Ticket #1 Rene Coail + Danielle. Polo offert au patron.');
INSERT INTO public.sale_items (org_id, sale_id, product_id, variant, quantity, unit_price, line_total) VALUES
  ('00000000-0000-0000-0000-000000000001', '5a1e0001-0000-4000-a000-000000000001', '98699251-5e5c-441a-a6c1-f4f5e3e1c932', 'M', 2, 25.00, 50.00),
  ('00000000-0000-0000-0000-000000000001', '5a1e0001-0000-4000-a000-000000000001', '237482e1-2c75-49df-a37d-7d7d4ab7a851', 'Noir (offert patron)', 1, 0.00, 0.00);

-- Ticket 2 (20/03) : Roselyne Nestoret — Polo Femme — 30€
INSERT INTO public.sales (id, org_id, event_id, sale_number, payment_method, total_amount, items_count, customer_id, sale_date, created_at, notes)
VALUES ('5a1e0001-0000-4000-a000-000000000002', '00000000-0000-0000-0000-000000000001', '7a84cb80-e75e-46ea-b596-da7df9a26cbf',
        'ARO-02', 'card', 30.00, 1, 'c0001c0a-0000-4000-a000-000000000002', '2026-03-20', '2026-03-20 20:30:00+00',
        'Arobase J1 — Ticket #2 Roselyne Nestoret (Yolande)');
INSERT INTO public.sale_items (org_id, sale_id, product_id, variant, quantity, unit_price, line_total) VALUES
  ('00000000-0000-0000-0000-000000000001', '5a1e0001-0000-4000-a000-000000000002', 'd74db3c2-4b24-4cb7-948d-00acbe2830e9', 'Noir/Blanc', 1, 30.00, 30.00);

-- Ticket 3 (20/03) : anonyme — Porte-cle — 12€
INSERT INTO public.sales (id, org_id, event_id, sale_number, payment_method, total_amount, items_count, sale_date, created_at, notes)
VALUES ('5a1e0001-0000-4000-a000-000000000003', '00000000-0000-0000-0000-000000000001', '7a84cb80-e75e-46ea-b596-da7df9a26cbf',
        'ARO-03', 'card', 12.00, 1, '2026-03-20', '2026-03-20 21:00:00+00',
        'Arobase J1 — Ticket #3 anonyme');
INSERT INTO public.sale_items (org_id, sale_id, product_id, variant, quantity, unit_price, line_total) VALUES
  ('00000000-0000-0000-0000-000000000001', '5a1e0001-0000-4000-a000-000000000003', '5fedd318-3386-473e-8965-b4eb1004aa92', 'Unique', 1, 12.00, 12.00);

-- Ticket 4 (21/03) : anonyme — T-shirt unique + Tote bag — 55€
INSERT INTO public.sales (id, org_id, event_id, sale_number, payment_method, total_amount, items_count, sale_date, created_at, notes)
VALUES ('5a1e0001-0000-4000-a000-000000000004', '00000000-0000-0000-0000-000000000001', '7a84cb80-e75e-46ea-b596-da7df9a26cbf',
        'ARO-04', 'card', 55.00, 2, '2026-03-21', '2026-03-21 20:00:00+00',
        'Arobase J2 — Ticket #4 anonyme');
INSERT INTO public.sale_items (org_id, sale_id, product_id, variant, quantity, unit_price, line_total) VALUES
  ('00000000-0000-0000-0000-000000000001', '5a1e0001-0000-4000-a000-000000000004', 'fa749e22-22ef-42e3-a581-d63598243c3d', 'Wax noir', 1, 40.00, 40.00),
  ('00000000-0000-0000-0000-000000000001', '5a1e0001-0000-4000-a000-000000000004', 'c0e6e367-811f-425b-84eb-bb6353afdd8f', 'Unique', 1, 15.00, 15.00);

-- Ticket 5 (21/03) : anonyme — 3× T-shirt col V Femme M — 60€
INSERT INTO public.sales (id, org_id, event_id, sale_number, payment_method, total_amount, items_count, sale_date, created_at, notes)
VALUES ('5a1e0001-0000-4000-a000-000000000005', '00000000-0000-0000-0000-000000000001', '7a84cb80-e75e-46ea-b596-da7df9a26cbf',
        'ARO-05', 'card', 60.00, 3, '2026-03-21', '2026-03-21 20:30:00+00',
        'Arobase J2 — Ticket #5 anonyme — 3 t-shirts col V M');
INSERT INTO public.sale_items (org_id, sale_id, product_id, variant, quantity, unit_price, line_total) VALUES
  ('00000000-0000-0000-0000-000000000001', '5a1e0001-0000-4000-a000-000000000005', '1c4ed901-2cb3-412a-b580-ea18371fbf70', 'M', 3, 20.00, 60.00);

-- Ticket 6 (21/03) : Catherine Beroard-Gabbidom — T-shirt EK25 Noir M — 25€
INSERT INTO public.sales (id, org_id, event_id, sale_number, payment_method, total_amount, items_count, customer_id, sale_date, created_at, notes)
VALUES ('5a1e0001-0000-4000-a000-000000000006', '00000000-0000-0000-0000-000000000001', '7a84cb80-e75e-46ea-b596-da7df9a26cbf',
        'ARO-06', 'card', 25.00, 1, 'c0001c0a-0000-4000-a000-000000000003', '2026-03-21', '2026-03-21 21:00:00+00',
        'Arobase J2 — Ticket #6 Catherine Beroard-Gabbidom');
INSERT INTO public.sale_items (org_id, sale_id, product_id, variant, quantity, unit_price, line_total) VALUES
  ('00000000-0000-0000-0000-000000000001', '5a1e0001-0000-4000-a000-000000000006', '98699251-5e5c-441a-a6c1-f4f5e3e1c932', 'M', 1, 25.00, 25.00);

-- Ticket 7 (21/03) : anonyme — CD EK Trip — 15€ ESPECES
INSERT INTO public.sales (id, org_id, event_id, sale_number, payment_method, total_amount, items_count, sale_date, created_at, notes)
VALUES ('5a1e0001-0000-4000-a000-000000000007', '00000000-0000-0000-0000-000000000001', '7a84cb80-e75e-46ea-b596-da7df9a26cbf',
        'ARO-07', 'cash', 15.00, 1, '2026-03-21', '2026-03-21 21:15:00+00',
        'Arobase J2 — Ticket #7 anonyme — Especes');
INSERT INTO public.sale_items (org_id, sale_id, product_id, variant, quantity, unit_price, line_total) VALUES
  ('00000000-0000-0000-0000-000000000001', '5a1e0001-0000-4000-a000-000000000007', '55368ad4-3756-40e9-a6f0-0231e7e432ea', 'Unique', 1, 15.00, 15.00);

-- Ticket 8 (21/03) : anonyme — T-shirt unique — 40€
INSERT INTO public.sales (id, org_id, event_id, sale_number, payment_method, total_amount, items_count, sale_date, created_at, notes)
VALUES ('5a1e0001-0000-4000-a000-000000000008', '00000000-0000-0000-0000-000000000001', '7a84cb80-e75e-46ea-b596-da7df9a26cbf',
        'ARO-08', 'card', 40.00, 1, '2026-03-21', '2026-03-21 21:30:00+00',
        'Arobase J2 — Ticket #8 anonyme');
INSERT INTO public.sale_items (org_id, sale_id, product_id, variant, quantity, unit_price, line_total) VALUES
  ('00000000-0000-0000-0000-000000000001', '5a1e0001-0000-4000-a000-000000000008', 'fa749e22-22ef-42e3-a581-d63598243c3d', 'Wax noir', 1, 40.00, 40.00);

-- Ticket 9 (21/03) : anonyme — Livre Pom'Kanel — 13€
INSERT INTO public.sales (id, org_id, event_id, sale_number, payment_method, total_amount, items_count, sale_date, created_at, notes)
VALUES ('5a1e0001-0000-4000-a000-000000000009', '00000000-0000-0000-0000-000000000001', '7a84cb80-e75e-46ea-b596-da7df9a26cbf',
        'ARO-09', 'card', 13.00, 1, '2026-03-21', '2026-03-21 22:00:00+00',
        'Arobase J2 — Ticket #9 anonyme');
INSERT INTO public.sale_items (org_id, sale_id, product_id, variant, quantity, unit_price, line_total) VALUES
  ('00000000-0000-0000-0000-000000000001', '5a1e0001-0000-4000-a000-000000000009', 'dbd71d48-ce42-441e-aa1a-aa3a33065406', 'Unique', 1, 13.00, 13.00);

-- =============== 6. LAMENTIN 07/04 : flag bilan agrege ===============
-- On garde la sale GP-07AVR telle quelle, mais on la marque comme agregee
-- Elle sera eclatee en tickets individuels lors de l'import SumUp ticket-par-ticket (Phase N.1)
UPDATE public.sales
SET is_aggregate = true,
    sale_date = '2026-04-07',
    notes = COALESCE(notes, '') || ' [BILAN AGREGE — a eclater en tickets via import SumUp Phase N.1]'
WHERE sale_number = 'GP-07AVR';

-- =============== 7. RECALCUL customers.total_* ===============
UPDATE public.customers c
SET total_purchases_count = sub.nb,
    total_spent = sub.total,
    first_purchase_at = sub.first_at,
    last_purchase_at = sub.last_at,
    updated_at = now()
FROM (
  SELECT customer_id,
         COUNT(*) AS nb,
         SUM(total_amount) AS total,
         MIN(created_at) AS first_at,
         MAX(created_at) AS last_at
  FROM public.sales
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) sub
WHERE c.id = sub.customer_id;

-- =============== 8. VERIFICATION ===============
-- Attendu : 10 sales (9 Arobase + 1 Lamentin agregee), 17 sale_items (15 Arobase + 2 Lamentin...
-- En realite Arobase a 11 sale_items (1+1+1+2+1+1+1+1+1+2 = 11 lignes car certains tickets ont plusieurs items),
-- + 8 sale_items Lamentin (les 8 lignes du SumUp original). Total attendu : 19 sale_items.
DO $$
DECLARE
  v_sales_count int;
  v_items_count int;
  v_aggregates_count int;
  v_customers_count int;
  v_variants_count int;
  v_arobase_total numeric;
BEGIN
  SELECT COUNT(*) INTO v_sales_count FROM public.sales;
  SELECT COUNT(*) INTO v_items_count FROM public.sale_items;
  SELECT COUNT(*) INTO v_aggregates_count FROM public.sales WHERE is_aggregate = true;
  SELECT COUNT(*) INTO v_customers_count FROM public.customers;
  SELECT COUNT(*) INTO v_variants_count FROM public.product_variants;
  SELECT SUM(total_amount) INTO v_arobase_total FROM public.sales WHERE event_id = '7a84cb80-e75e-46ea-b596-da7df9a26cbf';

  RAISE NOTICE '=== PHASE N.0b VERIFICATION ===';
  RAISE NOTICE 'Sales : % (attendu 10 : 9 Arobase tickets + 1 Lamentin agrege)', v_sales_count;
  RAISE NOTICE 'Sale_items : % (attendu ~19)', v_items_count;
  RAISE NOTICE 'Sales agregees : % (attendu 1 = Lamentin)', v_aggregates_count;
  RAISE NOTICE 'Customers : % (attendu 3 : Rene, Roselyne, Catherine)', v_customers_count;
  RAISE NOTICE 'Product variants : % (attendu 13 existants + 11 nouveaux = 24)', v_variants_count;
  RAISE NOTICE 'Total CA Arobase : % euros (attendu 300)', v_arobase_total;

  IF v_arobase_total != 300.00 THEN
    RAISE EXCEPTION 'Total Arobase incorrect : % != 300', v_arobase_total;
  END IF;
END $$;
