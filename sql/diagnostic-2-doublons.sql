-- Requête 2 : Doublons produits par nom
SELECT name, COUNT(*) AS copies, ARRAY_AGG(id::text) AS ids
FROM products GROUP BY name HAVING COUNT(*) > 1
ORDER BY copies DESC;
