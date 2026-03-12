-- Requête 1 : Comptage des tables
SELECT 'products' AS t, COUNT(*) AS n FROM products
UNION ALL SELECT 'locations', COUNT(*) FROM locations
UNION ALL SELECT 'stock', COUNT(*) FROM stock
UNION ALL SELECT 'movements', COUNT(*) FROM movements
UNION ALL SELECT 'events', COUNT(*) FROM events
UNION ALL SELECT 'families', COUNT(*) FROM families
UNION ALL SELECT 'subfamilies', COUNT(*) FROM subfamilies
ORDER BY t;
