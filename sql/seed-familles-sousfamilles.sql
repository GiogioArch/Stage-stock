-- Seed familles & sous-familles — Stage Stock v8.0
-- Idempotent : ON CONFLICT DO NOTHING
-- Les UUIDs correspondent aux family_id/subfamily_id déjà référencés dans products

-- ═══════════════════════════════════════════════
-- 1. FAMILLES (3)
-- ═══════════════════════════════════════════════

INSERT INTO families (id, name, code) VALUES
  ('69849c95-54d5-45d1-ad03-e4674d855864', 'Merchandising', 'MERCH'),
  ('c62cc818-212b-4c2d-9fe7-bfc733aa2e9a', 'Materiel',      'MAT'),
  ('574f2785-54e5-4a00-bfc1-cffbba7d18f2', 'Consommables',  'CONSO')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 2. SOUS-FAMILLES (17)
-- ═══════════════════════════════════════════════

-- ─── MERCH (6 sous-familles) ───
INSERT INTO subfamilies (id, family_id, name, code) VALUES
  ('0f82b231-d201-4813-a6f1-213d6c30440b', '69849c95-54d5-45d1-ad03-e4674d855864', 'Textiles',     'MERCH-TEXT'),
  ('cbd466d4-6418-481f-b91a-2154cfad7006', '69849c95-54d5-45d1-ad03-e4674d855864', 'Affiches',     'MERCH-AFF'),
  ('5badfa3a-bb96-40d5-b650-e219e7e9c01a', '69849c95-54d5-45d1-ad03-e4674d855864', 'Media',        'MERCH-MED'),
  ('4943007f-771c-4bd1-b455-e97f164ebf7f', '69849c95-54d5-45d1-ad03-e4674d855864', 'Accessoires',  'MERCH-ACC'),
  ('746f8abf-f769-44c8-885a-057863c6f786', '69849c95-54d5-45d1-ad03-e4674d855864', 'Goodies',      'MERCH-GOOD'),
  ('a0b4ff26-f7dd-4724-855f-e7442bd08bba', '69849c95-54d5-45d1-ad03-e4674d855864', 'Sacs',         'MERCH-SAC')
ON CONFLICT (id) DO NOTHING;

-- ─── MAT (5 sous-familles) ───
INSERT INTO subfamilies (id, family_id, name, code) VALUES
  ('491d6275-c3b3-4aaa-907f-5b4c2be5fd87', 'c62cc818-212b-4c2d-9fe7-bfc733aa2e9a', 'Son',             'MAT-SON'),
  ('67301e84-6197-4ae9-9c9e-ba67192606cb', 'c62cc818-212b-4c2d-9fe7-bfc733aa2e9a', 'Instruments',     'MAT-INST'),
  ('e4073195-adbd-4264-9218-bd0467a2275a', 'c62cc818-212b-4c2d-9fe7-bfc733aa2e9a', 'Lumiere',         'MAT-LUM'),
  ('a0bc3290-a002-49da-90c8-4c4f8deaca64', 'c62cc818-212b-4c2d-9fe7-bfc733aa2e9a', 'Tech & Regie',    'MAT-TECH'),
  ('51848958-6410-46b2-8600-db8aab50dc2b', 'c62cc818-212b-4c2d-9fe7-bfc733aa2e9a', 'Scene & Decor',   'MAT-SCENE')
ON CONFLICT (id) DO NOTHING;

-- ─── CONSO (6 sous-familles) ───
INSERT INTO subfamilies (id, family_id, name, code) VALUES
  ('0a0dc0e8-9b02-4c33-85f1-6f2ff8800c33', '574f2785-54e5-4a00-bfc1-cffbba7d18f2', 'Cablage',             'CONSO-CAB'),
  ('91e24645-0d44-4c73-8772-ed16a278c9e4', '574f2785-54e5-4a00-bfc1-cffbba7d18f2', 'Energie',             'CONSO-NRJ'),
  ('4f909739-4899-4e6a-accc-be3b11d447b7', '574f2785-54e5-4a00-bfc1-cffbba7d18f2', 'Adhesifs',            'CONSO-ADH'),
  ('e384989a-89d9-43a0-915a-7d7414617109', '574f2785-54e5-4a00-bfc1-cffbba7d18f2', 'Cordes instruments',  'CONSO-CORD'),
  ('e32cb931-795e-4207-ac6d-5da8d34b7ba0', '574f2785-54e5-4a00-bfc1-cffbba7d18f2', 'Bureau',              'CONSO-BUR'),
  ('0cbd2741-534d-4ea7-8b24-792dc6a7e5d2', '574f2785-54e5-4a00-bfc1-cffbba7d18f2', 'Entretien',           'CONSO-ENT')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════
-- 3. VERIFICATION
-- ═══════════════════════════════════════════════

SELECT 'families' AS t, COUNT(*) AS n FROM families
UNION ALL SELECT 'subfamilies', COUNT(*) FROM subfamilies
ORDER BY t;
