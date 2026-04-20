-- ================================================================
-- PHASE N.0c — Table de mapping SumUp -> produits BackStage
-- Date : 2026-04-20
-- Source : Rapport-articles-2026-04-07.csv (Lamentin, 8 labels)
--
-- Probleme :
--   - SumUp export CSV n'a AUCUN SKU rempli
--   - AUCUNE variante/taille dans les exports (juste le libelle)
--   - Noms SumUp != noms BackStage (ex: "Tee shirt EK tour 2026" vs "T-shirt EK 25 Celebration Noir")
--
-- Solution :
--   - Table sumup_mapping qui fait le pont
--   - Pre-remplie avec les 8 labels identifies du CSV Lamentin
--   - Flags : is_billetterie (CA non-merch), is_ignored (TPE/materiel)
--   - confidence : 'confirmed' | 'needs_variant' | 'needs_review'
--   - Extensible pour les futurs imports SumUp + esykennenga.fr + Bizouk
-- ================================================================

-- =============== 1. TABLE sumup_mapping ===============
CREATE TABLE IF NOT EXISTS public.sumup_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'sumup', -- 'sumup' | 'esykennenga' | 'bizouk' | 'printful'
  sumup_label text NOT NULL,             -- Libelle exact tel qu'il apparait dans l'export
  sumup_variant text,                    -- Variante SumUp (souvent vide aujourd'hui)
  sumup_category text,                   -- 'Mes articles' | 'Events' | autre
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  is_billetterie boolean DEFAULT false,  -- TRUE = ventes de billets (pas du merch)
  is_ignored boolean DEFAULT false,      -- TRUE = a ignorer (ex: TPE SumUp lui-meme)
  confidence text DEFAULT 'needs_review' CHECK (confidence IN ('confirmed', 'needs_variant', 'needs_review')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (org_id, source, sumup_label)
);

ALTER TABLE public.sumup_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sumup_mapping_select_org ON public.sumup_mapping;
DROP POLICY IF EXISTS sumup_mapping_insert_org ON public.sumup_mapping;
DROP POLICY IF EXISTS sumup_mapping_update_org ON public.sumup_mapping;
DROP POLICY IF EXISTS sumup_mapping_delete_org ON public.sumup_mapping;

CREATE POLICY sumup_mapping_select_org ON public.sumup_mapping
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids((SELECT auth.uid()))));
CREATE POLICY sumup_mapping_insert_org ON public.sumup_mapping
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids((SELECT auth.uid()))));
CREATE POLICY sumup_mapping_update_org ON public.sumup_mapping
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids((SELECT auth.uid()))));
CREATE POLICY sumup_mapping_delete_org ON public.sumup_mapping
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids((SELECT auth.uid()))));

CREATE INDEX IF NOT EXISTS idx_sumup_mapping_org ON public.sumup_mapping(org_id);
CREATE INDEX IF NOT EXISTS idx_sumup_mapping_product ON public.sumup_mapping(product_id);
CREATE INDEX IF NOT EXISTS idx_sumup_mapping_source ON public.sumup_mapping(source);

COMMENT ON TABLE public.sumup_mapping IS 'Table de mapping : libelle externe (SumUp, site e-commerce, Bizouk) -> product_id + variant_id BackStage. Utilisee par l''import pour matcher les ventes brutes.';
COMMENT ON COLUMN public.sumup_mapping.confidence IS 'confirmed = mapping certain (reviewed). needs_variant = produit OK mais taille par defaut a valider. needs_review = mapping propose, a verifier.';

-- =============== 2. PRE-REMPLISSAGE : 8 labels Lamentin 07/04 ===============
-- UUIDs produits et variants recuperes de Supabase (Phase N.0b deja appliquee)

-- Ligne 1 SumUp : "DVD Olympia"
INSERT INTO public.sumup_mapping (org_id, source, sumup_label, sumup_variant, sumup_category, product_id, variant_id, confidence, notes)
VALUES ('00000000-0000-0000-0000-000000000001', 'sumup', 'DVD Olympia', 'Standard', 'Mes articles',
        '7044e989-b2c9-472b-ac02-c7d3e4c86d71', NULL, 'needs_review',
        'Prix vendu 5EUR a Lamentin au lieu de 15EUR (ref Base_Articles). A clarifier : erreur SumUp ou prix brade intentionnel ?')
ON CONFLICT (org_id, source, sumup_label) DO NOTHING;

-- Ligne 2 SumUp : "Entree cine theatre ek 25 Celebration 7 Avril" (BILLETTERIE)
INSERT INTO public.sumup_mapping (org_id, source, sumup_label, sumup_variant, sumup_category, product_id, variant_id, is_billetterie, confidence, notes)
VALUES ('00000000-0000-0000-0000-000000000001', 'sumup', 'Entrée ciné théâtre ek 25 Célébration 7 Avril', NULL, 'Events',
        NULL, NULL, true, 'confirmed',
        'Billetterie concert Lamentin 07/04. CA non-merch : exclure des KPIs merch. A tracker separement.')
ON CONFLICT (org_id, source, sumup_label) DO NOTHING;

-- Ligne 3 SumUp : "Pom'Kanel"
INSERT INTO public.sumup_mapping (org_id, source, sumup_label, sumup_variant, sumup_category, product_id, variant_id, confidence, notes)
VALUES ('00000000-0000-0000-0000-000000000001', 'sumup', 'Pom''Kanèl', NULL, 'Mes articles',
        'dbd71d48-ce42-441e-aa1a-aa3a33065406', NULL, 'confirmed',
        'Livre Pom''Kanel - Nwel. Prix 13EUR. Aussi vendu sur esykennenga.fr.')
ON CONFLICT (org_id, source, sumup_label) DO NOTHING;

-- Ligne 4 SumUp : "Porte cle collector en bois"
INSERT INTO public.sumup_mapping (org_id, source, sumup_label, sumup_variant, sumup_category, product_id, variant_id, confidence, notes)
VALUES ('00000000-0000-0000-0000-000000000001', 'sumup', 'Porte clé collector en bois', NULL, 'Mes articles',
        '5fedd318-3386-473e-8965-b4eb1004aa92', NULL, 'confirmed',
        'Porte-cle bois EK. 12EUR. Cash machine a Lamentin (11 vendus).')
ON CONFLICT (org_id, source, sumup_label) DO NOTHING;

-- Ligne 5 SumUp : "Tee shirt col V femme" → variant M par defaut (le plus vendu a Arobase)
INSERT INTO public.sumup_mapping (org_id, source, sumup_label, sumup_variant, sumup_category, product_id, variant_id, confidence, notes)
VALUES ('00000000-0000-0000-0000-000000000001', 'sumup', 'Tee shirt col V femme', NULL, 'Mes articles',
        '1c4ed901-2cb3-412a-b580-ea18371fbf70', 'b2856b1b-392b-4613-9697-c761a636fc6c', 'needs_variant',
        'T-shirt col V Femme. Taille M par defaut (le plus frequent). VERIFIER avec equipe merch quelle taille vendue a Lamentin (L ou T3 possible).')
ON CONFLICT (org_id, source, sumup_label) DO NOTHING;

-- Ligne 6 SumUp : "Tee shirt EK tour 2026" → T-shirt EK 25 Noir M par defaut (best-seller)
INSERT INTO public.sumup_mapping (org_id, source, sumup_label, sumup_variant, sumup_category, product_id, variant_id, confidence, notes)
VALUES ('00000000-0000-0000-0000-000000000001', 'sumup', 'Tee shirt EK tour 2026', NULL, 'Mes articles',
        '98699251-5e5c-441a-a6c1-f4f5e3e1c932', '715e990d-4a5e-439a-a921-776221aff0fc', 'needs_variant',
        'T-shirt EK 25 Celebration Noir. Libelle SumUp imprecis. Taille M par defaut (best-seller). CRITIQUE : 19 vendus a Lamentin, impossible de savoir M/L/XL/XXL repartition. A corriger cote SumUp (ajouter variantes).')
ON CONFLICT (org_id, source, sumup_label) DO NOTHING;

-- Ligne 7 SumUp : "Tee shirt Femme modele unique" → variant "Wax noir" par defaut
INSERT INTO public.sumup_mapping (org_id, source, sumup_label, sumup_variant, sumup_category, product_id, variant_id, confidence, notes)
VALUES ('00000000-0000-0000-0000-000000000001', 'sumup', 'Tee shirt Femme modèle unique', NULL, 'Mes articles',
        'fa749e22-22ef-42e3-a581-d63598243c3d', '37f83c71-bc31-4d5f-a3f9-3188a31122f8', 'needs_variant',
        'T-shirt Femme unique artisanal. Variant "Wax noir" par defaut (le plus frequent). 5 variantes existent (wax/dentelle/rouge/bleu/rose) - VERIFIER laquelle a ete vendue a Lamentin.')
ON CONFLICT (org_id, source, sumup_label) DO NOTHING;

-- Ligne 8 SumUp : "Tee-shirts 25 EK femme pailletes" → variant M par defaut
INSERT INTO public.sumup_mapping (org_id, source, sumup_label, sumup_variant, sumup_category, product_id, variant_id, confidence, notes)
VALUES ('00000000-0000-0000-0000-000000000001', 'sumup', 'Tee-shirts 25 EK femme pailletés', NULL, 'Mes articles',
        '18fb4545-77bc-4e8a-9712-56ffec556aaf', 'f0cf0ba5-6579-4580-9379-588a34739a47', 'needs_variant',
        'T-shirt pailletee. Taille M par defaut. 8 vendus a Lamentin, repartition M/L inconnue.')
ON CONFLICT (org_id, source, sumup_label) DO NOTHING;

-- Ligne 9 SumUp : "Tote bag Solda Lanmou"
INSERT INTO public.sumup_mapping (org_id, source, sumup_label, sumup_variant, sumup_category, product_id, variant_id, confidence, notes)
VALUES ('00000000-0000-0000-0000-000000000001', 'sumup', 'Tote bag Solda Lanmou', NULL, 'Mes articles',
        'c0e6e367-811f-425b-84eb-bb6353afdd8f', NULL, 'confirmed',
        'Tote bag. 15EUR. Pas de variantes (taille unique).')
ON CONFLICT (org_id, source, sumup_label) DO NOTHING;

-- =============== 3. VERIFICATION ===============
SELECT
  (SELECT COUNT(*) FROM public.sumup_mapping) AS total_mappings,
  (SELECT COUNT(*) FROM public.sumup_mapping WHERE confidence = 'confirmed') AS confirmed,
  (SELECT COUNT(*) FROM public.sumup_mapping WHERE confidence = 'needs_variant') AS needs_variant,
  (SELECT COUNT(*) FROM public.sumup_mapping WHERE confidence = 'needs_review') AS needs_review,
  (SELECT COUNT(*) FROM public.sumup_mapping WHERE is_billetterie = true) AS billetterie,
  (SELECT COUNT(*) FROM public.sumup_mapping WHERE product_id IS NOT NULL) AS mapped_to_product;
