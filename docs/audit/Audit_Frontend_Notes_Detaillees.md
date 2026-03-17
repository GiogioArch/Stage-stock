# Audit Frontend — Notes détaillées

## COUCHE 1 — Landing, Auth, Melodie

### Landing.jsx (224 lignes)
**PROBLEMES:**
- Témoignage placeholder "Retour terrain bientôt disponible" — fait amateur, à remplacer ou supprimer
- Tarifs affichés (Gratuit/49€/99€) mais aucune logique de paiement implémentée — risque de confusion
- Liens CGU/Confidentialité utilisent CustomEvent('show-legal') — fragile, couplage implicite avec App.jsx
- Aucun lien vers mentions légales, contact, ou politique de cookies (obligation RGPD)
- Le footer ne contient pas de copyright avec année
- "WMS" dans le sous-titre — terme technique que le public cible ne comprend pas forcément
- Aucun bouton "Se connecter" visible pour les utilisateurs existants (seulement "Commencer gratuitement")
- Section "Comment ça marche" trop simpliste (3 étapes génériques)
- Pas de section FAQ
- Pas de responsive explicite — maxWidth: 500 hardcodé
- Icônes Star, Crown importées mais non tree-shakées si non utilisées ailleurs
- Pas de meta description, pas d'OG tags pour le SEO/partage social

**TEXTES:**
- "Le WMS des artistes et pros du spectacle" — OK mais "WMS" est jargon
- "Commencer gratuitement" x2 — cohérent
- "Pas de carte bancaire requise" — bien
- "Ils gèrent leur tournée avec Stage Stock" — bien mais le témoignage est vide

### Auth.jsx (166 lignes)
PROBLEMES:
- Version hardcodée "v10.5" en bas — incohérent avec Melodie qui affiche "v11.0"
- Le composant Auth.jsx est un DOUBLON de la logique auth de Melodie.jsx — les deux font la même chose
- Auth.jsx est importé dans App.jsx mais JAMAIS utilisé (Melodie gère tout le flux auth)
- Pas de validation email côté client (format)
- Pas de rate limiting visible sur les tentatives de connexion
- Le message "Vérifie ton email si la confirmation est activée, sinon connecte-toi" est confus pour l'utilisateur
- Loader importé mais non utilisé (import mort)

### Melodie.jsx (880 lignes) — Onboarding conversationnel
PROBLEMES TEXTES (accents manquants — bug systématique):
- "pas a pas" → "pas à pas" (ligne 327)
- "Premiere connexion" → "Première connexion" (ligne 339)
- "6 caracteres minimum" → "6 caractères minimum" (ligne 147, 400)
- "Creer ton compte" → "Créer ton compte" (ligne 378)
- "Deja un compte" → "Déjà un compte" (ligne 422)
- "Mot de passe oublie" → "Mot de passe oublié" (ligne 492)
- "Creer un compte" → "Créer un compte" (ligne 497)
- "Email envoye" → "Email envoyé" (ligne 511)
- "Verifie ta boite mail" → "Vérifie ta boîte mail" (ligne 514)
- "Enchante" → "Enchanté" (ligne 617)
- "Ca ne prendra" → "Ça ne prendra" (ligne 569)
- "Derniere etape" → "Dernière étape" (ligne 790)
- "Creer un projet" → "Créer un projet" (ligne 655)
- "comment ca marche" → "comment ça marche" (ligne 638)
- "tout ce qui necessite" → "tout ce qui nécessite" (ligne 696)
- "une tournee, un festival" → "une tournée, un festival" (ligne 696)
- "gerer du stock et une equipe" → "gérer du stock et une équipe" (ligne 696)
- "Comment s'appelle ton projet" → OK
- "Ton projet est pret" → "Ton projet est prêt" (ligne 872)
- "la si tu as besoin" → "là si tu as besoin" (ligne 872)

TOTAL: ~20 accents manquants dans Melodie.jsx — problème systématique

PROBLEMES LOGIQUE:
- "Rejoindre un projet" (step join_project) montre un QR code placeholder mais ne permet PAS de saisir un code d'invitation — fonctionnalité promise mais non implémentée
- Le bouton "Continuer vers l'application" dans join_project marque l'onboarding comme complet sans avoir rejoint quoi que ce soit
- saveProfile fait upsert puis insert en fallback silencieux — double écriture potentielle
- Le slug du projet est généré avec .slice(0, 30) mais pas de vérification d'unicité
- Les rôles sont hardcodés dans roleOrder — si un nouveau rôle est ajouté en DB, il n'apparaîtra pas
- FadeScreen recrée les timeouts à chaque render si onDone change (pas de useRef)
- Le composant Auth.jsx est importé mais JAMAIS rendu — code mort

POINTS POSITIFS:
- L'expérience conversationnelle avec Mélodie est très originale et engageante
- Les animations de bulles de chat sont fluides
- Le flux d'onboarding est logique : splash → welcome → signup → name → project → role → complete
- Le bouton "Plus tard" permet de skip l'onboarding
- L'eye toggle sur le mot de passe est bien implémenté

## COUCHE 2 — Espace Personnel

### PersonalDashboard.jsx (332 lignes)
PROBLEMES TEXTES:
- "Profil complete a" → "Profil complété à" (ligne 94) — accent manquant
- "Completer" → "Compléter" (ligne 105) — accent manquant
- "Aucune date a venir" → "Aucune date à venir" (ligne 149) — accent manquant

PROBLEMES LOGIQUE:
- Chargement séquentiel des événements : boucle for sur allProjects avec await séquentiel (ligne 24-29) — devrait être Promise.all pour paralléliser
- Le catch silencieux (ligne 28) masque les erreurs de chargement des événements
- "Ouvrir projet" dans Actions rapides ouvre toujours le PREMIER projet (allProjects[0]) — pas de choix
- Le calcul profilePercent inclut IBAN et SIRET comme champs obligatoires — trop agressif pour un nouvel utilisateur
- computeProfilePercent utilise 'bio' comme champ requis — discutable
- La section "Prochaines dates" charge les événements de TOUS les projets — pas de filtre par projet actif

PROBLEMES UX:
- Le bouton "Calendrier" dans "Prochaines dates" mène à un onglet "Bientôt disponible" — frustrant
- Pas de pull-to-refresh
- Pas de skeleton loading pour les cartes projets

### MyProjects.jsx (330 lignes)
PROBLEMES TEXTES:
- Aucun accent manquant détecté — bien

PROBLEMES LOGIQUE:
- handleDelete supprime project_members puis organizations — mais ne supprime PAS les données liées (stock, products, movements, events, etc.) — FUITE DE DONNÉES ORPHELINES
- La suppression est "irréversible" mais ne supprime que 2 tables sur ~30
- Le menu contextuel (⋯) ne se ferme pas quand on clique ailleurs — pas de click-outside handler
- Pas de confirmation par saisie du nom du projet pour la suppression (pattern standard pour les actions destructives)
- Le slug n'est pas vérifié pour l'unicité (ni dans CreateProjectForm ni dans EditProjectForm)
- ALL_MODULES est dupliqué entre MyProjects.jsx et Melodie.jsx — risque de désynchronisation

PROBLEMES UX:
- Le bouton "Supprimer" utilise un emoji 🗑 au lieu d'une icône Lucide — incohérent avec le reste de l'app
- La couleur de suppression est #7C3AED (violet) au lieu de rouge — confus, le violet est la couleur de la marque
- Pas de drag-and-drop pour réordonner les projets
- Pas de recherche/filtre quand on a beaucoup de projets

### ProfilePage.jsx (1215 lignes) — Partiellement lu (lignes 1-400)
PROBLEMES:
- Le composant fait 1215 lignes — monolithique, devrait être découpé
- 6 sous-onglets (Identité, Pro, Projets, Matériel, Calendrier, Finances) — c'est un mini-app dans l'app
- Les données sensibles (IBAN, N° SS) sont masquées avec un toggle — bien
- Le bouton "Déconnexion" est en bas de la page profil — pas intuitif, devrait être dans un menu settings
- Le gradient de fond "FFF8F0" est différent du reste de l'app (blanc pur) — incohérent
- Le padding bottom de 120px est excessif

### Calendrier (dans App.jsx, couche personnelle)
PROBLEMES:
- L'onglet "Mon calendrier" affiche juste un placeholder "Bientôt disponible" — fonctionnalité promise mais non implémentée
- Le bouton "Calendrier" dans PersonalDashboard mène à ce placeholder — frustrant
- C'est un onglet de la bottom nav qui ne fait RIEN — devrait être masqué ou implémenté

## COUCHE 3 — Onglets Principaux

### Board.jsx (600 lignes) — Dashboard Projet
PROBLEMES TEXTES (accents manquants):
- "Vue complete" → "Vue complète" (ligne 186)
- "sous ta responsabilite" → "sous ta responsabilité" (ligne 186)
- "items prets" → "items prêts" (ligne 217)
- "Entree" → "Entrée" (ligne 284)
- "Stock par categorie" → "Stock par catégorie" (ligne 357)
- "Aucun mouvement enregistre" → "Aucun mouvement enregistré" (ligne 478)
- "Evenements a venir" → "Événements à venir" (ligne 522)
- "Voir toute la tournee" → "Voir toute la tournée" (ligne 562)
- "Entrees" → "Entrées" (légende graphique, ligne 394/408)

PROBLEMES LOGIQUE:
- Le lien "EK LIVE" (ligne 290) est hardcodé "/live" avec target="_blank" — c'est une route interne qui ouvre dans un nouvel onglet, pas un lien externe. Incohérent avec l'icône ExternalLink
- Le Board affiche 10+ sections sans possibilité de les réduire/masquer — surcharge d'information
- recentMoves = movements.slice(0, 5) — suppose que movements est déjà trié par date, ce qui dépend de l'appel API dans App.jsx
- myLowStock = alerts.slice(0, 5) — même problème, pas de tri explicite
- Le graphique "Mouvements 7 jours" filtre par startsWith(key) sur created_at — fragile si le fuseau horaire change
- Pas de bouton "Voir tout" pour les mouvements récents
- Le calcul des jours J-n dans les événements utilise new Date(ev.date) au lieu de parseDate — risque du bug J-1 timezone

PROBLEMES UX:
- Le dashboard est un long scroll vertical — pas de sections collapsibles
- Pas de pull-to-refresh
- Le lien "Voir fiche" sur le prochain concert est trop petit (fontSize 10) et pas assez visible
- Les quick actions "Entrée/Sortie/Transfert" ouvrent un modal mais pas de retour visuel immédiat
- Le graphique de mouvements est très petit (100px de haut) — difficile à lire

### Products.jsx (462 lignes) — Gestion des Produits
PROBLEMES TEXTES (accents manquants):
- "Categorie" → "Catégorie" (ligne 352)
- "Unite" → "Unité" (ligne 377)
- "Piece" → "Pièce" (ligne 379)
- "Metre" → "Mètre" (ligne 380)
- "Comptabilite" → "Comptabilité" (ligne 405)
- "Cout HT" → "Coût HT" (ligne 409)
- "Duree amortissement" → "Durée amortissement" (ligne 420)
- "comptabilise en charge" → "comptabilisé en charge" (ligne 426)
- "Immobilisation - renseigner la duree" → "Immobilisation - renseigner la durée" (ligne 431)

PROBLEMES LOGIQUE:
- handleDelete supprime stock → movements → products séquentiellement (non atomique) — si erreur à mi-chemin, données incohérentes
- Le SKU n'est pas vérifié pour l'unicité — deux produits peuvent avoir le même SKU
- Le seuil d'alerte par défaut est 5 (ligne 212, 329) — hardcodé, devrait être configurable
- Le champ "Emoji / Image" accepte soit un emoji soit une URL — confus pour l'utilisateur
- Le bouton CSV est labellé "CSV" mais c'est un import, pas un export — l'icône FileDown suggère un export
- Pas de validation du format SKU
- Le placeholder "T-shirt Solda Lanmou Homme Noir" est trop spécifique au projet E.sy Kennenga — pas générique pour un SaaS

PROBLEMES UX:
- La recherche ne cherche pas dans les variantes
- Pas de tri possible (par nom, stock, date de création)
- Pas de sélection multiple pour actions groupées (suppression, export)
- Le formulaire de produit est un long scroll dans un modal — pas d'étapes
- La section "Comptabilité" dans le formulaire produit est avancée et peut intimider un utilisateur non-comptable

### Stocks.jsx et Depots.jsx — CHEVAUCHEMENT FONCTIONNEL
PROBLEMES ARCHITECTURE:
- Stocks.jsx et Depots.jsx font la MÊME chose : afficher les lieux de stockage avec leur contenu
- Stocks.jsx = vue "stock par lieu" avec accordéons
- Depots.jsx = vue "dépôts" avec cartes et détail
- Les deux permettent d'ajouter un lieu, de voir le stock par lieu, et de faire des mouvements
- Les deux ont des systèmes d'icônes DIFFÉRENTS (ICON_MAP vs DEPOT_ICON_MAP) — incohérent
- La suppression dans Depots.jsx est plus agressive (efface stock + movements + locations) vs Stocks.jsx (efface juste la location)
- RECOMMANDATION : Fusionner en un seul onglet "Dépôts & Stock" avec deux vues (liste/détail)

## COUCHE 3 — Onglets Secondaires

### Equipe.jsx (1622 lignes) — Le plus gros composant
PROBLEMES:
- 1622 lignes dans un seul fichier — MONOLITHIQUE, devrait être découpé en 5+ sous-composants
- 226 blocs style={{}} inline — le plus gros contributeur aux styles inline
- HIERARCHY, ROLE_RELATIONS, ROLE_MISSIONS, ROLE_ORDER sont hardcodés — pas configurable par l'admin
- Les codes de rôles (TM, PM, TD, SE, LD, SM, BL, MM, LOG, SAFE, AA, PA) sont spécifiques au spectacle vivant — pas générique pour un SaaS
- La vue "Planning" calcule les tâches par date avec new Date(evt.date + 'T00:00:00') — risque timezone

### Finance.jsx — Bon mais incomplet
PROBLEMES:
- 5 sections internes (overview, revenue, expenses, bilan, depreciation) — beaucoup pour un seul onglet
- La section "Bilan" ne montre que les concerts passés — pas de projection financière
- La section "Amortissement" est très technique (prorata temporis base 360j) — peut intimider
- Le message "Seuil immobilisation : 500€ HT" est hardcodé — dépend de la législation

### Achats.jsx — Workflow correct mais fragile
PROBLEMES:
- Le workflow de statut (draft → sent → confirmed → shipped → received) est séquentiel et irréversible
- Pas de bouton "Annuler la commande"
- Les lignes de commande sont ajoutées une par une — pas d'import en masse
- Le total HT est calculé côté client — risque d'incohérence avec la base

### Transport.jsx — Bien structuré
PROBLEMES:
- 4 sous-sections (overview, events, providers, routes) — cohérent
- Le workflow de statut des besoins transport est bien fait
- Les coûts sont affichés en EUR — pas de gestion multi-devises

### Forecast.jsx — Bon concept
PROBLEMES:
- 3 scénarios (pessimiste/réaliste/optimiste) — bonne approche
- Les ratios de vente (low=0.3, mid=0.5, high=0.7) sont hardcodés — devrait être configurable
- Pas de possibilité de sauvegarder les prévisions

### Inventaire.jsx — Simple et efficace
PROBLEMES:
- Workflow clair : sélectionner un lieu → compter → valider
- Les écarts sont corrigés par des mouvements automatiques — bon
- Pas d'historique des inventaires passés

### Alerts.jsx — Centre de notifications
PROBLEMES:
- Bien structuré avec filtres (tous/ruptures/alertes/concerts)
- Pas de notifications push — juste un affichage passif
- Pas de bouton "Marquer comme lu" ou "Ignorer"

## COMPOSANTS TRANSVERSAUX

### Settings.jsx (modules) — 2 sous-onglets
- "Accès" (AccessManager) et "Modules" — bien séparé
- Le toggle de modules avec gestion des dépendances est élégant
- Pas de confirmation avant de désactiver un module qui contient des données

### Scanner.jsx — Bon mais fragile
- Utilise BarcodeDetector API (pas supporté partout)
- Fallback mode manuel — bien
- Pas de gestion de la permission caméra refusée de manière claire

### MovementModal.jsx — Compact et fonctionnel
- 168 lignes — bien dimensionné
- Gère les 3 types (in/out/transfer) — cohérent
- Vérifie le stock disponible avant sortie — bon
- Le transfert fait 2 opérations séparées (out + in) — non atomique

### Legal.jsx — CGU et Privacy
- Contenu juridique basique mais présent
- "Droit français, tribunaux de Fort-de-France" — correct pour la Martinique
- Pas de consentement explicite aux cookies (RGPD)

## COUCHE LIVE

### LiveApp.jsx (429 lignes)
- Application fan séparée — bonne architecture
- fanId persistant en localStorage — pas de vrai auth
- Polices Google Fonts injectées dynamiquement — impact performance
- Beaucoup de placeholders vides (icon: '', blocs vides)
- Branding "E.sy Kennenga" hardcodé — pas générique

### LiveShop.jsx (292 lignes)
- Boutique merch pour les fans
- Pas de validation du numéro de téléphone
- Pas de confirmation de commande
- Pas de gestion de stock en temps réel (peut commander un produit épuisé)

### LiveSetlist.jsx (219 lignes)
- Vote de setlist par les fans — feature originale
- Un vote par chanson par fan (via fanId) — bien
- Pas de limite de votes totaux

### LiveDisplay.jsx (125 lignes)
- Écran de projection des réactions — bien fait
- requestFullscreen avec fallback webkit — bon

## LOGIQUE GLOBALE

### Navigation (App.jsx)
ARCHITECTURE:
- Couche 1: Landing/Auth/Melodie (non connecté)
- Couche 2: Personal (home/projects/calendar/profile) — bottom nav 4 onglets
- Couche 3: Project (board + N onglets configurables) — bottom nav dynamique
- Transition: Couche 2 → Couche 3 via enterProject()
- Retour: Couche 3 → Couche 2 via backToPersonal()

PROBLEMES:
- Pas de deep linking / routing — impossible de partager un lien vers un onglet
- Le bouton "retour" du navigateur ne fonctionne pas (pas de history management)
- Le scroll position est sauvegardé par tab (BUG-009 fix) — bon
- Pas de breadcrumb pour savoir où on est dans la hiérarchie

### Design System
PROBLEMES MAJEURS:
- 2413 blocs style={{}} inline dans tout le code — ENORME
- 6 définitions de couleurs différentes (colors, COLORS, COLOR, C, PALETTE, hardcoded)
- Les CSS variables existent dans index.css mais ne sont PAS utilisées dans les composants
- Zéro media query — pas de responsive desktop
- Zéro dark mode malgré les variables CSS prêtes
- Le CSS global fait 450 lignes mais les composants utilisent 95% de styles inline
- La couleur "success" est #16A34A dans 3 fichiers et #10B981 dans Melodie.jsx

### Textes et Accents
- 40+ textes sans accents identifiés (Entree, Categorie, Evenement, etc.)
- Tous dans les composants Board, Products, Melodie, PersonalDashboard
- Les composants Equipe, Finance, Achats, Transport ont des accents corrects
- Incohérence : certains fichiers ont été relus, d'autres non

### Suppressions Non-Atomiques
- Products.jsx: delete stock → delete movements → delete products (3 opérations)
- Depots.jsx: delete stock → delete movements(from) → delete movements(to) → delete locations (4 opérations)
- MyProjects.jsx: delete project_members → delete organizations (2 opérations)
- Aucune de ces suppressions n'utilise de transaction ou de procédure stockée
