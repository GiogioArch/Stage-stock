# Rapport de Déploiement — Correctifs de Sécurité

**Projet :** Stage Stock
**Date :** 17 Mars 2026
**Auteur :** Manus AI
**Statut :** Déployé en production

---

## Résumé des Actions Exécutées

Les trois urgences de sécurité identifiées lors de l'audit ont été corrigées directement sur l'infrastructure de production (Supabase + GitHub). Voici le détail de chaque intervention.

---

## Urgence 1 : Politiques RLS — CORRIGÉE

### Actions réalisées sur Supabase

L'ensemble des politiques permissives `USING (true)` a été supprimé et remplacé par des politiques strictes basées sur `get_user_org_ids(auth.uid())`. Les opérations ont été effectuées en 4 lots :

| Lot | Tables corrigées | Opération |
|:---:|:---|:---|
| 1 | `suppliers`, `purchase_orders`, `purchase_order_lines`, `purchase_receipts` | 4 politiques (SELECT, INSERT, UPDATE, DELETE) par table |
| 2 | `sales`, `sale_items`, `cash_reports` | 4 politiques par table |
| 3 | `transport_providers`, `vehicles`, `transport_routes`, `transport_needs`, `transport_bookings`, `transport_manifests`, `transport_costs`, `expenses` | 4 politiques par table |
| 4 | `partners`, `partner_contacts`, `partner_interactions`, `partnership_agreements`, `partnership_deliverables`, `partner_events`, `partner_documents` | 4 politiques par table |

**Total : 88 nouvelles politiques créées pour 22 tables.**

### Nettoyage des doublons

Les anciennes politiques dupliquées (héritées des premières versions du projet) ont été supprimées sur les tables core : `products`, `locations`, `stock`, `movements`, `events`, `checklists`, `families`, `subfamilies`. Chaque table ne conserve désormais qu'un seul jeu de 4 politiques propres.

### Correction bonus : `product_variants`

Le diagnostic Supabase a révélé que la table `product_variants` avait aussi des politiques `USING (true)`. Elles ont été remplacées par des politiques basées sur `product_id IN (SELECT id FROM products WHERE org_id IN (...))`.

---

## Urgence 2 : LiveShop — CORRIGÉE

### Actions réalisées sur Supabase

Les anciennes politiques permissives (`auth_all_*`, `anon_insert_*`, `anon_read_*`) ont été supprimées sur les 6 tables live :

| Table | Politiques créées |
|:---|:---|
| `live_orders` | `live_orders_insert_fan` (anon INSERT), `live_orders_select_fan` (anon SELECT), `live_orders_select_staff` (auth SELECT org-scoped), `live_orders_update_staff` (auth UPDATE org-scoped) |
| `live_order_items` | `live_order_items_insert_fan` (anon INSERT), `live_order_items_select_fan` (anon SELECT), `live_order_items_select_staff` (auth SELECT org-scoped) |
| `live_reactions` | `live_reactions_insert_fan` (INSERT), `live_reactions_select_fan` (SELECT) |
| `live_sessions` | `live_sessions_insert_fan` (INSERT), `live_sessions_select_fan` (SELECT) |
| `live_songs` | `live_songs_select_fan` (SELECT) |
| `live_votes` | `live_votes_insert_fan` (INSERT), `live_votes_select_fan` (SELECT) |

**Remarque :** Les politiques INSERT sur les tables live restent `WITH CHECK (true)` pour les fans anonymes — c'est intentionnel et attendu par le diagnostic Supabase (niveau WARN, pas ERROR). Les fans doivent pouvoir passer des commandes sans être authentifiés. La protection contre le spam devra être gérée par du rate limiting côté application ou via une Edge Function.

---

## Urgence 3 : Transactions Atomiques — CORRIGÉE

### Actions réalisées sur Supabase

La procédure stockée `process_sale` a été créée avec succès :

- **Type :** `SECURITY DEFINER` (s'exécute avec les droits du propriétaire, bypasse le RLS)
- **Langage :** PL/pgSQL
- **search_path :** Fixé à `public` (corrigé suite au diagnostic)
- **Fonctionnement :** Crée la vente, insère les lignes, décrémente le stock — le tout dans une seule transaction PostgreSQL. En cas d'erreur, tout est annulé automatiquement (rollback).

### Actions réalisées sur le code

Le fichier `ConcertMode.jsx` a été modifié : les ~50 lignes de logique séquentielle (3 boucles `for` avec `db.insert` et `db.update`) ont été remplacées par un appel unique à `db.rpc('process_sale', {...})`.

### Correction bonus : search_path des fonctions

Le diagnostic Supabase signalait 16 fonctions avec un `search_path` mutable. Toutes ont été corrigées avec `ALTER FUNCTION ... SET search_path = public`.

---

## Modifications poussées sur GitHub

**Commit :** `7a58625` sur la branche `main`
**Fichiers modifiés :**

| Fichier | Type | Description |
|:---|:---:|:---|
| `sql/fix-urgences-rls.sql` | Nouveau | Script de correction des politiques RLS |
| `sql/fix-urgences-liveshop.sql` | Nouveau | Script de sécurisation du LiveShop |
| `sql/fix-urgences-transactions.sql` | Nouveau | Procédure stockée `process_sale` |
| `src/components/ConcertMode.jsx` | Modifié | Remplacement de la logique séquentielle par `db.rpc()` |

---

## Diagnostic Supabase Post-Déploiement

| Niveau | Avant | Après | Détail |
|:---|:---:|:---:|:---|
| ERROR | 1 | 1 | Vue `product_depreciation` en SECURITY DEFINER (non critique, à traiter ultérieurement) |
| WARN | 22+ | 7 | 5 INSERT `WITH CHECK (true)` sur les tables live (intentionnel), 1 sur `projects` (existant), 1 leaked password protection |
| INFO | 1 | 1 | Table `project_invitations` avec RLS activé mais sans politique |

**Les 3 urgences critiques sont résolues. Aucune politique `USING (true)` ne subsiste sur les tables métier.**

---

## Prochaines Étapes Recommandées

1. **Tester l'application** : Se connecter et vérifier que les modules Achats, Ventes, Transport et ConcertMode fonctionnent normalement.
2. **Tester le LiveShop** : Passer une commande fan et vérifier qu'elle apparaît bien côté staff.
3. **Activer la protection contre les mots de passe compromis** dans les paramètres Auth de Supabase (WARN signalé par le diagnostic).
4. **Corriger la vue `product_depreciation`** : Retirer le flag SECURITY DEFINER si non nécessaire.
5. **Ajouter une politique sur `project_invitations`** : La table a le RLS activé mais aucune politique.
