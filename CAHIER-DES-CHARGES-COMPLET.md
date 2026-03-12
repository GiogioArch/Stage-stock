# STAGE STOCK — CAHIER DES CHARGES COMPLET
## Document de sauvegarde & spécifications pour reconstruction
### Version 9.0 — 12 mars 2026

---

## 1. IDENTITÉ PROJET

### Contexte
- **Nom** : Stage Stock
- **Type** : WMS (Warehouse Management System) / PWA mobile-first
- **Client** : EK SHOP (structure commerciale de l'artiste E.sy Kennenga)
- **Tournée** : EK TOUR 25 ANS — célébration des 25 ans de carrière
- **Territoire** : Martinique & Guadeloupe (Caraïbes françaises)
- **Période** : Mars à décembre 2026
- **Développeur** : Gio (Giovanni F.)
- **Repo GitHub** : https://github.com/GiogioArch/Stage-stock.git

### Vision commerciale
Stage Stock n'est PAS un outil interne. C'est un **futur SaaS commercial** destiné aux professionnels du spectacle.
- Objectif : **20 clients payants** avant de scaler la technique
- Chaque feature doit être **générique** (pas hardcodée pour EK)
- Architecture **multi-tenant** dès le départ
- Penser commercial à chaque décision technique

### Artiste
- **E.sy Kennenga** : artiste reggae/dancehall martiniquais
- **Marque merch** : Solda Lanmou
- 25 ans de carrière en 2026
- Public cible : Martinique, Guadeloupe, diaspora caribéenne

---

## 2. STACK TECHNIQUE

### Frontend
- **React 18** + **Vite** (build tool)
- **JSX** pur (PAS de TypeScript)
- **Styles inline** (pas de CSS modules, pas de Tailwind)
- Fichier CSS unique : `src/styles/index.css`
- **Font** : Nunito (Google Fonts) — weights 400-900
- **Mobile-first** : design pensé pour téléphone Android

### Backend
- **Supabase** (PostgreSQL managé + Auth + REST API)
- Projet : `domuweiczcimqncriykk.supabase.co`
- Clé anon : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbXV3ZWljemNpbXFuY3JpeWtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTMyMTEsImV4cCI6MjA4ODQyOTIxMX0.fqkP4jYa1Q_Y6jQGDwSV_sAfQV0lkDQvgZI445Q-u30`
- Auth : email/password via Supabase Auth
- RLS (Row Level Security) activé sur toutes les tables
- REST API : PostgREST (pas de client SDK, appels fetch directs)

### Hébergement
- **Cloudflare Pages** — auto-deploy depuis GitHub branche `main`
- Build command : `npm run build`
- Output directory : `dist`
- Push sur main → build automatique → déploiement

### PWA
- `manifest.json` : standalone, portrait, theme corail #E8735A
- Service Worker (`sw.js`) :
  - Pre-cache : shell HTML, manifest, icônes
  - API Supabase : **network-first** avec fallback cache
  - Google Fonts : **cache-first**
  - Assets statiques : **cache-first**
  - Navigation HTML : **network-first**

---

## 3. ARCHITECTURE FICHIERS

```
Stage-stock/
├── CLAUDE.md                    # Règles pour Claude Code
├── CAHIER-DES-CHARGES-COMPLET.md # CE FICHIER
├── README.md
├── SETUP.md
├── index.html                   # Entry HTML (PWA meta tags, fonts)
├── package.json                 # React 18, Vite 5
├── vite.config.js               # Vite + React plugin
│
├── public/
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service Worker
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
│
├── src/
│   ├── main.jsx                 # Entry React + SW registration
│   ├── App.jsx                  # Shell principal (auth, data, nav, routing)
│   │
│   ├── lib/
│   │   └── supabase.js          # Client Supabase (auth + db + safe)
│   │
│   ├── components/
│   │   ├── Auth.jsx             # Login / inscription
│   │   ├── Board.jsx            # Dashboard personnalisé par rôle
│   │   ├── Products.jsx         # Catalogue produits (CRUD, filtres, amortissement)
│   │   ├── Stocks.jsx           # Stock multi-lieux collapsibles
│   │   ├── Movements.jsx        # Historique mouvements (filtres date/type)
│   │   ├── Alerts.jsx           # Centre notifications (stock + événements)
│   │   ├── Checklists.jsx       # Checklists par événement
│   │   ├── Scanner.jsx          # Scanner code-barres (caméra + manuel)
│   │   ├── EventDetail.jsx      # Fiche concert détaillée (6 onglets)
│   │   ├── PackingList.jsx      # Packing list auto par rôle
│   │   ├── MovementModal.jsx    # Modal entrée/sortie/transfert
│   │   ├── RolePicker.jsx       # Sélection rôle au premier login
│   │   └── UI.jsx               # Composants partagés (Modal, Toast, Badge...)
│   │
│   └── styles/
│       └── index.css            # Design system complet
│
└── sql/
    ├── seed-familles-sousfamilles.sql
    ├── create-roles-packing.sql
    ├── setup-user-profiles-rls.sql
    ├── add-depreciation-fields.sql
    ├── improve-packing-formula.sql
    ├── multi-tenant-prep.sql
    ├── fix-doublons-produits.sql
    ├── diagnostic-1-comptage.sql
    ├── diagnostic-2-doublons.sql
    └── diagnostic-3-mouvements.sql
```

---

## 4. BASE DE DONNÉES — SCHÉMA COMPLET

### Tables principales

#### `products`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| name | TEXT | Nom du produit |
| sku | TEXT | Référence unique |
| category | TEXT | merch / materiel / consommables |
| family_id | UUID FK → families | |
| subfamily_id | UUID FK → subfamilies | |
| unit | TEXT | unité (pcs, m, kg...) |
| min_stock | INT | Seuil d'alerte |
| image | TEXT | Emoji ou URL |
| variants | JSONB | Tailles, couleurs... |
| cost_ht | NUMERIC | Prix HT (pour amortissement) |
| purchase_date | DATE | Date d'achat |
| useful_life_months | INT | Durée d'amortissement |
| org_id | UUID FK → organizations | Multi-tenant |

#### `locations`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| name | TEXT | Nom du lieu |
| type | TEXT | entrepot / vehicule / salle |
| icon | TEXT | Emoji |
| color | TEXT | Couleur hex |
| org_id | UUID FK | |

#### `stock`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| product_id | UUID FK → products | |
| location_id | UUID FK → locations | |
| quantity | INT | Quantité en stock |
| org_id | UUID FK | |

#### `movements`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| product_id | UUID FK → products | |
| type | TEXT | in / out / transfer |
| quantity | INT | |
| from_loc | UUID FK → locations | Source |
| to_loc | UUID FK → locations | Destination |
| note | TEXT | Commentaire optionnel |
| created_at | TIMESTAMPTZ | |
| org_id | UUID FK | |

#### `events`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| name | TEXT | Nom de l'événement |
| lieu | TEXT | Nom de la salle |
| ville | TEXT | Ville |
| date | DATE | |
| format | TEXT | concert / sound system / impro / festival / showcase |
| capacite | INT | Jauge |
| territoire | TEXT | martinique / guadeloupe |
| transport_inter_iles | BOOLEAN | Transport entre îles |
| reappro_necessaire | BOOLEAN | |
| statut | TEXT | planifié / confirmé / terminé |
| notes | TEXT | |
| ventes_prevues | INT | Prévision ventes merch |
| ca_prevu | NUMERIC | CA prévisionnel |
| ventes_reelles | INT | Ventes réelles (post-event) |
| ca_reel | NUMERIC | CA réel |
| org_id | UUID FK | |

#### `families`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| name | TEXT | MERCH / MAT / CONSO |
| code | TEXT | Code court |
| org_id | UUID FK | |

#### `subfamilies`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| name | TEXT | |
| family_id | UUID FK → families | |
| org_id | UUID FK | |

#### `checklists`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| event_id | UUID FK → events | |
| category | TEXT | son / lumière / instruments / décor / merch / logistique / consommables |
| item | TEXT | Libellé |
| checked | BOOLEAN | |
| org_id | UUID FK | |

#### `roles`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| code | TEXT UNIQUE | TM, PM, SE, LD, BL, SM, TD, MM, LOG, SAFE, AA, PA |
| name | TEXT | Nom complet |
| description | TEXT | |
| subfamily_ids | UUID[] | Array de subfamily IDs accessibles |
| org_id | UUID FK | |

#### `event_packing`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| event_id | UUID FK → events | |
| product_id | UUID FK → products | |
| role_code | TEXT | Code rôle responsable |
| quantity_needed | INT | Quantité calculée |
| quantity_packed | INT | Quantité emballée |
| packed | BOOLEAN | Complètement emballé |
| org_id | UUID FK | |

#### `user_profiles`
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| user_id | UUID UNIQUE NOT NULL | Supabase auth user ID |
| role_id | UUID FK → roles | |
| display_name | TEXT | |
| created_at | TIMESTAMPTZ | |
| org_id | UUID FK | |

#### `organizations` (multi-tenant)
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| name | TEXT | |
| slug | TEXT UNIQUE | URL-friendly |
| plan | TEXT | free / pro / enterprise |
| logo | TEXT | |
| settings | JSONB | Config custom |
| created_at | TIMESTAMPTZ | |

### Vues
- **`product_depreciation`** : calcul automatique amortissement linéaire français (500€ HT min, prorata 360j)

### Fonctions RPC
- **`move_stock()`** : mouvement de stock atomique (in/out/transfer)
- **`undo_movement()`** : annulation de mouvement
- **`generate_packing_list(p_event_id UUID)`** : génération auto packing list

---

## 5. HIÉRARCHIE PRODUITS

### 3 Familles → 17 Sous-familles

#### Merchandising (MERCH)
| Sous-famille | Produits types |
|-------------|---------------|
| Textiles | T-shirts, hoodies, casquettes |
| Affiches | Posters, flyers |
| Media | CD, vinyles, USB |
| Accessoires | Briquets, porte-clés |
| Goodies | Stickers, badges, pins |
| Sacs | Tote bags, sacs à dos |

#### Matériel (MAT)
| Sous-famille | Produits types |
|-------------|---------------|
| Son | Enceintes, micros, DI boxes |
| Instruments | Guitares, claviers, percussions |
| Lumière | Projecteurs, contrôleurs DMX |
| Tech & Régie | Câbles XLR, multipaires |
| Scène & Décor | Praticables, backdrops |

#### Consommables (CONSO)
| Sous-famille | Produits types |
|-------------|---------------|
| Câblage | Câbles, connecteurs |
| Énergie | Piles, batteries |
| Adhésifs | Gaffer, scotch |
| Cordes instruments | Jeux de cordes guitare/basse |
| Bureau | Papier, stylos |
| Entretien | Produits nettoyage |

---

## 6. MERCHANDISING — SPECS VALIDÉES

### Commande T-shirts (400 unités)
| Modèle | Marque | Référence | Genre | Couleurs | Quantité |
|--------|--------|-----------|-------|----------|----------|
| Gildan Softstyle 64000 | Gildan | 64000 | Homme | Kaki, Noir | ~200 |
| Sol's Moon 11388 | Sol's | 11388 | Femme | Noir, Rouge | ~200 |

- **Marque** : Solda Lanmou
- **Distribution** : vente directe aux concerts
- **Tailles** : S, M, L, XL, XXL (distribution standard)

---

## 7. LES 12 PROFILS MÉTIERS

### Configuration complète

| Code | Rôle | Icône | Couleur | Accès sous-familles | Admin |
|------|------|-------|---------|---------------------|-------|
| TM | Tour Manager | 🎯 | #E8735A | TOUTES | Oui |
| PM | Chef de Production | 🎬 | #9B7DC4 | TOUTES | Oui |
| SE | Ingé Son | 🔊 | #5B8DB8 | Son, Câblage, Énergie | Non |
| LD | Régisseur Lumière | 💡 | #E8935A | Lumière, Câblage, Énergie | Non |
| BL | Backline | 🎸 | #D4648A | Instruments, Cordes | Non |
| SM | Régisseur Scène | 🎭 | #8BAB5D | Scène & Décor, Adhésifs | Non |
| TD | Directeur Technique | ⚙️ | #5DAB8B | Son, Lumière, Tech & Régie, Scène & Décor | Non |
| MM | Merch Manager | 👕 | #E8735A | Textiles, Affiches, Media, Accessoires, Goodies, Sacs | Non |
| LOG | Logistique | 🚛 | #5B8DB8 | TOUTES | Oui |
| SAFE | Sécurité | 🛡️ | #D4648A | Entretien, Bureau | Non |
| AA | Assistant Artiste | 🎤 | #9B7DC4 | Instruments, Entretien | Non |
| PA | Assistant Production | 📋 | #8BAB5D | TOUTES | Oui |

### Logique d'accès
- **Admins** (TM, PM, LOG, PA) : voient TOUS les produits/stocks/mouvements
- **Non-admins** : voient uniquement les produits dont le `subfamily_id` est dans leur `subfamily_ids`
- Le filtrage se fait côté frontend dans App.jsx (`filteredProducts`, `filteredStock`, `filteredMovements`)

### Flow utilisateur
1. Premier login → **RolePicker** : grille de 12 rôles à choisir
2. Choix sauvegardé dans `user_profiles` (user_id + role_id)
3. Dashboard personnalisé avec KPIs filtrés
4. Badge rôle affiché dans le header

---

## 8. PACKING LIST — FORMULES DE CALCUL

### Génération automatique par concert
La fonction `generate_packing_list(event_id)` calcule les quantités nécessaires :

#### Merchandising
```
qty = capacité × taux_conversion × mult_territoire / nb_produits_même_sous_famille
```

#### Matériel
```
qty = stock_actuel × multiplicateur_format
```

#### Consommables
```
qty = min_stock × multiplicateur_format
```

### Taux de conversion (% du public qui achète du merch)
| Format | Taux |
|--------|------|
| Concert live | 11% |
| Sound system | 7% |
| Impro | 13% |
| Festival | 9% |
| Showcase | 15% |

### Multiplicateur territoire
| Territoire | Multiplicateur |
|-----------|---------------|
| Martinique | ×1.0 |
| Guadeloupe | ×0.85 |
| Guyane | ×0.70 |
| Réunion | ×0.75 |

### Multiplicateur format (matériel/conso)
| Format | Multiplicateur |
|--------|---------------|
| Concert | ×1.0 |
| Sound system | ×0.7 |
| Impro | ×0.5 |
| Festival | ×1.2 |
| Showcase | ×0.6 |

### Points d'alerte identifiés
- **Triple 8 Ducos** (9 mai 2026) : 1500 places → alerte réappro merch
- **Festival Grand Carbet** (3 juillet 2026) : rupture projetée

---

## 9. COMPTABILITÉ — AMORTISSEMENT

### Règles (conformité française)
- **Méthode** : amortissement linéaire uniquement
- **Seuil** : ≥ 500€ HT pour être immobilisé
- **Prorata temporis** : base 360 jours (30j/mois)
- **Consommables** : toujours en charges, jamais amortis
- **Vue SQL** : `product_depreciation` calcule automatiquement :
  - Dotation annuelle
  - Dotation prorata
  - Amortissements cumulés
  - VNC (Valeur Nette Comptable)

### Durées d'amortissement standards
| Catégorie | Durée |
|-----------|-------|
| Matériel son | 5-7 ans |
| Instruments | 5-10 ans |
| Lumière | 5-7 ans |
| Tech & régie | 3-5 ans |
| Scène & décor | 3-5 ans |

> ⚠️ Les durées doivent être validées par un expert-comptable

---

## 10. DESIGN SYSTEM

### Palette de couleurs
| Nom | Hex | Usage |
|-----|-----|-------|
| Corail | #E8735A | Couleur principale, CTA, accent |
| Rose | #D4648A | Erreurs, ruptures, merch |
| Bleu | #5B8DB8 | Info, matériel, transferts |
| Vert | #5DAB8B | Succès, consommables, entrées |
| Orange | #E8935A | Warnings, alertes, lumière |
| Prune | #3D3042 | Texte principal |
| Prune light | #9A8B94 | Texte secondaire |
| Prune lighter | #B8A0AE | Texte tertiaire |

### Backgrounds
| Usage | Valeur |
|-------|--------|
| Page | Gradient #FFF8F0 → #FEF0E8 → #F8F0FA → #F0F4FD |
| Cards | #FFFFFF |
| Input | #FFFCFA |

### Rayons de bordure
| Élément | Rayon |
|---------|-------|
| Cards | 18px |
| Boutons | 14px |
| Inputs | 14px |
| Badges | 8px |
| Modales | 24px |

### Ombres
| Usage | Valeur |
|-------|-------|
| Card | 0 2px 12px rgba(180,150,130,0.08) |
| Card hover | 0 4px 20px rgba(180,150,130,0.12) |
| Modal | 0 -8px 40px rgba(180,150,130,0.15) |

### Animations
- `fadeIn` : opacity 0→1 (0.3s)
- `slideUp` : translateY(100%)→0 (0.35s cubic-bezier)
- `slideDown` : translateY(-20px)→0 (0.3s)
- `pulse` : scale 1→1.02→1 (2s infinite)
- `spin` : rotation 360° (1s linear infinite)

### Typographie
- Font : Nunito (Google Fonts)
- Weights utilisés : 400, 500, 600, 700, 800, 900
- Titres : 900 (Black)
- Texte courant : 600 (SemiBold)
- Labels : 700 (Bold)

### Navigation
- **Bottom tab bar** fixe : 6 onglets
  - Board (📊), Produits (📦), Stocks (🏭), Mouvements (📋), Alertes (🔔), Checks (✅)
- Backdrop blur sur la nav
- Safe area inset pour iPhone
- Bouton Scanner (📷) dans le header

---

## 11. FONCTIONNALITÉS DÉTAILLÉES

### 11.1 Authentification (Auth.jsx)
- Login email/password
- Inscription email/password
- Token stocké en localStorage (`sb_token`, `sb_refresh`)
- Auto-refresh sur 401
- Déconnexion avec reset state complet

### 11.2 Dashboard (Board.jsx)
- **Carte bienvenue** personnalisée par rôle (icône, couleur, label)
- **Mini KPIs** : Stock, Alertes, Ruptures, Packing %
- **Packing progress** pour le prochain concert (items du rôle)
- **Prochain concert** avec date et détails (cliquable → fiche)
- **Actions rapides** : Entrée, Sortie, Transfert
- **Alertes stock** filtrées par rôle
- **Stock par catégorie** avec compteurs
- **Stock par lieu** avec compteurs
- **Derniers mouvements** (5 plus récents)
- **Événements à venir** avec badge J-X

### 11.3 Produits (Products.jsx)
- Recherche par nom, SKU, catégorie
- Filtres : catégorie + sous-famille
- Cartes produit : image, nom, SKU, badge stock
- **Fiche produit** : stock par lieu, total, amortissement
- **Formulaire** : nom, SKU, catégorie, famille, sous-famille, unité, min_stock, variantes, image, coût HT, date achat, durée amortissement
- CRUD complet (ajout, modification, suppression)

### 11.4 Stocks (Stocks.jsx)
- Vue par lieu avec sections collapsibles
- Filtres par catégorie
- Badge quantité avec alertes visuelles (⚠️ bas, 🚨 rupture)
- Actions par lieu : Entrée, Sortie
- Ajout de lieu (modal avec icône/couleur/type)

### 11.5 Mouvements (Movements.jsx)
- **Stats** : totaux entrées, sorties, transferts
- **Recherche** par produit ou lieu
- **Filtres avancés** : date début/fin, type
- **Pilules filtre** : Tous, Entrées, Sorties, Transferts
- **Groupé par jour** : aujourd'hui, hier, date complète
- Affichage : produit, lieu(x), quantité signée, heure, note

### 11.6 Alertes (Alerts.jsx)
- **Résumé** : compteurs ruptures, alertes, événements
- **Filtres** : Tout, Ruptures, Alertes, Concerts
- **Alertes stock** : barre de progression stock/seuil, détail par lieu
- **Alertes événements** :
  - Rouge : concert dans ≤3 jours
  - Orange : concert dans ≤7 jours
  - Bleu : concert dans ≤14 jours
- Tri par priorité (ruptures > urgents > alertes > prochains)

### 11.7 Checklists (Checklists.jsx)
- Filtre par événement et catégorie
- Barre de progression
- Toggle check item
- Ajout/suppression d'items
- Reset all

### 11.8 Scanner (Scanner.jsx)
- **Mode caméra** : BarcodeDetector API (Chrome/Edge/Samsung)
  - Formats : EAN-13, EAN-8, Code 128, QR Code, Code 39
  - Overlay avec cadre de scan
  - Camera arrière par défaut (facingMode: environment)
- **Mode manuel** : saisie SKU avec recherche live
  - Auto-complétion des produits pendant la saisie
- **Résultat** :
  - Produit trouvé : infos, stock par lieu, total, actions (Entrée/Sortie/Transfert)
  - Produit non trouvé : message avec code scanné
- Bouton "Scanner un autre" pour réinitialiser

### 11.9 Fiche Concert (EventDetail.jsx)
6 onglets :
1. **Résumé** : infos, prévisions, résultats, stock par catégorie, flags, notes, checklist
2. **Merch** : produits merch groupés par sous-famille, stock par lieu
3. **Matériel** : idem pour matériel
4. **Consommables** : idem pour consommables
5. **Check** : checklist intégrée avec ajout inline
6. **Packing** : PackingList component

### 11.10 Packing List (PackingList.jsx)
- **Progress global** : barre + pourcentage
- **Alerte manques** : produits en stock insuffisant
- **Groupé par rôle** :
  - Header : icône, label, compteur, pourcentage, barre
  - "Tout emballer" par rôle
  - Items : checkbox, produit, SKU, badge manque, input quantité
- **Boutons** : Générer, Régénérer
- Affiche infos événement (format, capacité, territoire)

### 11.11 Modal Mouvement (MovementModal.jsx)
- Type : Entrée / Sortie / Transfert
- Sélection produit
- Sélection lieu source (out/transfer) et destination (in/transfer)
- Input quantité avec validation (max = stock dispo)
- Note optionnelle
- Confirmation avant enregistrement
- Appel RPC `move_stock()` avec fallback upsert

### 11.12 Role Picker (RolePicker.jsx)
- Grille 2 colonnes de 12 rôles
- Carte : icône, label, description, badge ADMIN
- Checkmark sur sélection
- Bouton confirmer avec couleur du rôle
- Sauvegarde dans `user_profiles` (upsert)
- Export `ROLE_CONF` pour réutilisation dans l'app

---

## 12. CLIENT SUPABASE (supabase.js)

### Structure
```javascript
const SUPABASE_URL = 'https://domuweiczcimqncriykk.supabase.co'
const SUPABASE_ANON_KEY = '...'

// Auth
auth.signUp(email, password)
auth.signIn(email, password)
auth.signOut()
auth.getUser()      // auto-refresh sur 401
auth.refresh()

// Database
db.get(table, query)        // GET avec filtres PostgREST
db.insert(table, data)      // POST
db.update(table, match, data) // PATCH avec filtre
db.upsert(table, data)      // POST avec merge-duplicates
db.delete(table, match)     // DELETE avec filtre
db.rpc(fn, params)          // POST /rest/v1/rpc/{fn}

// Safe wrapper
safe(table, query)          // → [] on error
```

### Headers
```
apikey: SUPABASE_ANON_KEY
Authorization: Bearer {token}
Content-Type: application/json
Prefer: return=representation (pour POST/PATCH)
```

### Gestion d'erreur
- 401 → auto-refresh token → retry
- Chaque requête dans un try/catch individuel
- `safe()` pour les tables optionnelles (retourne [] si erreur)

---

## 13. RLS (Row Level Security)

### Politique par table

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| products | Tous | Admins | Admins | Admins |
| locations | Tous | Admins | Admins | Admins |
| stock | Tous | Auth | Auth | — |
| movements | Tous | Auth | — | — |
| events | Tous | Admins | Admins | — |
| families | Tous | — | — | — |
| subfamilies | Tous | — | — | — |
| checklists | Tous | Auth | Auth | Auth |
| roles | Tous | — | — | — |
| event_packing | Tous | Auth | Auth | Auth |
| user_profiles | Tous | Own (auth.uid()=user_id) | Own | — |
| organizations | Tous | — | — | — |

---

## 14. MULTI-TENANT

### Préparation effectuée
- Table `organizations` créée
- Colonne `org_id` ajoutée à toutes les tables principales (11 tables)
- Organisation par défaut : EK SHOP (ID: 00000000-0000-0000-0000-000000000001)
- Index sur `org_id` pour chaque table
- Données existantes migrées vers org EK SHOP

### Prochaines étapes pour le SaaS
1. Ajouter `org_id` aux politiques RLS (filtrer par org)
2. Créer un flow d'inscription d'organisation
3. Système d'invitation par email
4. Plans tarifaires (free / pro / enterprise)
5. Isolation des données par organisation
6. Sous-domaines ou routing par slug

---

## 15. BUGS CONNUS & RÉSOLUS

### Résolus
- **Clé API tronquée** : clé anon coupée lors du copier-coller → remplacée par la clé complète
- **RLS bloque les writes** : families/subfamilies INSERT bloqué → ajout policies
- **RLS bloque les reads** : tables sans policy SELECT → ajout `FOR SELECT USING (true)`
- **UUIDs tronqués** : subfamily UUIDs dans le SQL des rôles terminaient par 000...000 → corrigé manuellement
- **DDL via REST API impossible** : CREATE POLICY pas faisable via API → exécution manuelle SQL Editor
- **user_profiles NULL user_id** : table existante avec lignes orphelines → DROP + recreate clean
- **BUG-008** : Refresh pendant modale ouverte → auto-refresh pausé si modal/scanner ouvert
- **BUG-009** : Scroll position perdu entre onglets → sauvegarde/restauration via useRef

### À surveiller
- Performance si > 500 produits (filtrage côté client)
- BarcodeDetector API non dispo sur Firefox/Safari (fallback mode manuel)
- Service Worker cache peut servir des données périmées en offline

---

## 16. DONNÉES EXISTANTES

### Produits
- ~164 produits actifs (après suppression de 12 doublons)
- Répartis sur 3 catégories, 17 sous-familles
- T-shirts : 4 modèles × ~5 tailles = ~20 variantes

### Lieux de stockage
- À configurer selon logistique tournée
- Types : entrepôt, véhicule, salle de concert

### Événements de la tournée
- Mars à décembre 2026
- Formats : concert, sound system, impro, festival, showcase
- Territoires : Martinique, Guadeloupe

---

## 17. DÉPENDANCES

### package.json
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.4.0"
  }
}
```

**Zéro dépendance externe** côté client (pas d'axios, pas de UI framework, pas de state management). Tout est fait avec React pur + fetch natif.

---

## 18. COMMANDES

```bash
npm run dev      # Serveur dev (localhost:5173)
npm run build    # Build production → dist/
npm run preview  # Preview du build
```

---

## 19. RÉFLEXIONS & DÉCISIONS ARCHITECTURALES

### Pourquoi pas de TypeScript ?
- Gio développe depuis son téléphone
- Rapidité d'itération > safety en phase MVP
- Migration TS possible plus tard

### Pourquoi des styles inline ?
- Pas de build CSS à gérer
- Colocation style/logique dans le composant
- Design system centralisé dans index.css pour les classes réutilisables

### Pourquoi pas de state management (Redux, Zustand) ?
- L'app est encore petite (< 15 composants)
- Props drilling gérable
- Auto-refresh toutes les 30s = source de vérité Supabase

### Pourquoi le filtrage côté client ?
- Supabase RLS filtre par auth, pas par rôle métier
- Les `subfamily_ids` sont un array dans la table `roles`
- Le filtrage PostgREST sur les arrays est complexe
- Avec < 500 produits, le client gère sans problème

### Pourquoi pas de Supabase JS SDK ?
- Contrôle total sur les headers et les requêtes
- Pas de dépendance lourde
- Le wrapper `supabase.js` fait 194 lignes

---

## 20. IDÉES FUTURES & ROADMAP

### Court terme (avant la tournée)
- [ ] Export PDF packing lists
- [ ] Gestion variantes produits (tailles t-shirts)
- [ ] Mode hors-ligne avancé (queue de sync)
- [ ] Photos produits (upload Supabase Storage)

### Moyen terme (pendant la tournée)
- [ ] Tableau de bord financier (CA prév vs réel)
- [ ] Rapport post-concert automatisé
- [ ] Notifications push (Web Push API)
- [ ] Historique prix et tendances

### Long terme (SaaS)
- [ ] Onboarding multi-tenant complet
- [ ] Plans tarifaires & paiement (Stripe)
- [ ] API publique pour intégrations
- [ ] App native (React Native ou Capacitor)
- [ ] Marketplace de templates (configs par type d'événement)
- [ ] Intégration comptable (export FEC)
- [ ] Dashboard analytics multi-org

---

## 21. CONTACTS & ACCÈS

### Développeur
- **Nom** : Gio (Giovanni F.)
- **Email** : giovannif.invest@gmail.com
- **GitHub** : GiogioArch

### Services
- **GitHub** : https://github.com/GiogioArch/Stage-stock
- **Supabase** : domuweiczcimqncriykk.supabase.co
- **Cloudflare Pages** : auto-deploy depuis main
- **Claude Code** : outil de développement IA utilisé

---

## 22. HISTORIQUE DES VERSIONS

| Version | Date | Contenu |
|---------|------|---------|
| v8.0 | Mars 2026 | Fresh start Vite + JSX, catalogue produits, stock multi-lieux |
| v8.1 | Mars 2026 | Checklists, amortissement, PWA offline, bugfixes |
| v8.2 | Mars 2026 | Fiche concert détaillée (6 onglets), stock par catégorie |
| v8.3 | Mars 2026 | 12 profils métiers, packing list auto par concert |
| v8.4 | Mars 2026 | Profils utilisateurs, role picker, accès filtrés par rôle |
| v9.0 | 12 mars 2026 | Dashboard rôle, historique mouvements, alertes, scanner, multi-tenant |

---

*Document généré le 12 mars 2026 — Stage Stock v9.0*
*Ce document contient toutes les informations nécessaires pour reconstruire le projet de zéro.*
