# STAGE STOCK — BLUEPRINT v11
## Le modèle cible complet

**Date :** 13 mars 2026
**Auteur :** Claude, Chef de projet
**Pour :** Giovanni Foy, EK SHOP

---

## 1. VISION

Stage Stock est le premier WMS mobile-first conçu pour les professionnels du spectacle vivant. Il gère le merch, le matériel technique et les consommables — avec une conformité comptable française native.

L'application a **3 couches** distinctes :

```
┌─────────────────────────────────────────────────────┐
│  COUCHE 1 — VITRINE (public)                        │
│  Landing page + Inscription/Connexion               │
│  → NE PAS TOUCHER                                   │
└──────────────────────┬──────────────────────────────┘
                       │ login
┌──────────────────────▼──────────────────────────────┐
│  COUCHE 2 — MON ESPACE (personnel)                  │
│  Le hub du professionnel du spectacle               │
│                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐ │
│  │Dashboard│ │Mon      │ │Mon      │ │Mes       │ │
│  │perso    │ │profil   │ │matos    │ │projets   │ │
│  └─────────┘ └─────────┘ └─────────┘ └──────────┘ │
│  ┌─────────┐ ┌─────────┐                           │
│  │Mon      │ │Mes      │                           │
│  │calendrier│ │finances │                           │
│  └─────────┘ └─────────┘                           │
└──────────────────────┬──────────────────────────────┘
                       │ clic sur un projet
┌──────────────────────▼──────────────────────────────┐
│  COUCHE 3 — LE PROJET (collaboratif)                │
│  L'espace de travail partagé d'une tournée/prod     │
│                                                     │
│  Board │ Tournée │ Articles │ Dépôts │ Stock        │
│  Équipe │ Finance │ Alertes │ Forecast │ Settings   │
│                                                     │
│  [← Retour à Mon Espace]                           │
└─────────────────────────────────────────────────────┘
```

---

## 2. COUCHE 1 — VITRINE

### Ce qui existe ✅
- Landing page avec features, pricing, CTA "Commencer gratuitement"
- Page Auth (connexion email/password + création de compte)
- CGU et RGPD

### Statut : TERMINÉ — NE PAS TOUCHER

---

## 3. COUCHE 2 — MON ESPACE (le hub personnel)

### Ce qui existe ❌
- Rien. Après le login, l'utilisateur tombe sur le ProjectPicker, puis directement dans un projet.
- Le profil est une modale minimaliste, pas un vrai espace.
- Le CDC Profil Enrichi (user_details) est rédigé mais pas implémenté.

### Ce qu'il faut construire

#### 3.1 Dashboard personnel (page d'accueil après login)

Le cockpit du professionnel. En un coup d'œil, tout ce qui le concerne.

**Sections :**

1. **Carte de bienvenue**
   - Prénom, photo/avatar, rôle principal
   - Badge "Profil complété à X%" avec lien vers Mon profil
   - Dernière connexion

2. **Mes projets en cours** (cards cliquables)
   - Pour chaque projet : nom, rôle dans le projet, prochaine date, alerte (stock bas, checklist incomplète)
   - Bouton "Créer un projet" / "Rejoindre un projet"

3. **Prochaines dates** (tous projets confondus)
   - Timeline des 5 prochaines dates, triées par date
   - Pour chaque : nom événement, projet, lieu, format, J-X
   - Clic → fiche concert dans le projet

4. **Mon matériel** (aperçu)
   - Top 5 de mon matériel personnel (état, lieu actuel)
   - Alertes : matériel en mauvais état, prêté, en retard
   - Lien → page complète Mon matériel

5. **Notifications / Alertes**
   - Invitations projet en attente
   - Alertes stock sur mes projets
   - Checklists non terminées qui me sont assignées

6. **Raccourcis rapides**
   - Scanner un code-barres
   - Nouveau mouvement rapide
   - Voir mes exports

#### 3.2 Mon profil

Page plein écran (pas une modale).

**Données :**
- Type de compte : Personne physique / Personne morale (switch)
- Personne physique : prénom, nom, nom de scène, date de naissance, n° sécu (masqué), statut (intermittent/auto-entrepreneur/salarié/bénévole), compétences (tags), bio
- Personne morale : raison sociale, forme juridique, SIREN, SIRET, n° TVA, capital, représentant légal
- Commun : téléphone, adresse, IBAN (masqué), BIC, site web, réseaux sociaux

**Table Supabase :** `user_details` (séparée de `user_profiles`)
- CDC complet déjà rédigé : `CDC-PROFIL-ENRICHI-v11.md`

#### 3.3 Mon matériel

Inventaire personnel du professionnel — indépendant des projets.

**Concept :** Un ingénieur son possède ses propres micros, ses propres câbles. Ce matériel peut être "prêté" à un projet (affecté temporairement), mais il lui appartient. Quand le projet est fini, le matériel revient chez lui.

**Données :**
- Liste du matériel personnel (nom, catégorie, sous-catégorie, état, valeur, date d'achat, lieu actuel)
- Pour chaque item : "Disponible" / "Affecté au projet X" / "En prêt à Y"
- Historique des affectations
- Valeur totale du parc personnel
- Amortissement personnel (conformité FR)

**Table Supabase :** `personal_equipment` (nouvelle)
- user_id (owner), name, sku, category, sub_category, state, purchase_date, purchase_price, current_location, assigned_project_id (nullable), notes

#### 3.4 Mes projets

Liste de tous les projets auxquels l'utilisateur participe.

**Pour chaque projet :**
- Nom, description, rôle, date de création
- Statut : actif / archivé / en préparation
- Nombre de membres
- Prochaine date
- Clic → entre dans le projet (Couche 3)

**Actions :**
- Créer un nouveau projet
- Rejoindre un projet (via code QR ou invitation)
- Archiver un projet
- Quitter un projet

#### 3.5 Mon calendrier

Vue calendrier de TOUTES les dates, tous projets confondus.

**Affichage :**
- Vue mois (grille) avec pastilles colorées par projet
- Vue liste (timeline) avec filtres par projet
- Clic sur une date → fiche concert du projet correspondant

#### 3.6 Mes finances

Aperçu financier personnel.

**Contenu :**
- Valeur totale de mon matériel
- Amortissements en cours
- Exports comptables (CSV pour l'expert-comptable)
- Historique des ventes auxquelles j'ai participé (si vendeur merch)

**Note :** Cette section est un placeholder pour la v11. Le contenu détaillé sera défini après les premiers retours terrain.

---

## 4. COUCHE 3 — LE PROJET

### Ce qui existe

| Module | Fichier | Lignes | Statut |
|--------|---------|--------|--------|
| Board | Board.jsx | 384 | ✅ Riche, personnalisé par rôle |
| Tournée | Tour.jsx + EventDetail.jsx | 360 + 785 | ✅ Calendrier + fiches concert 5 sections |
| Articles | Products.jsx + ProductDetail.jsx | 368 + 677 | ✅ Catalogue + fiches détaillées |
| Dépôts | Depots.jsx | 249 | ⚠️ Liste OK, pas de fiche détaillée |
| Stock | Stocks.jsx | 258 | ✅ Multi-lieux, collapsible |
| Équipe | Equipe.jsx | 249 | ✅ Membres, rôles, invitation |
| Finance | Finance.jsx | 297 | ✅ Amortissement linéaire FR |
| Alertes | Alerts.jsx | 157 | ✅ Détection auto sous-seuil |
| Forecast | Forecast.jsx | 446 | ✅ Projections par format/territoire |
| Settings | Settings.jsx | 157 | ✅ Toggle modules (bug fixé) |
| Scanner | Scanner.jsx | 330 | ✅ Code-barres via caméra |
| Mouvements | Movements.jsx + MovementModal.jsx | 218 + 167 | ✅ Entrées/sorties/transferts |
| Checklists | Checklists.jsx | 362 | ✅ Interactives, par événement |
| Packing | PackingList.jsx | 359 | ✅ Automatique par rôle |
| Transport | Transport.jsx | 579 | ✅ Logistique inter-îles |

### Problème d'affichage des onglets

Les modules Articles, Dépôts, Tournée **existent dans le code** mais ne s'affichent pas chez Gio. Cause : localStorage corrompu (bug fixé dans commits a96a983 et cdccacf).

**Fix :** Console F12 → `localStorage.removeItem('stage_stock_modules')` → recharger la page.

### Analyse des fiches détaillées

#### Fiche Article (ProductDetail.jsx — 677 lignes) ✅ COMPLÈTE
- Informations générales : nom, SKU, catégorie, sous-catégorie, unité, image/emoji
- Prix de vente, seuil de réappro
- Stock par lieu (avec quantités par variante : S, M, L, XL, XXL)
- État matériel (Neuf/Bon/Usé/À réparer/HS)
- Amortissement linéaire FR (date d'achat, valeur, durée, VNC)
- Péremption (pour consommables)
- Historique des mouvements du produit
- Actions : modifier, supprimer (avec confirmation)

#### Fiche Concert (EventDetail.jsx — 785 lignes) ✅ COMPLÈTE
- **Section Résumé** : lieu, date, format, capacité, territoire, transport inter-îles
- **Section Équipe** : effectif par rôle, packing progress par personne
- **Section Checklist** : items cochables en temps réel par catégorie, barre de progression, ajout d'items
- **Section Packing** : liste du matériel à transférer par catégorie, adapté au format du concert
- **Section Prévisions** : 3 scénarios (prudent/réaliste/optimiste), projection stock avant/après, alerte rupture, CA prévisionnel

#### Fiche Dépôt ❌ MANQUANTE
- Aujourd'hui : juste une liste de dépôts avec nom, type, icône, couleur
- **Il faut créer DepotDetail.jsx** avec :
  - Informations : nom, type (fixe/mobile/éphémère/temporaire), adresse, responsable
  - Inventaire du dépôt : tous les produits stockés ici, par catégorie
  - Historique des mouvements (entrées/sorties) de ce dépôt
  - Valeur totale du stock dans ce dépôt
  - Alertes spécifiques (produits sous seuil dans ce dépôt)

---

## 5. PLAN DE TRAVAIL STRUCTURÉ

### Phase A — Stabilisation (maintenant → 20 mars)

| # | Tâche | Effort | Priorité |
|---|-------|--------|----------|
| A1 | Vérifier que le fix localStorage est déployé et que TOUS les onglets s'affichent | 5 min | CRITIQUE |
| A2 | Nettoyer les doublons produits en base (176 signalés) | 1h | HAUTE |
| A3 | Tester l'app complète avec Yannick en conditions réelles | 2h | CRITIQUE |

### Phase B — Espace personnel / Couche 2 (20 mars → 15 avril)

| # | Tâche | Effort | Priorité |
|---|-------|--------|----------|
| B1 | SQL : créer table `user_details` (CDC existant) | 30 min | HAUTE |
| B2 | SQL : créer table `personal_equipment` | 30 min | MOYENNE |
| B3 | Composant : `PersonalDashboard.jsx` (page d'accueil post-login) | 2 jours | HAUTE |
| B4 | Composant : `ProfilePage.jsx` (profil enrichi plein écran) | 1 jour | HAUTE |
| B5 | Composant : `MyProjects.jsx` (liste projets + actions) | 1 jour | HAUTE |
| B6 | Composant : `MyEquipment.jsx` (matériel personnel) | 1 jour | MOYENNE |
| B7 | Composant : `MyCalendar.jsx` (dates tous projets) | 1 jour | MOYENNE |
| B8 | Modifier `App.jsx` : ajouter la navigation Couche 2 ↔ Couche 3 | 1 jour | HAUTE |

### Phase C — Enrichissement projet / Couche 3 (15 avril → 15 mai)

| # | Tâche | Effort | Priorité |
|---|-------|--------|----------|
| C1 | Composant : `DepotDetail.jsx` (fiche dépôt complète) | 1 jour | HAUTE |
| C2 | Résultats réels post-concert dans EventDetail | 3h | HAUTE |
| C3 | Dashboard analytics projet (tendances, top ventes) | 1 jour | MOYENNE |
| C4 | Mode Concert (POS) avec variantes — vérifier qu'il fonctionne | 3h | HAUTE |

### Phase D — Commercial (mai → juillet)

| # | Tâche | Effort | Priorité |
|---|-------|--------|----------|
| D1 | Multi-tenant : isolation par org_id sur toutes les tables | 2 jours | HAUTE |
| D2 | Rôles/permissions granulaires (admin/manager/vendeur) | 1 jour | HAUTE |
| D3 | Onboarding guidé pour nouveaux utilisateurs | 1 jour | MOYENNE |
| D4 | Stripe : abonnement Pro/Team | 2 jours | HAUTE |
| D5 | Mode offline avec queue de sync | 3 jours | MOYENNE |

---

## 6. NAVIGATION CIBLE

### Navigation Couche 2 (Mon Espace)
Bottom tab bar avec 4 onglets :
- 🏠 Accueil (dashboard perso)
- 📁 Projets (liste)
- 📅 Calendrier (toutes dates)
- 👤 Profil

Le matériel et les finances sont accessibles depuis le dashboard ou le profil.

### Navigation Couche 3 (Projet)
Header avec : nom du projet + bouton "← Mon Espace"
Bottom tab bar dynamique selon les modules activés (système existant de registry.js) :
- 📊 Board
- 🎵 Tournée
- 📦 Articles
- 🏬 Dépôts
- 📋 Stock
- + autres modules activables (Équipe, Finance, Alertes, Forecast, Scanner, Settings)

### Transition entre couches
- Couche 2 → Couche 3 : clic sur une card projet dans "Mes projets" ou "Dashboard perso"
- Couche 3 → Couche 2 : bouton "← Mon Espace" dans le header du projet
- Le projet sélectionné est stocké dans le state global (pas dans l'URL pour l'instant)

---

## 7. TABLES SUPABASE — ÉTAT ET CIBLE

### Tables existantes ✅
`products`, `locations`, `stock`, `movements`, `events`, `checklists`, `stock_variants`, `sales`, `families`, `subfamilies`, `user_profiles`, `projects`, `project_members`

### Tables à créer
- `user_details` — profil enrichi personnel (CDC existant)
- `personal_equipment` — matériel personnel (indépendant des projets)

### Tables existantes à modifier
- Aucune modification structurelle prévue — les nouvelles tables sont additives

---

## 8. RÈGLES — RAPPEL

### Non négociables
- Un seul fichier SQL par livraison, idempotent
- `npm run build` doit passer avant tout commit
- Chaque requête Supabase dans try/catch individuel
- Entiers uniquement pour les quantités
- Données sensibles (IBAN, n°SS) masquées par défaut
- Conformité comptable française sur tout ce qui touche à la finance

### Design
- Palette pastel clair, PAS de mode sombre
- Font Nunito, cards 18px borderRadius, ombres douces
- Bottom sheet modals, bottom tab bar fixe
- Mobile-first (Gio travaille depuis son Android)

### Penser SaaS
- Chaque feature doit être générique (pas hardcodée EK)
- Penser multi-tenant à chaque nouvelle table
- Un nouveau client doit pouvoir utiliser Stage Stock seul en 2 minutes

---

## 9. COMMENT UTILISER CE DOCUMENT

Ce blueprint est la référence unique de ce que Stage Stock doit devenir. Il remplace les versions précédentes du cahier des charges sur les aspects architecture et vision.

**Pour Claude Code dans Codespace :**
1. Copie ce fichier à la racine du projet
2. Lance `claude` et dis : "Lis STAGE-STOCK-BLUEPRINT-v11.md et implémente la Phase [A/B/C]"
3. Claude Code connaît le contexte via CLAUDE.md + ce blueprint

**Pour Gio :**
- Les phases sont dans l'ordre de priorité
- Chaque tâche a un effort estimé réaliste
- Les décisions validées (merch, design, stack) ne sont pas remises en question ici

---

*Fin du blueprint — Version 11 — 13 mars 2026*
*Rédigé par Claude, Chef de Projet Stage Stock*
