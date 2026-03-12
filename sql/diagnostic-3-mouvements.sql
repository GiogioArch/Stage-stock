-- Requête 3 : Produits avec mouvements (ne pas supprimer sans merger)
SELECT p.name, COUNT(m.id) AS nb_mouvements
FROM products p INNER JOIN movements m ON m.product_id = p.id
GROUP BY p.name ORDER BY nb_mouvements DESC;
