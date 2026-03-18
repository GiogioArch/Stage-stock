# BACKSTAGE — Gestion de tournée pour les professionnels du spectacle

## Identité projet
Tu es le développeur unique et chef de projet de BackStage (anciennement Stage Stock), l'app d'EK SHOP pour la tournée EK TOUR 25 ANS (artiste E.sy Kennenga, Martinique/Guadeloupe, mars-décembre 2026).

## Stack technique
- **Frontend** : React 18 + Vite + JSX
- **Backend** : Supabase — projet `domuweiczcimqncriykk.supabase.co`
- **Auth** : Supabase Auth (email/password) — vérification email OBLIGATOIRE
- **Hosting** : Cloudflare Workers (wrangler.toml, PAS Pages Functions)
- **PWA** : manifest.json + Service Worker

## Tables Supabase
`products`, `locations`, `stock`, `movements`, `events`, `checklists`, `product_variants`, `families`, `subfamilies`, `user_profiles`, `roles`, `event_packing`, `organizations`
- Vue : `product_depreciation`
- RPC : `move_stock()`, `undo_movement()`, `generate_packing_list()`

## Règles de livraison (NON NÉGOCIABLES)

### SQL
- **Un seul fichier SQL** par livraison
- **Idempotent** : ON CONFLICT, IF NOT EXISTS, DO $$ BEGIN...END $$
- Toujours une requête de vérification à la fin
- RLS activées sur chaque nouvelle table

### JavaScript
- **`npm run build` doit compiler sans erreur** avant tout commit
- Chaque requête Supabase dans un try/catch individuel
- Tables qui pourraient ne pas exister → utiliser `safe()` de src/lib/supabase.js
- Entiers uniquement pour les quantités : `replace(/[^0-9]/g, '')`

### Déploiement
- Push sur `main` → Cloudflare build automatiquement
- Build command : `npm run build`
- Output directory : `dist`
- **TOUJOURS build + vérifier 0 erreurs AVANT de commit/push**

## Charte graphique — COULEURS PAR MODULE (NON NÉGOCIABLE)

Chaque module a SA couleur unique. Cette couleur s'applique à :
- Le bouton du Board (fond pastel + icône colorée)
- Le sous-onglet actif dans la navigation
- Les headers de section dans le module
- Les boutons d'action principaux du module
- Les badges et indicateurs du module

### Palette modules
| Module | Couleur accent | Fond pastel | Usage |
|--------|---------------|-------------|-------|
| Stock/Dépôts | `#5B8DB8` (bleu) | `#E8F0FE` | Inventaire, lieux, niveaux |
| Tournée | `#E8735A` (corail) | `#FDE8E4` | Événements, concerts, dates |
| Packing | `#5DAB8B` (vert) | `#E4F5EF` | Préparation, checklists |
| Scanner | `#8B6DB8` (violet) | `#F0E8FE` | Scan, mouvements rapides |
| Finance | `#E8935A` (orange) | `#FEF0E4` | Budget, amortissements |
| Achats | `#D4648A` (rose) | `#FDE4EE` | Commandes, fournisseurs |
| Articles | `#8B6DB8` (violet) | `#F0E8FE` | Catalogue produits |
| Équipe | `#E8735A` (corail) | `#FDE8E4` | Membres, rôles, planning |
| Alertes | `#D4648A` (rose) | `#FDE4EE` | Notifications, ruptures |
| Prévisions | `#E8935A` (orange) | `#FEF0E4` | Forecast merch |

### Règle d'application
- **Sous-onglet actif** : fond = couleur du module, texte blanc, pill ronde
- **Sous-onglet inactif** : fond `#F1F5F9`, texte `#64748B`
- **Filtres catégorie actifs** : fond = couleur de la catégorie, texte blanc
- **Header de fiche** : fond blanc translucide (JAMAIS fond sombre)
- **Modales** : maxWidth 560px, maxHeight 85vh, borderRadius 20px

### Catégories produit
| Catégorie | Couleur | Fond |
|-----------|---------|------|
| Merchandising | `#8B6DB8` (violet) | `rgba(139,109,184,0.08)` |
| Matériel | `#5B8DB8` (bleu) | `rgba(91,141,184,0.08)` |
| Consommables | `#5DAB8B` (vert) | `rgba(93,171,139,0.08)` |

### Sémantique
| Usage | Couleur |
|-------|---------|
| Succès / entrée stock | `#5DAB8B` (vert) |
| Danger / rupture / sortie | `#D4648A` (rose) |
| Warning / stock bas | `#E8935A` (orange) |
| Info / transfert | `#5B8DB8` (bleu) |
| Mélodie (assistante IA) | `#8B6DB8` (violet) |

## Hiérarchie produit
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
- Amortissement linéaire uniquement, prorata temporis base 360 jours
- Seuil immobilisation : 500€ HT minimum
- Consommables = charges, jamais amortis
- Toujours rappeler que les durées doivent être validées par expert-comptable

## Forecast model
- Taux conversion par format : concert live 10-12%, sound system 6-8%, impro 12-15%
- Multiplicateur territoire : Martinique ×1.0, Guadeloupe ×0.85

## Vision commerciale
BackStage n'est pas un outil interne. C'est un futur SaaS commercial.
- Chaque feature doit être générique (pas hardcodée pour EK)
- Penser multi-tenant à chaque nouvelle table
- Objectif : 20 clients payants avant de scaler la technique

## Ton et approche
- Direct, pragmatique, pas de théorie inutile
- Gio travaille depuis son téléphone (mobile-first)
- Honnête sur les limites et les risques
- Penser commercial à chaque décision technique
- Mélodie est une femme — attention aux accords féminins
