# AUDIT COMPLET POST-MERGE — BackStage v10

**Date** : 19 avril 2026
**Scope** : Main post-merge PR #12 + #14
**Methodologie** : 4 audits paralleles (repo structure, Supabase schema, Supabase data, frontend-backend mapping)

---

## VERDICT GLOBAL : **5.5 / 10**

L'app est **fonctionnelle pour la demo** mais souffre de **3 bugs CRITIQUES introduits par le merge** + une dette technique importante. Non-ready pour le SaaS commercial en l'etat.

---

# 1. ETAT PAR DOMAINE

| Domaine | Score | Etat |
|---------|-------|------|
| **Structure repo** | 6/10 | Bonne archi, mais components/ en chaos + dead code |
| **Schema Supabase** | 6.5/10 | Bien organise mais 3 dettes techniques majeures |
| **Qualite donnees** | 5.5/10 | DB desynchronisee du terrain (stock=0, 77% produits sans prix) |
| **Frontend <-> Backend** | **4/10** | **3 modules casses silencieusement** |

---

# 2. BUGS CRITIQUES INTRODUITS PAR LE MERGE

## Bug #1 — Finance.jsx casse (colonnes FR reintroduites)

**Statut** : **CRITIQUE — module silencieusement casse en prod**

Notre Phase B avait fixe `Finance.jsx` pour utiliser `cost_ht`, `cumulative_depreciation`, etc. Mais le merge strategy Option C n'a pas porte ce fix (fichier commun). Resultat :

```jsx
// src/components/Finance.jsx (main actuel)
totalBrut = ... d.prix_achat_ht        // n'existe pas, retourne 0
totalAmorti = ... d.amortissement_cumule // n'existe pas, retourne 0
totalNet = ... d.valeur_nette            // n'existe pas, retourne 0
// Lignes 27, 30-32, 38, 428, 438, 442, 448
```

**Effet** : Le module Finance affiche tout a 0, aucun message d'erreur.

---

## Bug #2 — ConcertMode.jsx reference table supprimee

**Statut** : **CRITIQUE — les cash reports echouent silencieusement**

Notre Phase C a supprime la table `cash_reports` (vide, declaree dans registry mais pas utilisee a l'epoque). Mais main a ajoute depuis un flow de cash report via `ConcertMode.jsx:193` qui fait `db.insert('cash_reports', {...})`.

**Effet** : Tentative d'insert sur une table inexistante. Probablement erreur 404 ou RLS violation silencieuse.

---

## Bug #3 — Achats.jsx autofill prix casse

**Statut** : **BLOQUANT POUR ACHATS**

```jsx
// src/components/Achats.jsx:432
if (p.prix_achat_ht) updateLine(i, 'unitPrice', String(p.prix_achat_ht))
```

Colonne `prix_achat_ht` n'existe pas. Quand on cree un BC et qu'on selectionne un article, le prix ne s'auto-remplit jamais. Mais notre fix B-2 visait seulement Finance, pas Achats.

---

## Bug #4 — RPC `move_stock` signature mismatch

**Statut** : **CRITIQUE — tous les mouvements stock peuvent echouer**

Le frontend appelle :
```js
db.rpc('move_stock', { p_product_id, p_location_id, p_delta })  // 3 params
```

Mais la RPC attend :
```sql
move_stock(p_product_id uuid, p_location_id uuid, p_variant_id uuid,
           p_quantity int, p_type text, p_from_location uuid,
           p_to_location uuid, p_note text, p_user_id uuid)  -- 9 params
```

**Effet** : Tous les `db.rpc('move_stock', ...)` peuvent planter. Heureusement il y a souvent un fallback upsert, mais c'est une dette depuis l'origine.

---

## Bug #5 — Registry declare tables supprimees

**Statut** : MOYEN

`src/modules/registry.js` declare encore :
- `cash_reports` (supprimee)
- `purchase_receipts` (supprimee)

**Effet** : Au chargement du module Achats ou Ventes, tentative de `safe('cash_reports', ...)` qui echoue. `safe()` catch l'erreur, mais log console polue.

---

# 3. SCHEMA SUPABASE — 3 DETTES MAJEURES

## Dette 1 — 126 policies RLS non-performantes

Toutes les policies utilisent `auth.uid()` directement au lieu de `(SELECT auth.uid())`. Re-evalue par ligne au lieu d'une fois par requete.

**Impact** : performance 10-100x plus lente quand tables atteignent plusieurs milliers de rows.

**Fix** : migration unique qui replace partout `auth.uid()` par `(SELECT auth.uid())` dans les RLS.

---

## Dette 2 — 29 foreign keys sans index

Tables chaudes critiques :
- `movements` : product_id, variant_id, from_loc, to_loc (4/6 FK sans index)
- `stock` : location_id, variant_id
- `sale_items` : product_id
- `purchase_order_lines` : product_id
- `event_packing` : product_id
- `transport_bookings` : need_id, provider_id, route_id, vehicle_id

**Impact** : DELETE CASCADE fait des full scans. Inserts/updates OK pour le moment mais explosera en charge.

---

## Dette 3 — `org_id` nullable partout

Toutes les colonnes `org_id` sont NULLABLE. Seul `project_members.org_id` est NOT NULL.

**Impact** : bug applicatif peut inserer une row sans org_id. RLS sur `org_id IN (get_my_org_ids())` **n'attrape pas NULL** (fuite potentielle si autre policy plus permissive).

**Verification actuelle** : 0 orphelin NULL — donc pas d'incident actif, mais garde-fou manque.

---

# 4. DONNEES SUPABASE — ETAT ACTUEL

## KPIs donnees

| Metrique | Etat |
|----------|------|
| Orgs | 1 (EK SHOP) |
| Projects | 1 (EK TOUR 25 ANS) |
| Products | 17 |
| Product_variants | 12 |
| Events | 23 |
| Stock rows | **0** |
| Movements | **0** |
| Sales | 2 (59 items vendus) |
| Sale_items | 16 |

## Problemes donnees

### P0 — Stock=0 mais ventes existent
La base indique 0 stock, mais 2 ventes avec 16 items ont ete enregistrees (59 unites vendues). La base est **deconnectee du terrain**. Tout module stock/forecast ment.

### P0 — 4 project_members sans project_id
Yvann.Clio@gmail.com (invite) + 3 users actifs (Emilie, MUSTAF, Esykennenga) ont `project_id = NULL`. Probablement l'inscription via QR code a oublie le rattachement projet.

### P1 — 77% des produits sans cost_ht
13 produits sur 17 ont `cost_ht = 0`. **Impossible de calculer marge/rentabilite.**

### P1 — 100% user_profiles sans display_name/email
Les 4 profils ont display_name NULL. L'UI fallback sur email ou "Membre", mais c'est degrade.

### P1 — 100% invitations sans email
Les 3 `project_invitations` ont `email = NULL`. Impossible de relancer.

### P1 — Territoire "Guyane" non reconnu
3 events sont en Guyane mais l'enum metier accepte seulement Martinique/Guadeloupe/France/International. Forecast retombe sur multiplicateur par defaut.

### P2 — Statuts events manquants
6 events passes n'ont pas de statut `Termine`. Utilises : `Confirme`, `En cours`, `Salle reserve`, `Pas commence`.

### P2 — Live session fantome
1 `live_sessions` creee le 15/03, jamais lancee (status=waiting, qr_code_url=NULL). A purger.

### P3 — UUIDs hardcodes (blocant multi-tenant)
- Org EK SHOP : `00000000-0000-0000-0000-000000000001`
- Locations : `a0000001-0000-0000-0000-00000000000[1-3]`

Quand on voudra ajouter d'autres tenants, ces patterns seront confusants.

---

# 5. STRUCTURE REPO — POINTS FAIBLES

## Dead code et fichiers orphelins

| Fichier | Statut |
|---------|--------|
| `src/components/Onboarding.jsx` | Importe dans App.jsx mais jamais rendu (MelodieWelcome a la place) |
| `src/components/ProjectPicker.jsx` | Jamais importe nulle part |
| `src/components/ErrorBoundary.jsx` vs `App.jsx:LiveErrorBoundary` | Duplication de 2 error boundaries quasi-identiques |
| `package.json` : `pg` devDep | Inutile cote browser (notre fix n'a pas ete retenu au merge) |

## Composants trop gros (> 500 lignes)

| Fichier | Lignes |
|---------|--------|
| ProfilePage.jsx | **1214** (critique) |
| App.jsx | 1116 |
| EventDetail.jsx | 939 |
| ProductDetail.jsx | 677 |
| MelodieWelcome.jsx | 589 |
| Transport.jsx | 579 |
| Board.jsx | 569 |
| ConcertMode.jsx | 554 |
| Finance.jsx | 532 |
| PackingList.jsx | 527 |
| Tour.jsx | 505 |

## Inline styles vs design system

Inline styles `style={{}}` partout alors que `index.css` expose des CSS variables (--text-primary, --bg-surface, --accent). Maintenance dispersee, couleurs hardcodees en 200+ endroits.

## Organisation components/

**35 fichiers .jsx au meme niveau**, aucun sous-dossier. Devrait etre :
```
components/
  pages/      (Board, Products, Finance...)
  modals/     (MovementModal, ProductDetail, EventDetail...)
  forms/      (Auth, CSVImport...)
  shared/     (UI, ErrorBoundary...)
```

## Documentation dispersee

A la racine :
- `CLAUDE.md` (a jour)
- `README.md`, `SETUP.md` (minimaux)
- `CAHIER-DES-CHARGES-COMPLET.md` (29K)
- `CDC-PROFIL-ENRICHI-v11.md` (12K)
- `STAGE-STOCK-ARCHITECTURE-v12.md` (15K)
- `STAGE-STOCK-BLUEPRINT-v11.md` (16K)
- 2 fichiers `.docx` obsoletes
- 1 `.xlsx` legacy
- Notre `AUDIT-COMPLET-v9.3.md`, `CHANGELOG-v9.2.md`, `BACKSTAGE-WMS-MERCH.md`, `GUIDE-SUPABASE-DASHBOARD.md`, `TEST-UX-v9.2.md`

**= 12+ fichiers doc, pas d'index principal qui oriente.**

## Pas de tests

**0 test unitaire ou d'integration.** Pas de Jest/Vitest/Playwright. Refactors risques.

## SQL folder chaos

21 fichiers SQL avec nommage inconsistent : `create-*`, `fix-*`, `cleanup-*`, `diagnostic-*`, `seed-*`, `phase-*`. Pas de README expliquant l'ordre ou le statut (applied/pending).

---

# 6. POINTS FORTS (a preserver)

- **Architecture 3 couches** (landing → personal → project) bien pensee
- **Module registry** declaratif avec dependencies transitives
- **RLS activee sur 42 tables** (pas une seule exposee)
- **UUIDs partout**, types coherents
- **Naming DB** : snake_case uniforme
- **`audit_logs`** existe maintenant
- **Trigger sync sale_price <-> sell_price_ttc** fonctionne
- **28 RPCs SECURITY DEFINER** avec search_path fige
- **CSS variables** design system defini (mais sous-utilise)
- **PWA** installable
- **Code splitting** lazy loading actif
- **Context hooks** (useAuth, useProject) propres (apporte par main)

---

# 7. PLAN D'ACTION PRIORISE

## URGENT — Corriger les 5 bugs du merge (Phase D)

1. **Finance.jsx** : remplacer colonnes FR par colonnes DB reelles (cost_ht, cumulative_depreciation, net_book_value, useful_life_months, purchase_date)
2. **Achats.jsx:432** : `p.prix_achat_ht` -> `p.cost_ht`
3. **ConcertMode.jsx:193** : remplacer `db.insert('cash_reports', ...)` par insert dans une table existante (probablement `expenses` ou creer une vraie table `cash_reports`)
4. **registry.js** : retirer `cash_reports` et `purchase_receipts` des declarations
5. **MovementModal.jsx** : aligner l'appel `move_stock` sur la signature DB OU creer un alias RPC `move_stock_simple(product_id, location_id, delta)`

## IMPORTANT — Performance DB (Phase E)

6. Migration : wrapper tous les `auth.uid()` en `(SELECT auth.uid())` dans les RLS (+126 policies)
7. Creer les 29 indexes manquants sur FK
8. `NOT NULL` sur `org_id` apres backfill (verifier d'abord qu'il n'y a pas de NULL)

## IMPORTANT — Donnees (Phase F)

9. Rattacher les 4 `project_members` NULL au projet EK TOUR 25 ANS
10. Remplir `products.cost_ht` pour les 13 produits a 0
11. Saisir le stock reel initial (entrees correspondant aux 59 ventes deja enregistrees)
12. Fixer les 4 produits a `sell_price_ttc = 0` (ou desactiver)
13. Remplir display_name + email sur les 4 user_profiles
14. Remplir email sur les 3 project_invitations
15. Ajouter "Guyane" au territoire ou reclasser en France

## PROPRETE — Code (Phase G)

16. Supprimer `Onboarding.jsx` + `ProjectPicker.jsx` (dead code)
17. Fusionner les 2 ErrorBoundary
18. Retirer `pg` de package.json
19. Decouper ProfilePage.jsx (1214 lignes) en sous-composants
20. Organiser `components/` en sous-dossiers (pages/modals/forms/shared)
21. Remplacer inline colors par CSS variables
22. Ajouter `public/_headers` (CSP, HSTS)

## LONG TERME — Scale SaaS (Phase H)

23. Ajouter tests (Vitest + React Testing Library)
24. Scinder `user_details` (identity/legal/banking/public)
25. `numeric(12,2)` sur tous les prix
26. Remplacer UUIDs hardcodes par des randoms
27. Retirer `debug_my_access()` RPC
28. Activer HIBP + refresh rotation (dashboard Supabase — voir GUIDE-SUPABASE-DASHBOARD.md)

---

# 8. RECOMMANDATION IMMEDIATE

**Ne pas lancer la tournee EK en production avant d'avoir fixe les 5 bugs du merge** (Phase D).

Sinon :
- Finance reste silencieusement casse (0 affichee)
- ConcertMode ne peut pas enregistrer les rapports de caisse
- Achats casse l'autofill (friction utilisateur)
- Mouvements stock peuvent planter (signature RPC)

**Temps estime Phase D : 1h de code + 30 min de verif.**

Apres : l'app sera **vraiment production-ready** pour EK TOUR 25 ANS.

---

**Fichiers de reference** :
- `AUDIT-POST-MERGE-v10.md` (ce doc)
- `AUDIT-COMPLET-v9.3.md` (audit anterieur)
- `GUIDE-SUPABASE-DASHBOARD.md` (actions dashboard)
- `BACKSTAGE-WMS-MERCH.md` (process metier WMS)
