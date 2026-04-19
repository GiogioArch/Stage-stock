# Stage Stock v9.2 — Audit & Refactor Sprint

**Date** : 28 mars 2026
**Branche** : `claude/busy-lederberg` (worktree)
**Auteur** : Claude Opus 4.6 + Gio
**Build** : OK (282 KB bundle, 15+ chunks)

---

## Contexte

Audit complet du projet Stage Stock suivi de 4 phases d'ameliorations dans un worktree isole. Aucun changement n'a ete pousse sur `main` — tout est sur la branche `claude/busy-lederberg`.

---

## Phase 1 — Stabilisation (quick wins)

### 1.1 Suppression dependance inutile
- `pg` (PostgreSQL Node.js) retire de devDependencies — inutile cote browser

### 1.2 Correction des keys React (20 instances)
- 13 fichiers corriges : remplacement de `key={i}` (index) par des keys stables (id, product_id, name, etc.)
- Fichiers : Alerts, Achats, Board, ConcertMode, CSVImport, Equipe, EventDetail, Depots, LiveShop, Finance, Landing, MelodieWelcome, PackingList, ProductDetail, Scanner

### 1.3 useMemo sur filtres et calculs
- 8 fichiers optimises : Movements, Board, Alerts, Finance, Checklists, Tour, Achats, Transport
- Calculs lourds (filter/sort/reduce) wrapes dans useMemo avec les bonnes dependances

### 1.4 Parallelisation loadPersonalData
- Fichier : `App.jsx`
- 5 requetes sequentielles (user_details, gear, availability, income, events) transformees en `Promise.allSettled()`
- Impact : login plus rapide

### 1.5 Error boundaries par section
- Nouveau composant : `ModuleBoundary` dans `ErrorBoundary.jsx`
- Message d'erreur inline avec bouton "Reessayer" (sans recharger l'app)
- 4 wrappers ajoutes dans App.jsx : TabContent, Accueil, Projets, Profil
- Reset automatique quand l'utilisateur change d'onglet (resetKey)

---

## Phase 2 — Architecture

### 2.1 Decoupage ProfilePage.jsx
- Avant : 1 fichier monolithique de 1 214 lignes
- Apres : 8 fichiers dans `src/components/profile/`
  - `ProfileHelpers.jsx` — Field, FieldSelect, ReadCard, ReadRow, SensitiveRow, SaveBar, etc.
  - `IdentityTab.jsx` — Onglet identite
  - `ProTab.jsx` — Onglet professionnel
  - `ProjectsTab.jsx` — Onglet projets
  - `GearTab.jsx` — Onglet materiel
  - `CalendarTab.jsx` — Onglet calendrier/disponibilites
  - `FinancesTab.jsx` — Onglet finances
- `ProfilePage.jsx` reduit a ~175 lignes (shell avec header, avatar, tabs)

### 2.2 Context API
- Nouveau fichier : `src/contexts/AppContext.jsx`
- `AppProvider` + hook `useApp()` pour acceder a : user, userRole, isAdmin, membership, selectedOrg, showToast, loadAll
- Migre sur Board.jsx et ProfilePage.jsx avec fallback props (retrocompatible)
- Pattern : props explicites prennent priorite sur le context

### 2.3 Code splitting (lazy loading)
- 20 composants convertis en `React.lazy()` + `Suspense`
- Composants essentiels restent statiques : Auth, Scanner, MovementModal, RolePicker, Landing
- Fallback : spinner `.loader` pendant le chargement
- **Impact bundle : 500+ KB -> 282 KB (-44%)**, 15+ chunks separes

### 2.4 Smart refresh
- Avant : `setInterval(loadAll, 30000)` — polling aveugle toutes les 30s
- Apres : refresh au retour utilisateur (visibilitychange + focus) avec cooldown 30s
- Economise la bande passante, evite les requetes superposees

---

## Phase 3 — Features business

### 3.1 Generation code-barres produits
- Nouveau fichier : `src/lib/qrcode.js` — generateur Code 128B en SVG pur (0 dependance)
- Integration dans ProductDetail.jsx : section "Code-barres" avec barcode SVG + bouton Copier
- Nouveau champ `barcode` dans le formulaire produit (Products.jsx) — fallback sur SKU si vide
- Compatible avec le Scanner.jsx existant (BarcodeDetector format code_128)

### 3.2 Undo mouvement stock
- Fichier : `Movements.jsx`
- Bouton "Annuler" (icone RotateCcw) sur chaque mouvement de moins de 24h
- Confirmation avant execution (composant Confirm)
- Logique : creation d'un mouvement inverse + marquage original "[Annule]"
- Mouvements annules affiches avec opacite + texte barre
- Ajustement stock via RPC `move_stock` avec fallback upsert

### 3.3 Duplication evenement
- Fichiers : `Tour.jsx` + `EventDetail.jsx`
- Bouton Copier dans la liste des evenements (Tour) et dans le header detail (EventDetail)
- Pre-remplit le formulaire avec "Copie - " + donnees originales, date videe
- Utilise le meme EventFormModal en mode ajout avec `defaultValues`

### 3.4 Export CSV
- Nouveau fichier : `src/lib/csvExport.js`
  - BOM UTF-8 pour compatibilite Excel
  - Separateur point-virgule (defaut Excel francais)
  - Echappement guillemets/virgules/retours ligne
- Boutons export dans 3 composants :
  - Products.jsx : `produits-{date}.csv` (SKU, Nom, Categorie, Stock min, Cout HT, Code-barres)
  - Movements.jsx : `mouvements-{date}.csv` (Date, Type, Produit, Quantite, De, Vers, Note)
  - Stocks.jsx : `stock-{date}.csv` (Produit, SKU, Lieu, Quantite)

---

## Phase 4 — Qualite & Scale

### 4.1 Pagination
- **Movements** : serveur-side limit 200, bouton "Charger plus" qui charge le batch suivant via offset
- **Products** : client-side slice(0, 50), bouton "Voir plus" (+50 a chaque clic), reset au changement de filtre

### 4.2 Audit log
- Nouveau fichier : `src/lib/auditLog.js`
- Fonction `logAction(action, { userId, orgId, targetType, targetId, details })`
- Fire-and-forget (ne bloque jamais le UI)
- Integre dans : MovementModal (create), Movements (undo), Products (create/update/delete), Tour (create/update/delete)
- SQL DDL fourni en commentaire pour creer la table `audit_logs`

### 4.3 Validation formulaires
- **Products** : nom + SKU obligatoires, min_stock >= 0, cost_ht >= 0
- **MovementModal** : produit + quantite obligatoires, controle stock sortie, lieux transfert
- **Auth** : email (contient @), password (6 chars min)
- **ProfileHelpers Field** : prop `error` reusable (bordure rouge + message)
- Pattern : state `errors`, validation au submit, clear au changement

### 4.4 Accessibilite
- `htmlFor`/`id` sur tous les composants Field, FieldSelect, SensitiveField
- Modals : `role="dialog"`, `aria-modal="true"`, `aria-label`, fermeture Escape, auto-focus
- Confirm : `role="alertdialog"`, `aria-describedby`
- Bottom nav : `aria-label`, `aria-current="page"` sur onglet actif
- Skip-to-content : lien "Aller au contenu" visible au focus clavier
- CSS : classes `.sr-only` et `.sr-only-focusable` dans index.css

---

## Fichiers crees (nouveaux)

| Fichier | Role |
|---------|------|
| `src/contexts/AppContext.jsx` | Context API (user, role, org, toast) |
| `src/components/profile/ProfileHelpers.jsx` | Composants partages formulaire profil |
| `src/components/profile/IdentityTab.jsx` | Onglet identite profil |
| `src/components/profile/ProTab.jsx` | Onglet professionnel profil |
| `src/components/profile/ProjectsTab.jsx` | Onglet projets profil |
| `src/components/profile/GearTab.jsx` | Onglet materiel profil |
| `src/components/profile/CalendarTab.jsx` | Onglet calendrier profil |
| `src/components/profile/FinancesTab.jsx` | Onglet finances profil |
| `src/lib/qrcode.js` | Generateur Code 128B SVG |
| `src/lib/csvExport.js` | Export CSV (BOM, point-virgule) |
| `src/lib/auditLog.js` | Audit log fire-and-forget |

## Fichiers modifies (principaux)

| Fichier | Changements |
|---------|-------------|
| `App.jsx` | Lazy loading, Suspense, AppProvider, ModuleBoundary, smart refresh, pagination props, skip-to-content, aria nav |
| `ProfilePage.jsx` | Reduit a ~175 lignes, imports depuis profile/, useApp() |
| `Board.jsx` | useApp(), useMemo KPIs, keys stables |
| `Products.jsx` | Champ barcode, export CSV, validation, pagination client, useMemo |
| `Movements.jsx` | Undo, export CSV, pagination serveur, useMemo |
| `Stocks.jsx` | Export CSV |
| `Tour.jsx` | Duplication evenement, audit log |
| `EventDetail.jsx` | Bouton dupliquer |
| `MovementModal.jsx` | Validation, audit log |
| `Auth.jsx` | Validation email/password |
| `ErrorBoundary.jsx` | ModuleBoundary (nouveau composant) |
| `UI.jsx` | ARIA dialog, Escape close, auto-focus |
| `index.css` | .sr-only, .sr-only-focusable |
| `package.json` | Suppression pg |

---

## SQL a executer (quand pret)

```sql
-- Table audit_logs (a creer dans Supabase)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL,
  user_id uuid,
  org_id uuid,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(org_id, created_at DESC);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view org logs" ON audit_logs
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM project_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can insert logs" ON audit_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());
```

```sql
-- Colonne barcode sur products (si pas deja presente)
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode text;
```

---

## Prochaines etapes possibles

- [ ] Merger `claude/busy-lederberg` dans `main`
- [ ] Executer le SQL ci-dessus dans Supabase
- [ ] Tester visuellement chaque feature sur mobile
- [ ] Phase 5 potentielle : dark mode, multi-langue, offline complet, tests E2E

---

## Metriques

| Metrique | Avant | Apres |
|----------|-------|-------|
| Bundle principal | 500+ KB | 282 KB |
| Chunks | 1 | 15+ |
| ProfilePage.jsx | 1 214 lignes | 175 lignes |
| loadPersonalData | 5 requetes serie | 5 requetes paralleles |
| Auto-refresh | 30s polling aveugle | Focus-based + cooldown |
| Keys index | 20 instances | 0 |
| Error boundaries | 1 (global) | 5 (global + 4 sections) |
| Accessibilite htmlFor | 0 | Tous les Field |
| ARIA modals | 0 | Tous (dialog, alertdialog) |
