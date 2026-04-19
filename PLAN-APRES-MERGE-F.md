# Plan post-merge Phase F — BackStage

**Date** : 19 avril 2026
**Etat actuel** : 6 phases majeures completes (A, B, C, D, F + audit complet)
**Branche en cours de merge** : `claude/phase-f-data-fixes`

---

# 1. ACCOMPLI — Recapitulatif

| Phase | Sujet | Fichiers | PR |
|-------|-------|----------|----|
| **A** | Securite critique (RLS, audit_logs, HIBP) | 1 SQL + Auth.jsx | merge #14 |
| **B** | Bugs runtime (role_id, race ConcertMode, data leak, db.delete) | 7 fichiers | merge #14 |
| **C** | Coherence schema (policies admin, tables dead, trigger prix) | 1 SQL | merge #14 |
| **D** | Fix bugs merge (Finance, MovementModal, registry) | 5 fichiers | merge #15 |
| **F** | Donnees + feature maj en masse | 3 fichiers + BulkProductUpdate.jsx | **en cours** |

**Bugs P0 critiques** : 13 → **0**
**Score global app** : 5.5/10 → **~8/10** apres Phase F

---

# 2. PROCHAINES ETAPES — Par priorite

## URGENT — Actions manuelles sur Supabase dashboard

**Temps estime** : 10 minutes
**Impact** : Securite + UX

Voir `GUIDE-SUPABASE-DASHBOARD.md` pour le detail.

- [ ] Activer **Leaked Password Protection** (HaveIBeenPwned)
- [ ] **Refresh Token Rotation** ON + reuse interval 10s
- [ ] **JWT expiry** : 3600s → 900s (15 min)
- [ ] **Email confirmation** : ON
- [ ] **Site URL** + Redirect URLs configures
- [ ] **3 templates email** BackStage colles (confirm-signup, reset-password, invite)

---

## PHASE E — Performance DB (recommandee apres merge F)

**Temps estime** : 2h
**Impact** : Perfs × 10-100 sur grosses requetes
**Prerequis** : Phase F mergee

### E.1 — Wrap `auth.uid()` dans 126 policies RLS (+ `auth.jwt()`)

**Probleme** : chaque policy re-evalue `auth.uid()` **ligne par ligne**. Patterns Supabase recommande `(SELECT auth.uid())` qui evalue une fois par requete.

**Approche** : Migration SQL unique qui detecte et re-ecrit toutes les policies sans perdre leur logique.

```sql
-- Pseudo-code : pour chaque policy, remplacer auth.uid() par (SELECT auth.uid())
-- Script automatise a generer
```

**Gain** : 10-100x sur les tables avec >1000 rows. Pour le merch avec 2000+ items prevus, crucial.

### E.2 — Creer 29 indexes FK manquants

Tables chaudes concernees (dans l'ordre de priorite) :
- `movements` : product_id, variant_id, from_loc, to_loc (4 indexes)
- `stock` : location_id, variant_id (2)
- `sale_items` : product_id (1)
- `event_packing` : product_id (1)
- `purchase_order_lines` : product_id (1)
- `transport_bookings` : need_id, provider_id, route_id, vehicle_id (4)
- `transport_costs` : booking_id, event_id (2)
- `transport_manifests` : booking_id, product_id (2)
- `live_order_items` : order_id, product_id (2)
- `live_sessions` : current_song_id (1)
- Autres : project_invitations.invited_by, project_members.role_id, projects.created_by, feedback.user_id, user_profiles.role_id, vehicles.provider_id, checklists.event_id, expenses.event_id (8)

**Gain** : DELETE CASCADE et JOIN plus rapides. Previent les full scans.

### E.3 — `NOT NULL` sur `org_id`

Toutes les colonnes `org_id` sont NULLABLE, sauf `project_members`. Risque de fuites si un bug insere sans org_id.

**Migration** :
1. Backfill des NULL (verifier qu'il n'y en a pas)
2. `ALTER TABLE ... ALTER COLUMN org_id SET NOT NULL`

**Deliverable** : 1 migration SQL unique

---

## PHASE G — Proprete code (optionnelle mais recommandee)

**Temps estime** : 3h
**Impact** : Maintenabilite long terme

### G.1 — Nettoyer dead code

- [ ] Supprimer `src/components/Onboarding.jsx` (importe dans App.jsx mais jamais rendu)
- [ ] Supprimer `src/components/ProjectPicker.jsx` (jamais importe)
- [ ] Fusionner les 2 ErrorBoundary (`src/components/ErrorBoundary.jsx` vs `App.jsx:LiveErrorBoundary`)
- [ ] Retirer `pg` de `package.json` devDependencies (inutile cote browser)

### G.2 — Decouper les composants > 500 lignes

| Fichier | Lignes | Action |
|---------|--------|--------|
| ProfilePage.jsx | 1214 | Split en 4-5 sous-composants (probablement utiliser `src/shared/ui/*`) |
| App.jsx | 1116 | Extraire SplashScreen, LiveErrorBoundary, TabContent |
| EventDetail.jsx | 939 | Split par onglet |
| ProductDetail.jsx | 677 | Split informations vs actions |
| MelodieWelcome.jsx | 589 | Split par etape |

### G.3 — Reorganiser `src/components/`

35 fichiers au meme niveau. Creer sous-dossiers :
```
components/
  pages/      (Board, Products, Finance, Tour, Transport...)
  modals/     (MovementModal, ProductDetail, EventDetail, CSVImport, BulkProductUpdate...)
  forms/      (Auth, MelodieWelcome...)
  shared/     (UI, ErrorBoundary...)
```

### G.4 — CSS variables au lieu d'inline styles

200+ `color: '#6366F1'` / `color: '#1E293B'` dans le code alors que `index.css` expose `--accent`, `--text-primary`, etc. Refactor pour utiliser les CSS variables.

### G.5 — Headers securite Cloudflare

Creer `public/_headers` :
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### G.6 — Tests (Vitest + RTL)

Pas de tests actuellement. Minimum viable :
- [ ] Config Vitest
- [ ] Test App (rendering, layer navigation)
- [ ] Test UI components (Modal, Confirm, Toast)
- [ ] Test useAuth hook
- [ ] Test MovementModal (validation)

---

## PHASE H — SaaS readiness (long terme, apres 10 clients)

**Temps estime** : 1-2 semaines
**Impact** : Scale multi-tenant, compliance

### H.1 — Scinder `user_details` (39 colonnes monolithiques)

Actuellement mixe :
- Identite (nom, prenom, naissance)
- Adresse
- Coordonnees bancaires sensibles (IBAN, num SS)
- Reseaux sociaux publics
- Infos entreprise (SIRET, SIREN)

Proposition :
- `user_identity` (nom, prenom, naissance, nationalite, stage_name, bio)
- `user_legal` (SIRET, SIREN, forme juridique, pole_emploi_spectacle)
- `user_banking` (IBAN, BIC, num SS) - RLS ultra strict
- `user_public_profile` (website, instagram, facebook, linkedin)

### H.2 — Types `numeric(12,2)` sur tous les prix

Actuellement : `numeric` sans precision. Risque d'arrondi flottant pour la compta francaise.

```sql
ALTER TABLE products ALTER COLUMN cost_ht TYPE numeric(12,2);
ALTER TABLE products ALTER COLUMN sell_price_ttc TYPE numeric(12,2);
-- ... pour toutes les colonnes monetaires
```

### H.3 — Abandonner les UUIDs hardcodes

- Org EK SHOP : `00000000-0000-0000-0000-000000000001`
- Locations : `a0000001-0000-0000-0000-00000000000[1-3]`

Remplacer par des UUIDs randoms via migration. Prerequis pour multi-tenant propre.

### H.4 — MFA / 2FA pour admins

Supabase supporte TOTP. Activer pour :
- Role TM, PM (admins tour)
- Users avec privileges DELETE

### H.5 — Supprimer RPCs de debug

- [ ] Retirer ou restreindre `debug_my_access()` (expose des infos sensibles)

### H.6 — Scinder le module Partenaires

Si besoin reel : creer l'UI autour des 7 tables `partners*` (droppees en Phase C car jamais branchees). Sinon, les docs sont dans le repo.

### H.7 — Reduire surface d'attaque

- [ ] Desactiver `pg_graphql` extension si non utilisee
- [ ] Audit des 25 RPCs jamais appelees (supprimer ou documenter)
- [ ] Audit des colonnes DB jamais lues (dette structurelle)

---

## ACTIONS TERRAIN EK TOUR 25 ANS

**Temps estime** : 30 min par Gio
**Impact** : App reflete la realite physique

### T.1 — Saisir le stock initial reel

Une fois Phase F mergee, 2 options :

**Option A — Via l'app** (recommandee)
- Articles → selectionne un produit → bouton Entree (vert)
- Saisie lieu = Entrepot EK Shop (Ducos) + quantite + note

**Option B — Via BulkProductUpdate en masse**
- Si besoin d'initialiser 100+ SKUs d'un coup
- On peut ajouter une colonne `stock_initial_depot_id` au template CSV

### T.2 — Saisir les prix d'achat reels

- Utilise **"Maj en masse"** (violet, visible si role admin/MM/LOG/PA/PM)
- Export template → remplit `cost_ht` depuis les factures fournisseurs
- Import → preview → valider

### T.3 — Verifier equipe

- Role assigne a chaque membre ?
- Modules actifs coherents ?
- Profils completés (photo, bio, contact) ?

---

# 3. ORDRE RECOMMANDE

```
AUJOURD'HUI
├── Merger PR Phase F (1 clic)
├── Actions Supabase dashboard (10 min)
└── Test app sur mobile avec vrai compte

CETTE SEMAINE
├── T.1/T.2 : Stock + prix reels (30 min)
├── Phase E : Performance DB (2h)
└── Verifier tournee visible correctement

AVANT LA TOURNEE (mars 2026)
├── Phase G.1 (dead code + fusion ErrorBoundary) — 30 min
├── Phase G.5 (CSP headers) — 20 min
└── Tests manuels end-to-end sur chaque module merch

APRES LA TOURNEE
├── Phase G.2/G.3 (decoupage + reorganisation)
├── Phase G.6 (tests automatises)
└── Phase H.3/H.5 (preparation SaaS)

QUAND >10 CLIENTS SAAS
├── Phase H.1 (split user_details)
├── Phase H.2 (numeric(12,2))
├── Phase H.4 (MFA admins)
└── Phase H.7 (audit surface attaque)
```

---

# 4. REPARTITION EFFORT

| Priorite | Temps | Valeur |
|----------|-------|--------|
| Actions dashboard Supabase | 10 min | Haute (securite compliance) |
| Phase E (perf DB) | 2h | Haute (scale) |
| Actions terrain (T.1/T.2) | 30 min | Haute (app utilisable reellement) |
| Phase G.1 (dead code) | 30 min | Moyenne |
| Phase G.5 (CSP headers) | 20 min | Moyenne |
| Phase G.2 (decoupage) | 2h | Moyenne (long terme) |
| Phase G.6 (tests) | 4h | Moyenne |
| Phase H (SaaS) | 1-2 sem | Basse (apres product-market fit) |

**Total pour etre "production-ready perfect"** : ~5h de code + 40 min d'actions manuelles

---

# 5. BLOQUANTS EVENTUELS

Aucun bloquant technique identifie pour le lancement tournee.

Points d'attention :
- **Stock initial** doit etre saisi sinon toutes les alertes/forecasts mentent
- **Actions dashboard Supabase** (HIBP, rotation) doivent etre faites pour securite prod
- **Test sur mobile** avec vrai compte avant le premier concert (Arobase deja passe)

---

**Documents de reference** :
- `AUDIT-COMPLET-v9.3.md` — Audit initial 4 domaines
- `AUDIT-POST-MERGE-v10.md` — Audit post-merge
- `BACKSTAGE-WMS-MERCH.md` — Process metier WMS merch
- `GUIDE-SUPABASE-DASHBOARD.md` — Actions manuelles dashboard
- `CHANGELOG-v9.2.md` — Historique versions
- `TEST-UX-v9.2.md` — Rapport test UX
- `PLAN-APRES-MERGE-F.md` — **ce document**
