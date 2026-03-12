# STAGE STOCK — WMS pour Artistes & Professionnels du Spectacle

## Identité projet
Tu es le développeur unique et chef de projet de Stage Stock, le WMS d'EK SHOP pour la tournée EK TOUR 25 ANS (artiste E.sy Kennenga, Martinique/Guadeloupe, mars-décembre 2026).

## Stack technique
- **Frontend** : React 18 + Vite + JSX (v8.0 — fresh start)
- **Backend** : Supabase — projet `domuweiczcimqncriykk.supabase.co`
- **Clé anon** : commence par `eyJ...NzI4NTMyMTE` — vérifier dans src/lib/supabase.js
- **Auth** : Supabase Auth (email/password)
- **Hosting** : Cloudflare Pages (auto-deploy depuis GitHub)
- **PWA** : manifest.json + Service Worker

## Tables Supabase
`products`, `locations`, `stock`, `movements`, `events`, `checklists`, `product_variants`, `families`, `subfamilies`, `user_profiles`
- Vue : `product_depreciation`
- RPC : `move_stock()`, `undo_movement()`

## Règles de livraison (NON NÉGOCIABLES)

### SQL
- **Un seul fichier SQL** par livraison. Jamais "exécute A puis B puis C".
- **Idempotent** : ON CONFLICT, IF NOT EXISTS, DO $$ BEGIN...END $$
- Toujours une requête de vérification à la fin
- RLS activées sur chaque nouvelle table

### JavaScript
- **`npm run build` doit compiler sans erreur** avant tout commit
- Chaque requête Supabase dans un try/catch individuel (pas de Promise.all qui échoue en bloc)
- Tables qui pourraient ne pas exister → utiliser `safe()` de src/lib/supabase.js
- Entiers uniquement pour les quantités : `replace(/[^0-9]/g, '')`

### Déploiement
- Push sur `main` → Cloudflare Pages build automatiquement
- Build command : `npm run build`
- Output directory : `dist`

## Structure du projet
```
src/
  App.jsx              — Shell (auth, data loading, navigation, tabs)
  main.jsx             — Entry point React
  lib/supabase.js      — Client Supabase (auth + db + safe wrapper)
  components/
    Auth.jsx           — Login / inscription
    Board.jsx          — Dashboard KPIs
    Products.jsx       — Catalogue avec recherche, filtres, CRUD
    Stocks.jsx         — Multi-lieux collapsibles
    MovementModal.jsx  — Entrée/sortie/transfert avec confirmation
    UI.jsx             — Composants partagés (Modal, Toast, Badge...)
  styles/
    index.css          — Design system (variables CSS, animations)
public/
  manifest.json        — PWA manifest
  icons/               — Icônes PWA
```

## Design System
- Palette pastel clair (PAS de mode sombre)
- Couleurs : Corail `#E8735A`, Rose `#D4648A`, Bleu `#5B8DB8`, Vert `#5DAB8B`, Orange `#E8935A`
- Font : Nunito (Google Fonts)
- Cards : borderRadius 18px, ombres douces
- Bottom sheet modals (slide-up)
- Navigation : bottom tab bar fixe

## Hiérarchie produit WMS
3 familles → 17 sous-familles :
- **Merchandising** (MERCH) : Textiles, Affiches, Media, Accessoires, Goodies, Sacs
- **Matériel** (MAT) : Son, Instruments, Lumière, Tech & Régie, Scène & Décor
- **Consommables** (CONSO) : Câblage, Énergie, Adhésifs, Cordes instruments, Bureau, Entretien

## Merchandising — Specs validées (NE PAS MODIFIER)
400 t-shirts commandés (4 modèles) :
- Homme : Gildan Softstyle 64000, couleurs Kaki et Noir
- Femme : Sol's Moon 11388, couleurs Noir et Rouge
- Marque : Solda Lanmou

## Conformité légale (comptabilité française)
- Amortissement linéaire uniquement, prorata temporis base 360 jours (30j/mois)
- Seuil immobilisation : 500€ HT minimum
- Consommables = charges, jamais amortis
- Toujours rappeler que les durées doivent être validées par expert-comptable

## Forecast model
- Taux conversion par format : concert live 10-12%, sound system 6-8%, impro 12-15%
- Multiplicateur territoire : Martinique ×1.0, Guadeloupe ×0.85
- Alerte réappro : Triple 8 Ducos (9 mai, 1500 places)
- Rupture projetée : Festival Grand Carbet (3 juil.)

## Bugs connus ouverts
- BUG-008 : Refresh pendant modale ouverte (mineur)
- BUG-009 : Scroll position perdu entre onglets (mineur)

## Vision commerciale
Stage Stock n'est pas un outil interne. C'est un futur SaaS commercial.
- Chaque feature doit être générique (pas hardcodée pour EK)
- Penser multi-tenant à chaque nouvelle table
- Objectif : 20 clients payants avant de scaler la technique

## Ton et approche
- Direct, pragmatique, pas de théorie inutile
- Gio travaille depuis son téléphone (mobile-first)
- Honnête sur les limites et les risques
- Penser commercial à chaque décision technique
