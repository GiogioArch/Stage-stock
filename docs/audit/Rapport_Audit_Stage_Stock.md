# Rapport d'Audit Technique : Projet Stage Stock

**Date :** 17 Mars 2026
**Auteur :** Manus AI
**Projet :** Stage Stock (WMS pour la tournée EK TOUR 25 ANS)

## 1. Introduction et Contexte

Le projet **Stage Stock** est une application web progressive (PWA) conçue comme un système de gestion d'entrepôt (WMS) spécialisé pour les professionnels du spectacle vivant. Développée initialement pour la tournée "EK TOUR 25 ANS" de l'artiste E.sy Kennenga, l'application vise à centraliser la gestion du matériel, du merchandising, des consommables, ainsi que la logistique des événements.

Cet audit a pour objectif d'évaluer l'architecture, la qualité du code, la sécurité, les performances et la maintenabilité de l'application, afin de fournir un état des lieux précis et des recommandations pour son évolution future vers une solution SaaS multi-tenant.

## 2. Architecture et Stack Technique

L'architecture actuelle repose sur une stack moderne et pertinente pour le cas d'usage :

| Composant | Technologie | Évaluation |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | Excellent choix pour une PWA performante. Le build est rapide et l'écosystème est mature. |
| **Backend / BDD** | Supabase (PostgreSQL) | Très adapté pour un développement rapide. L'utilisation des Row Level Security (RLS) est une bonne pratique. |
| **Hébergement** | Cloudflare Pages | Idéal pour les applications statiques (SPA) avec un déploiement continu via GitHub. |
| **Styling** | CSS natif (variables CSS) | Approche légère, mais l'utilisation massive de styles inline dans les composants React pose des problèmes de maintenabilité. |
| **Icônes** | Lucide React | Standard moderne, léger et cohérent. |

**Points forts de l'architecture :**
L'application est conçue comme une PWA avec un Service Worker (`sw.js`) qui gère intelligemment le cache (stratégie *network-first* pour l'API, *cache-first* pour les assets statiques). Cela garantit une résilience en cas de perte de connexion, cruciale pour une utilisation sur le terrain (salles de concert, dépôts).

**Points de vigilance :**
L'application est une Single Page Application (SPA) monolithique. Le bundle JavaScript principal atteint environ 682 Ko (minifié), ce qui commence à être lourd pour les connexions mobiles lentes. Il n'y a pas de *code splitting* (chargement dynamique) implémenté pour les routes ou les modules lourds.

## 3. Qualité du Code et Maintenabilité

L'analyse des 19 490 lignes de code source révèle une structure fonctionnelle mais qui souffre de plusieurs défauts de conception liés à une croissance rapide.

### 3.1. Structure des Composants
Les composants sont globalement trop massifs. Par exemple, `Equipe.jsx` compte plus de 1 600 lignes, `ProfilePage.jsx` plus de 1 200 lignes, et `App.jsx` plus de 1 100 lignes. Cette concentration de logique métier, de gestion d'état et de rendu UI dans des fichiers uniques rend la maintenance complexe et augmente le risque de régressions.

### 3.2. Gestion de l'État (State Management)
L'application n'utilise pas de gestionnaire d'état global (comme Redux, Zustand ou le Context API de React). L'état est géré localement dans `App.jsx` et passé aux composants enfants via un *prop drilling* excessif (plus de 60 occurrences de passage de props comme `onReload`, `onToast`, `orgId` depuis `App.jsx`). Cela crée un couplage fort et rend les composants difficiles à tester ou à réutiliser.

### 3.3. Styling
On dénombre plus de 2 500 occurrences de styles inline (`style={{...}}`) contre seulement 430 utilisations de classes CSS (`className="..."`). Cette pratique alourdit considérablement le code JSX, empêche la mise en cache efficace des styles par le navigateur et rend les modifications de design fastidieuses.

### 3.4. Gestion des Erreurs
La gestion des erreurs est présente mais inégale. De nombreux blocs `try/catch` (environ 39 occurrences) "avalent" silencieusement les erreurs (`catch {}`), ce qui complique le débogage. Les erreurs réseau sont gérées via une fonction de retry dans `supabase.js`, ce qui est une excellente pratique pour la résilience.

## 4. Sécurité

La sécurité est un point critique, particulièrement dans le contexte d'une transition vers un modèle SaaS multi-tenant.

### 4.1. Row Level Security (RLS)
La base de données PostgreSQL (via Supabase) utilise les politiques RLS. L'audit des fichiers SQL montre une préparation au multi-tenant avec l'ajout d'une colonne `org_id` sur les tables principales. Cependant, plusieurs politiques RLS (notamment dans `create-roles-packing.sql` et `setup-user-profiles-rls.sql`) utilisent `USING (true)` ou `WITH CHECK (true)`, ce qui autorise tout utilisateur authentifié à lire ou modifier les données, contournant ainsi l'isolation par organisation.

### 4.2. Gestion des Secrets
La clé publique Supabase (`SUPABASE_KEY`) est codée en dur dans `src/lib/supabase.js`. Bien qu'il s'agisse d'une clé "anon" (anonyme) conçue pour être publique, elle devrait idéalement être injectée via des variables d'environnement (`.env`) pour faciliter la rotation des clés et le déploiement sur différents environnements (staging, production).

### 4.3. Opérations Sensibles
Le module `LiveShop.jsx` (interface publique pour les fans) effectue des insertions directes dans la base de données (`db.insert('live_orders', ...)`) sans authentification. Bien que cela soit fonctionnel, cela expose la base de données à des risques de spam ou d'injections si les politiques RLS ne sont pas strictement configurées pour limiter le taux de requêtes ou valider les données entrantes.

### 4.4. Stockage Local
L'application utilise intensivement le `localStorage` pour stocker les tokens d'authentification (`sb_token`, `sb_refresh`) et les préférences utilisateur. C'est une pratique standard pour les SPA, mais elle expose les tokens aux attaques XSS (Cross-Site Scripting). Heureusement, l'utilisation de React mitige fortement les risques de XSS, et aucune utilisation de `dangerouslySetInnerHTML` n'a été détectée dans le code métier.

## 5. Performances

### 5.1. Rendu React
L'application utilise les hooks `useMemo` et `useCallback` (plus de 400 occurrences) pour optimiser les rendus. Cependant, la taille massive de `App.jsx` et le rechargement complet des données via la fonction `loadAll()` (appelée fréquemment lors des actions utilisateur) provoquent des re-rendus en cascade inutiles.

### 5.2. Opérations Base de Données
Les opérations de mise à jour des stocks (dans `MovementModal.jsx` et `ConcertMode.jsx`) ne sont pas toujours transactionnelles. Bien qu'une procédure stockée (`move_stock`) soit utilisée dans certains cas, d'autres opérations effectuent des lectures puis des écritures séquentielles côté client, ce qui peut entraîner des conditions de concurrence (*race conditions*) si plusieurs utilisateurs modifient le même stock simultanément.

### 5.3. Calculs Côté Client
Des calculs financiers complexes (marges, amortissements) et des filtrages de données massifs sont effectués côté client (par exemple dans `Finance.jsx` et `Board.jsx`). À mesure que le volume de données augmentera, ces opérations ralentiront l'interface utilisateur.

## 6. Recommandations et Plan d'Action

Pour garantir la pérennité du projet et préparer sa commercialisation, les actions suivantes sont recommandées, classées par priorité :

### Priorité Haute (Sécurité et Stabilité)
1. **Révision des Politiques RLS :** Corriger toutes les politiques RLS utilisant `USING (true)` pour imposer une vérification stricte de `org_id` via une fonction comme `get_user_org_ids(auth.uid())`.
2. **Transactions SQL :** Déplacer la logique de vente (`ConcertMode.jsx`) et de mouvement de stock complexe vers des procédures stockées (RPC) Supabase pour garantir l'atomicité et éviter les conditions de concurrence.
3. **Variables d'Environnement :** Extraire la configuration Supabase (`SUPABASE_URL`, `SUPABASE_KEY`) vers des variables d'environnement Vite (`import.meta.env`).

### Priorité Moyenne (Architecture et Maintenabilité)
4. **Refactoring des Composants Géants :** Découper `App.jsx`, `Equipe.jsx` et `ProfilePage.jsx` en sous-composants plus petits et spécialisés.
5. **Gestion d'État Globale :** Implémenter le Context API de React ou Zustand pour gérer l'état global (utilisateur, organisation sélectionnée, données de base) et éliminer le *prop drilling*.
6. **Nettoyage du Styling :** Migrer les styles inline vers des classes CSS (idéalement via Tailwind CSS, qui s'intègre parfaitement avec Vite et React) pour alléger le DOM et faciliter la maintenance du design system.

### Priorité Basse (Performances et UX)
7. **Code Splitting :** Implémenter `React.lazy()` et `Suspense` pour charger dynamiquement les modules lourds (comme `Finance`, `Transport`, `Equipe`) uniquement lorsqu'ils sont consultés, afin de réduire la taille du bundle initial.
8. **Calculs Côté Serveur :** Déplacer les calculs d'amortissement et les agrégations financières complexes vers des vues SQL (Views) ou des fonctions RPC sur Supabase.
9. **Mise à jour des Dépendances :** Mettre à jour React vers la version 18.3.1 (ou 19.x) et résoudre les avertissements de dépendances manquantes (`lucide-react`).

## 7. Conclusion

Le projet Stage Stock présente une base technique solide et moderne, parfaitement adaptée à son cas d'usage initial. L'interface est riche et les fonctionnalités couvrent un large spectre des besoins logistiques du spectacle vivant. 

Cependant, le code porte les stigmates d'un développement rapide (composants monolithiques, styles inline, prop drilling). Pour réussir la transition vers un produit SaaS robuste et sécurisé, un effort de refactoring architectural est nécessaire, avec une attention particulière portée sur la sécurisation stricte des données par organisation (RLS) et l'optimisation de la gestion d'état.
