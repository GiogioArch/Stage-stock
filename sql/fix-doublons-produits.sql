-- Fix doublons produits — Mars 2026
-- Stratégie : garder le plus ancien, supprimer le doublon
-- 0 mouvement enregistré → suppression sans risque
-- Idempotent : les DELETE ne font rien si l'ID n'existe plus

-- 1. Supprimer les entrées stock liées aux doublons (FK)
DELETE FROM stock WHERE product_id IN (
  '2ad18083-8740-411d-9bed-92f2e35c9a8a',
  '53769a09-e904-4bde-95ad-a8f4a9db5f28',
  '49912084-b0e4-423e-8ef7-1e85f1717029',
  '2f2f15aa-94ad-44ad-94c4-b1fdf444430c',
  '15ee49b0-337b-4227-b99f-d33457dfebf9',
  'd93c4f54-8ecb-499d-9e49-504bb5079b1f',
  '7ad88c18-4b34-49cd-b43c-2c8c0ad98d8c',
  'c6bfa184-16ba-47a3-9125-0811f1a7da45',
  '97c2df97-a4c2-4716-bfec-f486298aacea',
  '7ac248b0-71de-47ce-924e-655e505aa01d',
  'f314544c-17a7-4b3d-8d3b-e748af8207dc',
  '82cae000-a2b4-4491-bb65-2dfc3ce31109'
);

-- 2. Supprimer les 12 produits doublons
DELETE FROM products WHERE id IN (
  '2ad18083-8740-411d-9bed-92f2e35c9a8a',  -- Adaptateur jack 3.5 → 6.35
  '53769a09-e904-4bde-95ad-a8f4a9db5f28',  -- Basse électrique
  '49912084-b0e4-423e-8ef7-1e85f1717029',  -- Câble XLR 10m
  '2f2f15aa-94ad-44ad-94c4-b1fdf444430c',  -- Câble XLR 5m
  '15ee49b0-337b-4227-b99f-d33457dfebf9',  -- Guitare acoustique
  'd93c4f54-8ecb-499d-9e49-504bb5079b1f',  -- Machine à fumée
  '7ad88c18-4b34-49cd-b43c-2c8c0ad98d8c',  -- Micro Shure SM58
  'c6bfa184-16ba-47a3-9125-0811f1a7da45',  -- Piles AA (pack 4)
  '97c2df97-a4c2-4716-bfec-f486298aacea',  -- Projecteur LED PAR
  '7ac248b0-71de-47ce-924e-655e505aa01d',  -- Rallonge électrique 10m
  'f314544c-17a7-4b3d-8d3b-e748af8207dc',  -- Rallonge électrique 25m
  '82cae000-a2b4-4491-bb65-2dfc3ce31109'   -- Scotch double face
);

-- 3. Vérification : doit retourner 0 lignes
SELECT name, COUNT(*) AS copies
FROM products GROUP BY name HAVING COUNT(*) > 1
ORDER BY copies DESC;
