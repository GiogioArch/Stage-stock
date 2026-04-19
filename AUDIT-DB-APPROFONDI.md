# Audit approfondi base Supabase BackStage

**Date** : 19 avril 2026
**Projet** : `domuweiczcimqncriykk`
**Methodologie** : 8 queries SQL transversales sur tout le schema

---

# 0. METRIQUES GLOBALES

| Element | Count | Commentaire |
|---------|-------|-------------|
| Tables publiques | **43** | +1 cash_reports recreee |
| Vues | 1 | `product_depreciation` (security_invoker) |
| Fonctions RPC | **28** | Toutes `SECURITY DEFINER` sauf 1 |
| Triggers custom | **1** | `trg_sync_product_prices` |
| Indexes | **153** | dont 95 custom `idx_*` |
| RLS policies | **141** | 100% tables protegees |
| Colonnes totales | **488** | |
| Foreign Keys | **77** | |
| CHECK constraints | **173** | |
| UNIQUE constraints | **13** | |
| Extensions | 6 | pgcrypto, uuid-ossp, pg_graphql, pg_stat_statements, pgsodium, supabase_vault |

---

# 1. STRUCTURE TABLES

## Vue d'ensemble par domaine

| Domaine | Tables | Lignes vivantes |
|---------|--------|-----------------|
| **Catalogue produits** | products, product_variants, families, subfamilies, product_depreciation (vue) | 17 + 13 + 3 + 17 |
| **Stock & mouvements** | stock, movements, locations | 0 + 0 + 4 |
| **Ventes & caisse** | sales, sale_items, cash_reports | 2 + 16 + 0 |
| **Achats** | suppliers, purchase_orders, purchase_order_lines | 8 + 0 + 0 |
| **Evenements** | events, checklists, event_packing | 24 + 23 + 0 |
| **Utilisateurs** | user_profiles, user_details, user_gear, user_availability, user_income | 4 + 8 + 0 + 0 + 0 |
| **Multi-tenant** | organizations, projects, project_members, project_invitations, roles, role_permissions | 1 + 1 + 5 + 3 + 12 + 56 |
| **Live (fan webapp)** | live_sessions, live_orders, live_order_items, live_songs, live_votes, live_reactions | 0 partout sauf test initial |
| **Transport** | transport_providers, vehicles, transport_routes, transport_needs, transport_bookings, transport_costs, transport_manifests | 0 (feature non active) |
| **Divers** | expenses, feedback, audit_logs | 0 |

## Top 10 tables par taille disque

1. `products` 160 KB (17 rows, 21 colonnes)
2. `stock` 136 KB (0 rows, 7 colonnes — preparee pour volume)
3. `subfamilies` 128 KB (17 rows, 9 colonnes)
4. `project_members` 128 KB (5 rows, 14 colonnes)
5. `event_packing` 104 KB (0 rows)
6. `movements` 96 KB (0 rows, 11 colonnes)
7. `projects` 96 KB (1 row, 10 colonnes)
8. `events` 80 KB (24 rows, 24 colonnes)

## Table monolithique detectee

**`user_details` (39 colonnes)** melange infos publiques (bio, website, social_*) avec donnees sensibles (IBAN, BIC, social_security_number, SIRET). RLS uniforme sur tout = pas de granularite.

**Recommandation** : splitter en `user_identity`, `user_banking`, `user_legal`, `user_public_profile`.

---

# 2. RELATIONS ET INTEGRITE REFERENTIELLE

## FK avec ON DELETE

| Strategie | Count | Usage logique |
|-----------|-------|---------------|
| CASCADE | 24 | Hierarchies dures (events→live_*, sales→sale_items, projects→children) |
| SET NULL | 14 | References souples (products→family, bookings→vehicle) |
| NO ACTION | 39 | Protections (org_id→organizations, project_members→roles) |

## Anomalies detectees

### `project_members.project_id` FK = NO ACTION
**Risque** : si on supprime un project, les `project_members` restent orphelins (project_id invalide).
**Fix recommande** : passer en `CASCADE`.

### `cash_reports.event_id` FK = SET NULL
OK mais signifie qu'un rapport de caisse peut "perdre" son event. A documenter.

### 6 FK vers `auth.users`
- `projects.created_by`, `feedback.user_id`, `user_details.user_id`, `user_gear.user_id`, `user_availability.user_id`, `user_income.user_id`, `cash_reports.closed_by`
- Toutes en `SET NULL` ou `CASCADE` selon le cas (bien).

---

# 3. TYPES DE DONNEES

## Colonnes NUMERIC sans precision (28 occurrences)

Tables financieres concernees :
- **products** (2) : sale_price, sell_price_ttc
- **sales** (1) : total_amount
- **sale_items** (2) : unit_price, line_total
- **purchase_orders** (3) : total_ht, total_ttc, tva_rate
- **purchase_order_lines** (2) : unit_price_ht, line_total_ht
- **expenses** (1) : amount
- **user_income** (1) : amount
- **live_orders** (1) : total
- **live_order_items** (1) : unit_price
- **transport_*** (9) : cost, amount, distance_km, weight_kg, volume_m3
- **vehicles** (2) : capacity_kg, capacity_m3
- **events** (3) : ca_prevu, ca_reel, budget

**Probleme** : sans precision, PostgreSQL utilise la precision par defaut (arbitrairement grande).
**Risque** : arrondis flottants en agregation, non-conformite Expert-Comptable FR.
**Fix** : `ALTER COLUMN ... TYPE numeric(12,2)` sur toutes les colonnes monetaires.

## Colonnes avec defaut

- **products.active** `true` (bon)
- **products.min_stock** NULL (devrait etre 0 ou 5 par defaut)
- **sales.items_count** NULL (devrait etre 0)
- **audit_logs.created_at** `now()` (bon)

---

# 4. RLS POLICIES — Analyse detaillee

## Couverture par commandes

| Pattern | Tables | OK ? |
|---------|--------|------|
| 4 policies (SELECT+INSERT+UPDATE+DELETE) | 24 | Complet |
| 3 policies | 5 | Justifie si DELETE inutile (audit_logs, user_availability, user_details, user_profiles, cash_reports) |
| 2 policies | 6 | Tables catalogues (families, subfamilies) ou live fan |
| 1 policy (SELECT uniquement) | 3 | `roles`, `role_permissions`, `live_songs` — tables de reference |

## Policies `USING(true)` wide-open restantes

| Table | Policy | Justification |
|-------|--------|---------------|
| `roles` | rp_select / roles_select | Catalogue rôles partages |
| `role_permissions` | rp_select | Idem |
| `live_sessions` | live_sessions_select_fan | Fan UI publique |
| `live_songs` | live_songs_select_fan | Idem |
| `live_votes` | live_votes_select_fan | Idem |
| `live_reactions` | live_reactions_select_fan | Idem |
| `live_orders` | live_orders_select_fan | Idem |
| `live_order_items` | live_order_items_select_fan | Idem |

**Toutes justifiees.** Aucune faille.

## Performance RLS

Apres Phase E : **100% des policies utilisent `(SELECT auth.uid())`** (cache niveau requete). Zero policy avec `auth.uid()` direct.

---

# 5. FONCTIONS RPC — Analyse

## 28 fonctions totales

### Securite
| Securite | Count | Note |
|----------|-------|------|
| `SECURITY DEFINER` + `search_path hardened` (public, pg_temp) | 5 | `delete_product_atomic`, `delete_location_atomic`, `event_has_active_session`, `invite_member`, `sync_product_prices`, `undo_movement` |
| `SECURITY DEFINER` + `search_path fixed` (public) | 22 | OK, moins robuste que `pg_temp` mais fonctionnel |
| `SECURITY INVOKER` | 1 | `generate_packing_list` — intentionnel |

**Recommandation** : durcir les 22 `fixed` en `hardened` (`public, pg_temp`).

### RPC par domaine
- **Stock** : `move_stock`, `update_stock_atomic`, `undo_movement`
- **Ventes** : `process_sale`
- **Produits** : `delete_product_atomic`, `bulk_update_product_status`, `sync_product_prices` (trigger)
- **Locations** : `delete_location_atomic`
- **Projects** : `create_project`, `delete_project`, `delete_project_atomic`, `join_project`, `regenerate_invite_code`
- **Membres** : `invite_member`, `accept_invitation`, `change_member_role`, `remove_member`
- **Profils** : `complete_profile`, `get_my_profile`, `get_my_email`
- **Access** : `get_my_org_ids`, `get_user_org_ids`, `get_my_projects`, `get_project_members`, `is_org_admin`
- **Divers** : `event_has_active_session`, `generate_packing_list`, `debug_my_access`

### RPCs suspects

1. **`debug_my_access()`** : expose des infos sensibles. A retirer en prod.
2. **`generate_packing_list()`** : la seule en INVOKER — intentionnel, mais documenter.
3. **24 RPCs jamais appelees** par le frontend (dette technique). Particulierement :
   - `process_sale` — ConcertMode fait des inserts directs a la place (non-atomique)
   - `undo_movement` — fallback frontend mais pas appele en primary
   - `bulk_update_product_status` — pourrait remplacer du code frontend
   - `change_member_role` — pas cable dans AccessManager
   - `get_my_*` — potentiellement utile

---

# 6. TRIGGERS

**Un seul trigger custom** : `trg_sync_product_prices` BEFORE UPDATE sur `products`.
Synchronise `sale_price <-> sell_price_ttc` bidirectionnellement.

**Manquants potentiels** :
- Trigger `updated_at` sur tables a `updated_at` (projects, products, etc.)
- Trigger audit_log automatique sur mutations critiques (movements, sales, purchase_orders)
- Trigger `check_sale_totals` pour valider `items_count` et `total_amount`

---

# 7. INDEXES — Analyse detaillee

## Top 10 tables par nombre d'indexes

| Table | Indexes | Taille |
|-------|---------|--------|
| movements | 7 | 80 KB |
| project_members | 7 | 112 KB |
| products | 7 | 112 KB |
| stock | 7 | 112 KB |
| transport_bookings | 6 | 48 KB |
| subfamilies / projects / event_packing | 5 | 64-80 KB |

## Indexes dupliques (2 trouves)

1. **`projects.invite_code`** : `idx_projects_invite_code` + `projects_invite_code_key` (UNIQUE)
2. **`user_details.user_id`** : `idx_user_details_user_id` + `user_details_user_id_key` (UNIQUE)

**Action** : DROP des 2 indexes non-uniques (les UNIQUE suffisent).

## FK sans index

**0** — toutes indexees apres Phase E.

## Indexes inutilises

**72 INFO `unused_index`** (selon advisor). Normal en pre-prod :
- Tables vides (stock, movements, purchase_orders, transport_*)
- Les indexes `_project_id` ne servent pas tant qu'il n'y a qu'un seul projet

**A reevaluer apres 3 mois de prod reelle.**

---

# 8. CHECK CONSTRAINTS

**173 CHECK constraints** dont 19 non-triviales (enums metier) :

| Table | Constraint | Valeurs |
|-------|------------|---------|
| `feedback.mood` | `{bad, ok, good}` | |
| `live_orders.status` | `{pending, confirmed, ready, collected, cancelled}` | |
| `live_orders.payment_status` | `{unpaid, paid, refunded}` | |
| `live_sessions.status` | `{waiting, live, paused, ended}` | |
| `movements.type` | `{in, out, transfer}` | |
| `products.category` | `{merch, materiel, consommables}` | |
| `products.product_status` | `{active, inactif, stock_mort, stock_dormant, sur_stock}` | |
| `project_members.status` | `{invited, active, disabled}` | |
| `purchase_orders.status` | `{draft, sent, confirmed, shipped, received, cancelled}` | |
| `sales.payment_method` | `{cash, card, mobile, mixed, free}` | |
| `stock.quantity_non_negative` | `quantity >= 0` | |
| `user_availability.status` | `{available, unavailable, maybe, unknown}` | |
| `user_details.account_type` | `{physical, legal}` | |
| `user_details.legal_form` | `{sarl, sas, sasu, association_1901, micro_entreprise, eurl, ei}` | |
| `user_details.legal_status` | `{intermittent, auto_entrepreneur, salarie, benevole, micro_entreprise}` | |
| `user_gear.category` | `{instrument, son, lumiere, tech, scene, transport, other}` | |
| `user_gear.current_condition` | `{neuf, excellent, bon, use, hs}` | |
| `user_income.status` | `{pending, paid, cancelled}` | |
| `user_income.type` | `{cachet, facture, remboursement, prime, autre}` | |

**Tres bonne couverture enum.**

### CHECK manquants identifies
- `events.statut` : texte libre, devrait etre un enum (`Brouillon, Confirme, En cours, Termine, Annule`)
- `events.territoire` : texte libre, devrait etre enum (Martinique, Guadeloupe, Guyane, France, Reunion, International)
- `purchase_order_lines.unit_price_ht` : pas de `>= 0`
- `sale_items.unit_price` : pas de `>= 0`
- `expenses.amount` : pas de `>= 0`

---

# 9. QUALITE DES DONNEES

## KPIs actuels

| Metrique | Valeur | OK ? |
|----------|--------|------|
| Products rattaches au projet | 17/17 | Oui (apres Phase I) |
| Products avec subfamily | 17/17 | Oui |
| User_profiles avec display_name | 4/4 | Oui |
| User_profiles avec email | 4/4 | Oui |
| Orphelins FK (toutes tables) | 0 | Bien |
| Stock quantity < 0 | 0 | Bien |
| Movements quantity <= 0 | 0 | Bien |
| Sales total coherent avec sale_items | 100% | Bien |
| audit_logs | **0 rows** | Non branche ! |
| Stock rows | **0 rows** | Pre-prod |
| Movements rows | **0 rows** | Pre-prod |

## Problemes persistants

### P0 — Bloquants metier
1. **2 produits avec marge negative** (cost_ht > sell_price_ttc) — probablement T-shirts Enfants 4/6 ans a 3.90€ cost et 0€ vente
2. **13 produits a `cost_ht = 1€`** (defaut Phase F a remplacer)
3. **4 produits a `sell_price_ttc = 2€`** (defaut Phase F)
4. **4 produits** avec `sale_price != sell_price_ttc` (desynchro trigger ?)

### P1 — Donnees incompletes
5. **8 events sans capacite** (forecast casse)
6. **5 events `Terminé` sans ca_reel** (bilan CA tournee faux)
7. **5 project_members sans display_name**
8. **8 suppliers sans contact_email** (module Achats inutilisable)
9. **2 ventes sans sold_by** (tracabilite caisse)
10. **1 sale avec items_count != sum(qty)** (ARO-20MAR : 14 vs 13)

### P2 — Proprete
11. **UUIDs hardcodes** : org `00000000-...`, 3 locations `a0000001-...`, 1 user `00000000...` (pre-signup)
12. **5 statuts events distincts** avec orthographe incoherente (`Terminé` vs `Termine`)
13. **audit_logs vide** : `logAction()` cote frontend pas branche sur les mutations

---

# 10. BUGS METIER IDENTIFIES

## Sale ARO-20MAR : incoherence items_count
- `items_count = 14`
- `sum(sale_items.quantity) = 13`
- Delta = 1 unite manquante dans sale_items ou items_count trop eleve

## Trigger `sync_product_prices` partiellement efficace
- Sur UPDATE, synchronise `sale_price <-> sell_price_ttc`
- Mais **pas sur INSERT** : si on cree un produit avec juste `sell_price_ttc`, `sale_price` reste NULL
- Actuellement 4 produits avec desynchro : SKUs a reconcilier

## Statuts events texte libre
Plusieurs orthographes : `Confirmé`, `En cours`, `Pas commencé`, `Salle réservé`, `Terminé`.
Pas de CHECK constraint. Bug potentiel si le frontend compare avec une valeur litterale avec ou sans accent.

## `process_sale` RPC existe mais pas utilisee
ConcertMode fait `db.insert('sales', ...)` + `db.insert('sale_items', ...)` separement (non-atomique).
Consequence : une insertion partielle en cas d'echec = totaux fausses.

## RPC `update_stock_atomic` vs `move_stock`
2 RPCs pour manipuler le stock :
- `update_stock_atomic(p_product_id, p_location_id, p_delta)` — 3 params
- `move_stock(9 params)` — utilise partout

`update_stock_atomic` est dead code. A dropper.

---

# 11. EXTENSIONS ET CONFIG

| Extension | Installee | Utilisation |
|-----------|-----------|-------------|
| `pgcrypto` | Oui | Pour gen_random_uuid() |
| `uuid-ossp` | Oui | Alternative uuid (redondant avec pgcrypto ?) |
| `pg_graphql` | Oui | GraphQL Supabase (pas utilise frontend) |
| `pg_stat_statements` | Oui | Observabilite (bien) |
| `pgsodium` | Oui | Vault Supabase |
| `supabase_vault` | Oui | Idem |

**Recommandations** :
- Peut-on desactiver `pg_graphql` ? Surface d'attaque reduite si inutile.
- `uuid-ossp` redondant avec `pgcrypto` ? Garder un seul.

---

# 12. ADVISORS SUPABASE

## Securite : **0 ERROR / 0 WARN**
(etait 1 WARN HIBP avant, probablement active depuis le dashboard — a verifier)

## Performance : 72 INFO `unused_index`
Tous normaux (tables vides en pre-prod). A reevaluer dans 3 mois.

Zero WARN sur `auth_rls_initplan` (Phase E reussie), zero sur `unindexed_foreign_keys`, zero sur `multiple_permissive_policies`.

---

# 13. BILAN GLOBAL

## Score par domaine

| Domaine | Score | Justification |
|---------|-------|---------------|
| **Structure** | 9/10 | Domaines clairs, nommage uniforme, pas de tables orphelines |
| **Integrite relationnelle** | 8/10 | FK coherentes mais `project_members.project_id` en NO ACTION |
| **Types de donnees** | 6/10 | **28 numeric sans precision** (risque comptabilite) |
| **RLS / securite** | 9.5/10 | 100% protege, wide-open justifies, auth.uid() wrappe |
| **Fonctions RPC** | 7/10 | Solides mais 24/28 non appelees, 22 sans `pg_temp` |
| **Indexes** | 8/10 | FK 100% indexees, 2 duplicates a nettoyer |
| **CHECK constraints** | 8/10 | Bonne couverture enums, manque `events.statut`, prix >= 0 |
| **Qualite donnees** | 6/10 | 13 prix par defaut, 5 events sans CA, 8 suppliers sans email |
| **Coherence metier** | 7/10 | Trigger OK UPDATE, pas INSERT ; 1 sale incoherent |
| **Observabilite** | 5/10 | audit_logs existe mais vide (pas branche) |

## Score global : **7.5 / 10**

---

# 14. PLAN D'AMELIORATION PRIORISE

## URGENT (avant tournee)

### Qualite donnees (via Maj en masse app)
1. Remplacer 13 `cost_ht = 1€` par vrais prix fournisseur
2. Remplacer 4 `sell_price_ttc = 2€` par vrais prix
3. Saisir ca_reel pour 5 events Termine
4. Capacite pour 8 events futurs
5. Email pour 8 suppliers
6. Corriger ARO-20MAR items_count (14 → 13)

### DB migration (30 min)
7. Dropper 2 indexes dupliques (`idx_projects_invite_code`, `idx_user_details_user_id`)
8. Dropper RPC `update_stock_atomic` (dead code)
9. CHECK constraint sur `events.statut` (enum)
10. CHECK `amount >= 0` sur expenses, sale_items.unit_price, purchase_order_lines.unit_price_ht

## IMPORTANT (avant SaaS)

### Conformite comptable
11. `numeric(12,2)` sur les 28 colonnes monetaires
12. `NOT NULL` sur `expenses.date`, `user_income.date`, `transport_costs.date`
13. Trigger `check_sale_totals` : valider `total_amount` et `items_count` a l'insert

### Securite
14. Durcir 22 RPCs (`search_path = public, pg_temp`)
15. Retirer ou restreindre `debug_my_access()`
16. Activer Leaked Password Protection (HIBP) si pas fait

### Refactoring
17. Scinder `user_details` (39 colonnes) en 3-4 tables
18. Ajouter trigger `updated_at` auto sur tables concernees
19. Brancher `logAction()` frontend sur mutations critiques
20. Remplacer `uuid-ossp` par `pgcrypto` uniquement
21. `project_members.project_id` FK : NO ACTION → CASCADE

### Dette RPC
22. ConcertMode doit utiliser `process_sale` (atomique) au lieu d'inserts separes
23. Movements.jsx doit utiliser `undo_movement` RPC (deja cable en fallback, basculer en primary)
24. AccessManager doit utiliser `change_member_role` RPC

## LONG TERME

25. Evaluer desactivation `pg_graphql` si frontend n'en utilise pas
26. Remplacer UUIDs hardcodes par randoms
27. Partitioning `audit_logs` par mois quand volume depasse 1M rows

---

# 15. COMPARAISON v10 → MAINTENANT

| Element | Avant audit | Maintenant |
|---------|-------------|------------|
| Tables | 54 | **43** (cleanup 12 dead tables) |
| Indexes custom | ~64 | **95** (+31 FK Phase E) |
| Policies auth.uid() non-wrap | 127 | **0** |
| FK sans index | 30 | **0** |
| Tables `org_id` nullable | 28 | **0** |
| Orphelins FK | multiples | **0** |
| Products orphelins (no project/subfamily) | 17 | **0** |
| Advisor WARN/ERROR | ~157 | **0** |
| Score global | 5/10 | **7.5/10** |

---

# CONCLUSION

La base BackStage a **considerablement progresse** (5 → 7.5/10). Elle est :

**Pret pour la tournee EK TOUR** : oui, avec les 6 actions urgentes de qualite donnees.
**Pret pour 10 clients SaaS** : oui, apres `numeric(12,2)` et durcissement RPC.
**Pret pour 100 clients SaaS** : apres splitting `user_details`, trigger audit auto, monitoring.

Les fondations sont **solides et professionnelles**. Il reste a :
1. **Completer les donnees** (13 prix, 5 CA, 8 emails) — 30 min toi via app
2. **Durcir le schema** pour la conformite FR (numeric precision, CHECK >= 0)
3. **Brancher audit_logs** cote frontend pour avoir enfin des traces
4. **Utiliser les RPCs atomiques** existantes (process_sale, undo_movement)

Document aussi sur Notion.
