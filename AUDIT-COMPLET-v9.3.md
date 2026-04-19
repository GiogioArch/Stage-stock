# Audit Complet — BackStage v9.3

**Date** : 18 avril 2026
**Branche** : `claude/busy-lederberg`
**Scope** : Frontend (40 .jsx) + Supabase backend (54 tables + RPCs + vues + RLS + auth)
**Methodologie** : 4 audits paralleles (DB, frontend-backend link, logique frontend, securite)

---

# RESUME EXECUTIF

| Severite | Nb | Theme principal |
|----------|----|-----------------|
| **P0 CRITIQUE** | 13 | Securite RLS + corruption donnees + crash runtime |
| **P1 IMPORTANT** | 18 | Incoherences schema, bugs logique, donnees sensibles |
| **P2 MOYEN** | 15 | Dette technique, dead code, hygiene |
| **P3 MINEUR** | 12 | Polish, best practices |

**Verdict** : L'app fonctionne mais **NE PEUT PAS etre mise en production** en l'etat a cause des failles RLS critiques (tout utilisateur authentifie peut lire/modifier/supprimer toutes les orgs et tous les projets de tous les tenants).

---

# P0 — CRITIQUES (a corriger avant meme le lancement merch)

## P0-1. RLS `projects` : tout utilisateur peut supprimer tous les projets
**Impact** : Multi-tenant totalement casse. Un user peut DELETE n'importe quel projet.
**Policies concernees** : `projects_delete USING(true)`, `projects_update USING(true)`, `projects_insert WITH CHECK(true)`
**Fix** : migration SQL pour restreindre aux orgs du user.

## P0-2. RLS `organizations` : toutes les orgs lisibles par tous les users
**Impact** : Fuite de donnees tenants (noms, settings, billing)
**Fix** : `USING (id IN (get_user_org_ids(auth.uid())))`

## P0-3. RLS `user_profiles` : emails/PII de tous les users accessibles
**Impact** : Fuite PII, risque phishing cible
**Fix** : restreindre a profil personnel + membres meme org

## P0-4. Tables `live_*` : inserts anonymes sans validation
**Impact** : Spam infini, fausses ventes enregistrees, corruption KPIs
**Tables** : live_sessions, live_orders, live_order_items, live_votes, live_reactions
**Fix** : valider l'event_id + calculer prix server-side via RPC

## P0-5. 2 vues `SECURITY DEFINER` bypassent RLS
**Vues** : `product_depreciation`, `data_integrity_check`
**Fix** : `ALTER VIEW ... SET (security_invoker = true);`

## P0-6. `project_invitations` leak : invitations pending visibles par tous
**Policy** : `invitations_select_by_token USING ((accepted_at IS NULL) OR ...)`
**Impact** : Tous les users voient tous les tokens d'invitation pending
**Fix** : restreindre au user destinataire uniquement

## P0-7. Role ID stocke en CODE au lieu d'UUID (onboarding casse)
**Fichiers** : `MelodieWelcome.jsx:116,123,345,352`, `Onboarding.jsx:79,86`
**Bug** : upsert avec `role_id: 'TM'` (code string) alors que la colonne est UUID
**Impact** : `App.jsx:306` fait `.find(r => r.id === profile.role_id)` → undefined → user force a repasser par RolePicker
**Fix** : lookup UUID depuis code avant upsert

## P0-8. ConcertMode : race condition sur les ventes (lost updates)
**Fichier** : `ConcertMode.jsx:141-155`
**Bug** : `processSale` lit stock du closure, calcule `newQty = qty - item.qty`, ecrit avec `db.update()`
**Impact** : Deux telephones vendent le meme produit → la deuxieme vente ecrase la premiere, stock drift silencieux pendant concert
**Fix** : utiliser `move_stock` RPC avec delta negatif (atomique)

## P0-9. Data leak entre projets au switch
**Fichier** : `App.jsx:441-447`
**Bug** : `enterProject()` ne reset pas `data`. Pendant le chargement du nouveau projet, l'UI affiche les donnees du projet precedent filtrees par le nouveau role
**Impact** : Fuite d'info multi-tenant, bug UX
**Fix** : reset `data` a la forme vide avant `loadAll`

## P0-10. `db.delete()` ne gere pas le 401 (token expire)
**Fichier** : `supabase.js:193-199`
**Bug** : `return res.ok` sans retry sur 401. Si token expire, delete retourne `false` silencieusement
**Impact** : Appelants (Stocks.jsx, MyProjects.jsx) croient au succes
**Fix** : ajouter retry sur 401 comme les autres methodes

## P0-11. `Finance.jsx` references des colonnes qui n'existent pas
**Fichier** : `Finance.jsx:27-33,40,430,440,450`
**Bug** : Lit `prix_achat_ht`, `amortissement_cumule`, `valeur_nette`, `duree_amort`, `date_acquisition` — aucune n'existe (DB utilise `cost_ht`, `cumulative_depreciation`, `net_book_value`, etc.)
**Impact** : Module Finance complet silencieusement casse (tout a 0)
**Fix** : remplacer les noms de colonnes

## P0-12. `LiveShop.jsx` insert dans colonnes inexistantes
**Fichier** : `live/LiveShop.jsx:71,80`
**Bug** : Insert `fan_id` dans `live_orders` (colonne n'existe pas), `variant_id` dans `live_order_items` (colonne s'appelle `variant`)
**Impact** : Toutes les commandes live echouent avec 400
**Fix** : utiliser les vrais noms de colonnes

## P0-13. `audit_logs` table n'existe pas
**Fichier** : `src/lib/auditLog.js` insert dans une table inexistante
**Impact** : Aucun audit trail cree. Tous les calls `logAction()` dans MovementModal, Movements (undo), Products, Tour, Achats — **silencieusement inutiles**
**Fix** : creer la table + RLS (SQL deja commente dans le fichier)

---

# P1 — IMPORTANTS (avant production pro)

## P1-1. Incoherence prix de vente : 3 colonnes, 3 usages
| Colonne | Ou lu/ecrit | Statut |
|---------|-------------|--------|
| `sell_price_ttc` | Products.jsx (ecrit + lit) | Le bon |
| `sale_price` | ConcertMode, DepotDetail, EventDetail (lus) | Ancien |
| `selling_price` | ProductDetail.jsx (lu, fallback) | **N'existe pas** |

**Impact** : Prix saisi dans Products **invisible** en ConcertMode, Depot, EventDetail

## P1-2. Policies destructives ne verifient pas `is_admin`
**Tables** : `products_delete`, `locations_delete`, `events_delete`, `purchase_orders_delete`
**Bug** : Ne verifient que `org_id IN (...)`, pas le role admin
**Impact** : Un membre non-admin peut supprimer tous les produits de son org

## P1-3. `Achats.jsx` autofill prix casse
**Fichier** : `Achats.jsx:457`
**Bug** : Lit `p.prix_achat_ht` (n'existe pas, c'est `cost_ht`)
**Impact** : L'autofill du prix unitaire dans une nouvelle ligne de BC ne fonctionne jamais

## P1-4. Undo mouvement transfer non-atomique
**Fichier** : `Movements.jsx:92-155`
**Bug** : Si le transfer undo echoue a mi-chemin (RPC 1 OK, RPC 2 KO), l'original est marque annule mais le stock est desynchronise
**Fix** : utiliser la RPC `undo_movement` qui existe deja en DB mais n'est jamais appelee

## P1-5. 24 RPCs DB definies jamais utilisees par le frontend
Notables :
- `process_sale` existe → ConcertMode fait des inserts manuels (non-atomique)
- `undo_movement` existe → Movements.jsx reimplemente client-side
- `invite_member` / `accept_invitation` existent → AccessManager utilise placeholder UUID hack
- `delete_product_atomic` / `delete_location_atomic` existent → jamais appeles

## P1-6. MovementModal : transfer peut depasser le stock disponible
**Fichier** : `MovementModal.jsx:40`
**Bug** : La validation `qty > availableStock` ne teste que `type === 'out'`, pas `transfer`
**Impact** : User peut transferer 100 unites depuis un lieu qui en a 5

## P1-7. Race condition sur `loadAll` si l'utilisateur switche de projet vite
**Fichier** : `App.jsx:361-363`
**Bug** : Pas d'AbortController. Projet A → B rapide → les fetchs de A arrivent apres ceux de B → B est ecrase par A
**Fix** : AbortController ou ref `currentOrgId` gate

## P1-8. Tokens dans `localStorage` (XSS → takeover)
**Fichier** : `supabase.js:34-50`
**Impact** : Toute XSS exfiltre access + refresh token → full account takeover
**Mitigation** : CSP strict, activer rotation refresh token dans Supabase

## P1-9. Password policy faible (6 chars)
**Fichier** : `Auth.jsx:40`
**Impact** : Brute-force trivial, leaked-password check desactive
**Fix** : 8 chars min + activer HIBP dans Supabase

## P1-10. Pas de session expiry / logout auto
**Impact** : Telephone perdu = acces perpetuel
**Fix** : idle timer 30 min + ecran "session expired"

## P1-11. 2 t-shirts avec marge negative
- `EK-TSE-NOI-4` (T-shirt Enfant 4 ans) : cost 3.90€, vente 0€
- `EK-TSE-NOI-6` (T-shirt Enfant 6 ans) : cost 3.90€, vente 0€
**Impact** : Perte automatique dans Finance

## P1-12. 12 sale_items avec product_id NULL (donnees demo)
**Impact** : ~310€ de CA simule non-tracable
**Fix** : purger les demo-sales

## P1-13. Index unique `stock_product_location_unique` bloque les variantes
**Impact** : Des que stock.variant_id est utilise, les inserts echouent
**Fix** : DROP, garder seulement l'index avec variant_id

## P1-14. MelodieWelcome silent-catch chains cachent toutes les erreurs
**Fichier** : `MelodieWelcome.jsx:99-127, 316-356`
**Impact** : Si upsert + insert echouent → user voit rien, localStorage marque `completed`, mais `user_details` n'a jamais ete cree

## P1-15. Smart-refresh ne skip pas quand un formulaire est en edition
**Fichier** : `App.jsx:367-390`
**Impact** : User saisit une commande → retour sur l'onglet → reload ecrase les data

## P1-16. AddOrderForm : pas de rollback si lignes echouent
**Fichier** : `Achats.jsx:411-426`
**Impact** : BC header cree mais 0 lignes → orphan visible dans la liste

## P1-17. Functions `SECURITY DEFINER` avec search_path mutable
**Fonctions** : `delete_product_atomic`, `delete_location_atomic`
**Impact** : Privilege escalation potentielle via schema shadowing
**Fix** : `SET search_path = public, pg_temp`

## P1-18. `fetchWithRetry` edge case : succes puis offline → erreur fausse
**Fichier** : `supabase.js:122-132`
**Impact** : Message d'erreur confus pour l'utilisateur

---

# P2 — MOYENS (dette technique, dead code)

## P2-1. 12 tables DB **dead** (jamais utilisees par frontend)
- `partners`, `partner_contacts`, `partner_documents`, `partner_events`, `partner_interactions`, `partnership_agreements`, `partnership_deliverables` (7 tables — module Partenaires jamais branche)
- `event_tasks`, `event_task_templates`
- `role_permissions`, `project_invitations`, `data_integrity_check`
- `cash_reports` (declare dans registry mais UI inexistante)
- `purchase_receipts` (declare mais Achats.jsx n'insere jamais)

## P2-2. `dangerouslySetInnerHTML` sur barcode SVG
**Fichier** : `ProductDetail.jsx:281`
**Analyse** : `escapeXml` dans qrcode.js n'echappe pas les apostrophes
**Fix** : ajouter `.replace(/'/g, '&#39;')` + CHECK constraint sur `products.sku`

## P2-3. Columns DB inutilisees
- `products.variants` (text, non utilise — normalise via `product_variants`)
- `products.image` (URL form ne persiste jamais)
- `organizations.logo`, `organizations.settings` (jamais lus)
- `events.budget`, `events.ticket_revenue`, `events.sponsor_revenue`
- `user_profiles.job_title`, `.company`, `.phone` (dupliques avec `user_details`)

## P2-4. Role codes hardcodes en plusieurs endroits
**Fichiers** : `Onboarding.jsx:105`, `PackingList.jsx:35`, `App.jsx:47`, `Board.jsx:49`
**Fix** : centraliser dans `RolePicker.jsx`

## P2-5. Duplicate indexes sur `purchase_orders.org_id`
**Indexes** : `idx_purchase_orders_org` + `idx_purchase_orders_org_id` identiques
**Fix** : DROP un des deux

## P2-6. Scanner : `ps.location_id` dans key qui n'existe jamais
**Fichier** : `Scanner.jsx:270`
**Impact** : fallback `stock-${i}` toujours utilise (code mort)

## P2-7. Dead import `Checklists` dans `App.jsx:21`
Lazy-loaded mais jamais utilise en JSX

## P2-8. Auth flow sans form wrapper
**Fichier** : `Auth.jsx`
**Bug** : Entree dans le champ email ne declenche pas submit (seulement password)

## P2-9. Feedback localStorage croit indefiniment
**Fichier** : `Feedback.jsx:36-40`
**Fix** : cap a `slice(-50)`

## P2-10. Modal focus trap incomplet
**Fichier** : `UI.jsx:21-22`
**Impact** : Tab s'echappe de la modal vers la page

## P2-11. Pas de rate-limiting auth endpoints
**Impact** : Credential stuffing possible
**Fix** : Cloudflare Worker ou Supabase Rate Limits dashboard

## P2-12. Pas de CSP/HSTS headers Cloudflare
**Fix** : ajouter `public/_headers`

## P2-13. Refresh token rotation a verifier dans Supabase dashboard
**Setting** : Auth → Refresh Token Rotation : ON + Reuse Interval : 10s

## P2-14. `ProductDetail` fallback `selling_price` (inexistant)
**Fichier** : `ProductDetail.jsx:103, 265-266, 576-579`

## P2-15. Movement date filter ignore les timezones
**Fichier** : `Movements.jsx:53`

---

# P3 — MINEURS (polish)

Incluent : naming localStorage keys, 2FA non disponible, Permissions-Policy manquant, pas de form element dans Auth, key instable sur cart ConcertMode, etc. Details dans l'audit brut.

---

# PLAN DE CORRECTION RECOMMANDE

## Phase A — Securite critique (a faire AVANT tout autre chose)
1. Migration SQL pour RLS : `projects`, `organizations`, `user_profiles`, `project_invitations`
2. Creer la table `audit_logs` (+ RLS)
3. Securiser les tables `live_*` (valider event_id, calculer prix server-side)
4. `ALTER VIEW ... SET (security_invoker = true)` sur les 2 vues
5. Activer HIBP + refresh rotation dans Supabase dashboard
6. Password policy 8 chars min dans `Auth.jsx`

## Phase B — Bugs runtime critiques
7. Fix role_id UUID vs code (MelodieWelcome + Onboarding)
8. Fix Finance.jsx noms de colonnes
9. Fix LiveShop.jsx noms de colonnes
10. ConcertMode : utiliser RPC `move_stock`
11. Data leak entre projets : reset data au switch
12. db.delete 401 retry

## Phase C — Coherence schema
13. Unifier `sale_price` / `sell_price_ttc` (decider et purger)
14. Utiliser les 24 RPCs existantes (process_sale, undo_movement, invite_member, delete_product_atomic)
15. MovementModal : validation transfer
16. Supprimer les 12 tables dead + colonnes unused
17. Fix duplicate index purchase_orders

## Phase D — Hygiene
18. AbortController sur loadAll
19. Smart-refresh skip en edition
20. Fix Scanner key fallback
21. CSP headers Cloudflare

---

# DONNEES ACTUELLES (apres purge fictifs + seed EK)

| Table | Nb rows |
|-------|---------|
| organizations | 1 (EK SHOP) |
| products | 17 (16 t-shirts + quelques enfants residuels) |
| stock | 16 rows = 380 t-shirts |
| movements | 16 entrees initiales |
| events | 23 (tournee) |
| locations | 4 |
| user_details | 8 |
| project_members | 5 |
| suppliers | 8 |
| sales | 11 (demo a purger) |
| sale_items | 28 (dont 12 orphelins) |

---

**Conclusion** : BackStage a une architecture solide mais **13 bugs critiques** dont **6 failles RLS** exploitables immediatement. Ne pas merger sur `main` avant la Phase A.
