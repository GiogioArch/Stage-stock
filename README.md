# Stage Stock — WMS pour Artistes

Application web progressive (PWA) de gestion de stock, matériel et logistique pour les professionnels du spectacle vivant.

Développée pour la tournée **EK TOUR 25 ANS** de l'artiste **E.sy Kennenga** (mars-décembre 2026, Martinique & Guadeloupe).

## Stack

- **Frontend** : React 18 + Vite
- **Backend** : Supabase (PostgreSQL)
- **Auth** : Supabase Auth (email/password)
- **Hosting** : Cloudflare Pages
- **PWA** : manifest.json + Service Worker

## Développement

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Le dossier `dist/` est prêt à déployer.

## Déploiement

Connecté à Cloudflare Pages via GitHub. Chaque push sur `main` déclenche un build automatique.

- **Build command** : `npm run build`
- **Output directory** : `dist`

## Modules

- **Board** : Dashboard avec KPIs, stock par catégorie/lieu, derniers mouvements
- **Produits** : Catalogue 60+ produits, familles/sous-familles, recherche, CRUD
- **Stocks** : Vue multi-lieux collapsible, entrées/sorties/transferts

---

*EK SHOP — Confidentiel*
