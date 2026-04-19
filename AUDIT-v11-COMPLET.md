# AUDIT COMPLET BackStage v11 — Post 5 PRs mergees

**Date** : 19 avril 2026
**Commit main** : `07cc7ad` (Merge PR #18 phase-g-cleanup-security)
**Methodologie** : 4 audits paralleles (repo, schema DB, qualite donnees, mapping frontend-backend)

---

# RESUME EXECUTIF

## Score global : **7.5 / 10**

| Domaine | Score | Tendance |
|---------|-------|----------|
| **Schema Supabase** | **8.5/10** | +2 points vs v10 (Phase E) |
| **Coherence FE/BE** | **7/10** | -1 (2 bugs critiques decouverts) |
| **Qualite donnees** | **5.5/10** | Stable (donnees terrain manquantes) |
| **Structure repo** | **6/10** | +1 (cleanup + CSP headers) |

## 2 NOUVEAUX BUGS CRITIQUES decouverts

Malgre toutes les phases, **2 bugs** ont ete manques :

### Bug N1 — ProductDetail.jsx : colonne inexistante
**5 occurrences** de `product.selling_price` dans `ProductDetail.jsx` (lignes 95, 237, 238, 505, 507, 508).
La colonne **n'existe pas** en DB. Les champs `sell_price_ttc` et `sale_price` existent.
**Consequence** : prix de vente JAMAIS affiche dans le detail produit (silencieusement casse).

### Bug N2 — RPC `undo_movement` : colonnes DB inexistantes
Le body de la RPC utilise `v_mov.location_id`, `v_mov.to_location`, `v_mov.from_location`.
Les vraies colonnes sont `from_loc`, `to_loc`.
**Consequence** : toute tentative d'undo mouvement echoue en SQL error.
Heureusement le frontend utilise le fallback (upsert direct) donc pas d'impact UX immediat.

---

# 1. SCHEMA SUPABASE (8.5/10)

## Etat post-Phase E

| Metrique | Valeur | Statut |
|----------|--------|--------|
| Tables publiques | 42 | OK (etait 54 avant cleanup) |
| Vues | 1 (`product_depreciation` avec `security_invoker`) | OK |
| RPC functions | 28 | OK |
| Triggers custom | 1 (`trg_sync_product_prices`) | OK |
| Indexes custom | 95 | OK (+30 FK en Phase E) |
| Policies RLS | 141 | 100% scopees, 0 `auth.uid()` non-wrap |
| Extensions | 6 (pgcrypto, uuid-ossp, etc.) | OK |
| Advisors SECURITY | 1 WARN (HIBP) | OK (action manuelle dashboard) |
| Advisors PERFORMANCE | 72 INFO `unused_index` | Normal en pre-prod |

## Points forts

- **RLS exemplaire** : 100% des tables protegees, toutes les policies utilisent `(SELECT auth.uid())`
- **FK indexees** a 100%
- **`org_id NOT NULL`** sur 28 tables multi-tenant (garde-fou contre fuites)
- **SECURITY DEFINER + search_path fige** sur les 28 RPCs
- **Trigger sync prix** actif
- **audit_logs** existe avec RLS correcte

## Dette residuelle

### HIGH — Conformite comptabilite FR
**28 colonnes `numeric` sans precision** dans les tables financieres :
- `expenses.amount`, `sales.total_amount`, `sale_items.unit_price/line_total`
- `purchase_orders.total_ht/total_ttc/tva_rate`
- `purchase_order_lines.unit_price_ht/line_total_ht`
- `user_income.amount`, `live_orders.total`, `live_order_items.unit_price`

**Risque** : arrondis flottants, non-conformite expert-comptable.
**Fix** : `ALTER COLUMN ... TYPE numeric(12,2)` sur les colonnes monetaires.

### MEDIUM — Integrite
- `stock.quantity` NULLABLE mais CHECK `>= 0` → incoherent
- `expenses.date`, `transport_costs.date`, `user_income.date` NULLABLE → probleme comptable
- `live_order_items.quantity` NULLABLE
- `project_id` nullable sur 8 tables (families, locations, movements, product_variants, products, project_members, stock, subfamilies)
- `project_members.project_id` FK en NO ACTION au lieu de CASCADE

### LOW
- 2 indexes dupliques : `idx_projects_invite_code` (couvert par UNIQUE), `idx_user_details_user_id` (idem)
- 23 RPCs `search_path=public` mais pas `public, pg_temp` (hardening optionnel)
- Leaked Password Protection a activer manuellement

---

# 2. COHERENCE FRONTEND <-> BACKEND (7/10)

## RPC calls

| RPC | Frontend | DB | Match |
|-----|----------|-----|-------|
| `move_stock` | 9 params | 9 params | OK (Phase D fix) |
| `process_sale` | appele dans ConcertMode | OK | OK |
| `create_project` | 4 points d'appel | OK | OK |
| `generate_packing_list` | PackingList.jsx | OK | OK |
| `undo_movement` | Movements.jsx fallback | **RPC BUGGY** | **KO (Bug N2)** |
| `invite_member` | AccessManager | OK (fixe Phase C) | OK |

## Tables referencees

Toutes les 42 tables DB sont correctement mappees au code.

## Colonnes — BUGS

### Bug N1 : ProductDetail.jsx `selling_price`

```jsx
// Ligne 95 (fallback OK, mais selling_price jamais defini)
const prixUnit = product.selling_price || product.cost_ht || 25

// Ligne 237-238 (jamais affiche car .selling_price undefined)
{product.selling_price != null && product.selling_price > 0 && (
  <InfoRow label="Prix de vente" value={`${product.selling_price.toFixed(2)} €`} />
)}

// Ligne 505-508 (idem)
{product.selling_price > 0 && (
  <>
    <InfoRow label="Prix de vente" value={`${product.selling_price.toFixed(2)} €`} />
    <InfoRow label="Marge unitaire" value={...} />
  </>
)}
```

**Fix** : remplacer `product.selling_price` par `(product.sell_price_ttc ?? product.sale_price)`.

### Bug N2 : RPC undo_movement

```sql
-- Body actuel (bugge)
v_mov.location_id    -- colonne INEXISTANTE
v_mov.to_location    -- colonne INEXISTANTE (vraie : to_loc)
v_mov.from_location  -- colonne INEXISTANTE (vraie : from_loc)
```

**Fix** : recreer la RPC avec les bons noms.

## Autres observations

- 24 RPCs DB jamais appelees depuis le frontend (dette technique)
- `audit_logs` table creee mais aucun `logAction()` branche → 0 entree
- Bouton Delete produit visible pour non-admins (RLS bloque mais UI confuse)
- 3 colonnes prix qui se chevauchent : `sale_price`, `sell_price_ttc`, `selling_price` (inexistante)

---

# 3. QUALITE DONNEES (5.5/10)

## Donnees en base

| Table | Rows | Note |
|-------|------|------|
| organizations | 1 | EK SHOP |
| projects | 1 | EK TOUR 25 ANS |
| events | 23 | OK |
| products | 17 | |
| product_variants | 12 | Incomplet |
| sales | 2 | OK |
| sale_items | 16 | OK |
| stock | 0 | Pre-prod |
| movements | 0 | Pre-prod |
| audit_logs | **0** | Jamais alimente |

## Problemes critiques (contradictions Phase F)

### P0 — Products non rattaches
**0/17 produits** ont :
- `subfamily_id` (hierarchie WMS cassee)
- `project_id` (multi-tenant cassee)

**Fix** : UPDATE massif pour rattacher au projet EK TOUR + assigner les subfamily.

### P0 — User profiles incomplets
- **7/11 auth.users sans user_profiles** (onboarding non complete)
- **0/4 profils** avec `profile_completed=true`
- **5/5 project_members.display_name NULL** (contredit Phase F)

### P0 — Prix par defaut a remplacer
- **13/17 produits** : `cost_ht = 1.00` (defaut Phase F)
- **4/17 produits** : `sell_price_ttc = 2.00` (defaut Phase F)

Seuls les t-shirts EK25 ont des vrais prix (5€, 4.90€, 3.90€).

### P1 — Events Terminés sans CA
**4/6 events passes** ont `statut='Terminé'` mais pas de `ca_reel`/`ventes_reelles` :
- Arobase 2 (21/03)
- Awarak (08/04)
- Le Studio (09/04)
- Atelier Bougie (18/04)

### P1 — Capacite manquante
**8/15 events futurs** sans capacite (SXM, TDH, Guadeloupe Impro, Paris Concerence, Paris Canal 93, Cayenne Concerence, SLM Guyane, Casino Gosier).

### P1 — Suppliers sans email
**8/8 suppliers** sans `contact_email` → module Achats inutilisable.

### P2 — Incoherences metier
- e.sy Kennenga (artiste) a le role **Tour Manager** au lieu d'Artiste
- Sale ARO-20MAR : `items_count=14` mais `sum(qty)=13` (ecart de 1)
- 2 ventes sans `sold_by` (qui a fait la vente ?)

### P3 — Residus test
- UUIDs hardcodes : 1 org + 3 locations + 1 user (placeholder yvann.clio)

---

# 4. STRUCTURE REPO (6/10)

## Changements post-PR #18

| Element | Etat post-merge |
|---------|-----------------|
| `LiveErrorBoundary` | Extrait dans `ErrorBoundary.jsx`, importe par App.jsx |
| `Onboarding.jsx`, `ProjectPicker.jsx` | Supprimes (par main) |
| `pg` devDep | Retire (par main) |
| `public/_headers` | **Nouveau** : CSP + HSTS + X-Frame-Options + cache |
| `package.json` | 2 deps, 2 devDeps (propre) |

## Fichiers > 500 lignes (inchanges)

| Fichier | Lignes |
|---------|--------|
| **ProfilePage.jsx** | **1214** |
| App.jsx | ~1115 |
| EventDetail.jsx | 939 |
| ProductDetail.jsx | 677 |
| MelodieWelcome.jsx | 589 |
| Transport.jsx | 579 |
| Board.jsx | 569 |
| ConcertMode.jsx | 554 |
| Finance.jsx | 533 |
| PackingList.jsx | 527 |
| Tour.jsx | 505 |

## Design system

- **60+ variables CSS definies** dans `index.css`
- **0 utilisation** de `var(--)` dans le JSX
- **~2000 inline styles** `style={{}}` vs ~400 `className`
- **1400+ couleurs hardcodees** (#1E293B, #6366F1, #16A34A, etc.)

**Opportunite** : migrer 50% vers CSS classes pour reduire bundle + faciliter dark mode.

## Tests
- **0 test unitaire / integration** (aucun .test.js ou .spec.js)

## Docs racine
- `CLAUDE.md` a jour
- 3 docs `vXX.md` obsoletes (v11, v12)
- 2 `.docx` archives
- Notre `AUDIT-POST-MERGE-v10.md`, `PLAN-APRES-MERGE-F.md`, etc. (coherents)

---

# 5. PLAN D'ACTION PRIORISE

## URGENT — avant la tournee (~2h)

### Code (30 min)
1. **Fix ProductDetail.jsx** : `selling_price` → `sell_price_ttc` ou `sale_price` (5 occurrences)
2. **Fix RPC undo_movement** : corriger noms de colonnes en DB

### Donnees (1h30 — par toi via Maj en masse)
3. **Rattacher 17 produits** au `project_id` EK TOUR + assigner `subfamily_id`
4. **Remplacer les 17 prix par defaut** (1€/2€) par vrais prix
5. **Remplir capacite** pour 8 events futurs
6. **Saisir ca_reel** pour 4 events Termines

### Dashboard Supabase (10 min)
7. Activer HIBP (leaked password protection)
8. Refresh token rotation + JWT expiry 900s
9. Email confirmation ON
10. Templates email BackStage colles

---

## IMPORTANT — avant 20 clients SaaS

### Schema (Phase H candidate — 2h)
11. `numeric(12,2)` sur 28 colonnes monetaires
12. `NOT NULL` sur `stock.quantity`, dates charges
13. `project_id NOT NULL` sur 8 tables (necessite backfill)
14. Drop 2 indexes dupliques

### Code (3-4h)
15. Decouper `ProfilePage.jsx` (1214L) en 4-5 sous-composants
16. Extraire routing de `App.jsx`
17. Migrer 50% des inline styles vers CSS classes
18. Brancher `logAction()` dans les mutations (actuellement audit_logs vide)

### Donnees (par Gio)
19. Compleer les 7 user_profiles manquants
20. Remplir emails des 8 suppliers
21. Corriger role e.sy Kennenga (TM → Artiste)

---

## LONG TERME (Phase H complete)

- Tests automatises (Vitest + RTL, 20 tests critiques)
- Scinder `user_details` (39 colonnes monolithiques → identite/legal/banking/public)
- Code splitting par route
- UUIDs hardcodes → randoms
- MFA admins
- Retirer `debug_my_access()` en prod

---

# 6. SCORE DETAILLE PAR DOMAINE

| Domaine | Avant audit | v10 (apres initial) | v11 (maintenant) | Cible |
|---------|-------------|---------------------|------------------|-------|
| **Securite** | 4/10 | 8/10 | **9/10** | 10/10 |
| **Performance DB** | 4/10 | 5/10 | **9/10** | 9/10 |
| **Schema** | 5/10 | 7/10 | **8.5/10** | 9.5/10 |
| **Coherence FE/BE** | 4/10 | 6/10 | **7/10** | 9/10 |
| **Qualite donnees** | 3/10 | 5/10 | **5.5/10** | 8/10 |
| **Structure code** | 5/10 | 6/10 | **6/10** | 8/10 |
| **Tests** | 0/10 | 0/10 | **0/10** | 7/10 |
| **Documentation** | 4/10 | 7/10 | **8/10** | 9/10 |

---

# 7. BILAN DES 5 PRs

| PR | Phase | Impact reel confirme |
|----|-------|---------------------|
| #14 | A/B/C | Securite RLS OK, bugs B.2 fix Finance partiel (il restait `selling_price` non detecte) |
| #15 | D | Fix Finance autres cols OK, move_stock signature OK |
| #16 | F | 4 project_members rattaches OK, territoire Guyane OK, mais **display_name PAS remplis** (agent 3) |
| #17 | E | RLS perf OK, 30 indexes OK, org_id NOT NULL OK |
| #18 | G | LiveErrorBoundary extrait OK, `_headers` OK |

**Observation** : Phase F avait dit "user_profiles.display_name remplis" mais l'agent 3 a trouve 5/5 project_members sans display_name. C'est normal si on distingue `user_profiles.display_name` (rempli par auto update depuis user_details) de `project_members.display_name` (autre colonne sur autre table, non touchee).

---

# 8. CONCLUSION

L'app BackStage est **en bon etat structurel** post 5 PRs :
- Securite solide (0 P0, RLS exemplaire)
- Performance DB optimisee (auth.uid wrappe, FK indexees)
- Schema coherent

**Mais** il reste :
- **2 bugs critiques** non detectes precedemment (ProductDetail selling_price, RPC undo_movement)
- **Donnees terrain tres incompletes** (produits orphelins, users sans profils, prix par defaut)
- **Dette technique** (ProfilePage monstre, inline styles, 0 tests)

**Pour EK TOUR 25 ANS** : 2h de fixes (Phase I proposee ci-dessous) + actions dashboard Supabase + saisie terrain = **app reellement prete**.

**Pour SaaS commercial** : refactoring Phase H (6-8h) + tests.

---

**Documents de reference** :
- `AUDIT-v11-COMPLET.md` (ce document)
- `AUDIT-POST-MERGE-v10.md` (audit precedent)
- `PLAN-APRES-MERGE-F.md` (roadmap)
- `GUIDE-SUPABASE-DASHBOARD.md` (actions manuelles)
