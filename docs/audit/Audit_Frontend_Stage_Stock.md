# Audit Frontend Complet — Stage Stock

**Date :** Mars 2026
**Auditeur :** Manus AI
**Périmètre :** Code source React (35+ composants), architecture CSS, logique de navigation, textes et UX.

---

## 1. Synthèse de l'Audit

L'application Stage Stock présente une architecture frontend moderne (React 18, Vite) avec une excellente approche modulaire. La navigation en 3 couches (Landing → Espace Personnel → Espace Projet) est logique et bien pensée pour un usage mobile.

Cependant, l'audit chirurgical du code source révèle une **dette technique visuelle importante**, des **incohérences de wording**, et des **fragilités dans la gestion des données côté client**.

### Les 3 problèmes majeurs à corriger
1. **Le Design System est cassé :** 2 413 blocs de styles inline (`style={{...}}`) au lieu d'utiliser les classes CSS globales. Les couleurs sont redéfinies dans chaque fichier.
2. **Suppressions non-atomiques :** La suppression d'un produit ou d'un dépôt exécute 3 à 4 requêtes séquentielles côté client. En cas de coupure réseau, la base de données devient incohérente.
3. **Chevauchement fonctionnel :** Les onglets `Stocks.jsx` et `Depots.jsx` font exactement la même chose avec deux interfaces différentes.

---

## 2. Architecture et Navigation

La logique de navigation dans `App.jsx` repose sur un système d'états locaux (`layer`, `tab`, `personalTab`).

| Couche | Composants | Problèmes identifiés |
|:---|:---|:---|
| **1. Publique** | `Landing`, `Auth`, `Melodie` | Le composant `Auth.jsx` est mort (non utilisé). L'onboarding `Melodie` est très bien conçu mais contient des textes sans accents. |
| **2. Personnelle** | `PersonalDashboard`, `MyProjects` | La suppression d'un projet dans `MyProjects` n'est pas atomique. |
| **3. Projet** | `Board`, `Products`, `Tour`, etc. | Pas de deep-linking (impossible de partager l'URL d'un produit spécifique). Le bouton "Retour" du navigateur ne fonctionne pas. |

**Recommandation :** Implémenter un vrai routeur (comme `react-router-dom`) pour permettre le deep-linking et le fonctionnement natif du bouton retour du navigateur.

---

## 3. Audit des Composants Principaux

### Board.jsx (Dashboard)
Le tableau de bord est complet mais souffre d'une surcharge d'informations.
- **Problème UX :** 10 sections empilées verticalement sans possibilité de les réduire.
- **Problème Logique :** Le lien "EK LIVE" est codé en dur vers `/live` avec un `target="_blank"`, ce qui est incohérent avec une PWA.
- **Problème Technique :** Le graphique des mouvements filtre les dates avec `startsWith()`, ce qui est fragile face aux changements de fuseaux horaires.

### Products.jsx (Catalogue)
- **Problème Métier :** Le SKU n'est pas vérifié pour l'unicité lors de la création.
- **Problème UX :** La recherche textuelle ne filtre pas sur les variantes du produit.
- **Problème Technique :** La fonction `handleDelete` supprime le stock, puis les mouvements, puis le produit. Si la 3ème requête échoue, le produit reste en base mais son stock a disparu.

### Stocks.jsx vs Depots.jsx
Ces deux composants sont redondants.
- `Stocks.jsx` propose une vue par accordéons.
- `Depots.jsx` propose une vue par cartes.
- **Recommandation :** Fusionner les deux en un seul onglet "Lieux & Stocks" avec un bouton pour basculer entre la vue liste et la vue détail.

### Equipe.jsx (Ressources Humaines)
C'est le composant le plus lourd de l'application (1 622 lignes).
- **Problème d'Architecture :** Le fichier est monolithique et contient 226 blocs de styles inline.
- **Problème Métier :** La hiérarchie (TM, PM, TD, etc.) et les missions sont codées en dur. Cela empêche l'application d'être vendue à des entreprises hors du secteur musical.

---

## 4. Incohérences Visuelles et Textuelles

### Les Accents Manquants
Plus de 40 textes ont été identifiés sans accents, principalement dans les composants créés en premier (`Board`, `Products`, `Melodie`).
- *Exemples :* "Vue complete", "Entree", "Categorie", "Evenements a venir", "Repartion du stock".
- *Curiosité :* Les composants plus récents (`Finance`, `Achats`) ont des accents corrects, prouvant un manque de relecture globale.

### Le Chaos des Couleurs
L'application définit les couleurs de 6 manières différentes :
- `const colors = {...}` dans `Products.jsx`
- `const COLORS = {...}` dans `Alerts.jsx`
- `const COLOR = {...}` dans `Board.jsx`
- `const C = {...}` dans `Melodie.jsx`
- `const PALETTE = {...}` dans `UI.jsx`
- Et des centaines de couleurs codées en dur (ex: `#16A34A`).

La couleur "Succès" est définie comme `#16A34A` dans 3 fichiers, mais comme `#10B981` dans `Melodie.jsx`.

**Recommandation :** Supprimer toutes les constantes de couleurs locales et forcer l'utilisation des variables CSS globales (`var(--success)`, `var(--accent)`) définies dans `index.css`.

---

## 5. Plan d'Action Recommandé

Voici les actions à mener par ordre de priorité pour assainir le frontend :

### Priorité Haute (Sécurité des données)
1. **Sécuriser les suppressions :** Remplacer les suppressions séquentielles dans `Products.jsx`, `Depots.jsx` et `MyProjects.jsx` par des appels RPC (procédures stockées) pour garantir l'atomicité.
2. **Unicité des SKU :** Ajouter une validation côté client et une contrainte SQL pour empêcher les SKU en doublon.

### Priorité Moyenne (Qualité et UX)
3. **Correction orthographique :** Faire une passe globale pour remettre les accents manquants dans `Board.jsx`, `Products.jsx` et `Melodie.jsx`.
4. **Fusion Stocks/Dépôts :** Supprimer `Stocks.jsx` et intégrer sa vue accordéon comme option d'affichage dans `Depots.jsx`.
5. **Nettoyage CSS :** Remplacer les couleurs codées en dur par les variables CSS globales.

### Priorité Basse (Architecture long terme)
6. **Refactoring `Equipe.jsx` :** Découper le fichier en 4 sous-composants (Organigramme, Liste, Planning, Formulaire).
7. **Routing :** Implémenter `react-router-dom` pour permettre le deep-linking.
