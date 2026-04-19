# Audit UX / Visuel / PNL — BackStage

**Date** : 19 avril 2026
**Methode** : Screenshots Landing/Auth + analyse code source des 9 pages principales
**Grille** : Structure, Couleurs, Icones, CTA, Emotion, Coherence metier, Efficacite PNL

---

## NOTE GLOBALE : **7.2 / 10**

Structurellement solide. Trop "soft" pour du premium SaaS.

---

## TABLEAU DE NOTES PAR PAGE

| Page | Structure | Couleurs | Icones | CTA | Emotion | PNL | Metier | **Global** |
|------|-----------|----------|--------|-----|---------|-----|--------|------------|
| **Landing** | 8 | 6 | 8 | 7 | 5 | 5 | 6 | **7/10** |
| **Auth** | 7 | 7 | 6 | 8 | 4 | 4 | 5 | **6.5/10** |
| **Board (dashboard)** | 9 | 7 | 9 | 8.5 | 7 | 7 | 9 | **8.5/10** |
| **Tour (liste concerts)** | 7 | 6.5 | 8 | 7 | 6 | 6 | 8 | **7/10** |
| **EventDetail (fiche)** | 8 | 7 | 8 | 7 | 7 | 7 | 9 | **7.5/10** |
| **Articles Catalogue** | 7 | 6 | 7 | 7 | 5 | 5 | 7 | **6.5/10** |
| **Articles Stock (Depots)** | 7.5 | 7.5 | 8 | 7 | 6 | 6 | 8 | **7.5/10** |
| **Articles Mouvements** | 7 | 7 | 8 | 7 | 6 | 6 | 8 | **7/10** |
| **ProductDetail** | 7 | 7 | 7 | 7 | 6 | 5 | 7 | **6.5/10** |
| **PersonalDashboard** | 7 | 7 | 7 | 7 | 7 | 7 | 6 | **7/10** |

---

# ANALYSE PAR PAGE

## 1. LANDING — 7/10 "Honnête mais passive"

### Ce qu'on voit
Logo cube violet `#6366F1` centre, titre "BackStage", 2 boutons "Premiere connexion" (bleu marine) + "Se connecter" (outline).

### Points forts
- Minimaliste, zero distraction
- Hierarchie claire (logo → titre → 2 CTAs)
- Charge rapidement

### Points faibles
- **Pas de tagline** : on ne comprend pas en 2s ce que ca fait
- **Bouton "Premiere connexion"** : formulation floue (c'est S'INSCRIRE qu'on veut voir)
- **Bleu marine `#5B8DB8`** : triste, pas en coherence avec le logo violet
- **Aucun visuel** du produit (capture d'ecran, photo de tournee)
- **Zero preuve sociale** (pas de "+200 artistes nous font confiance")
- **Pas de tagline PNL** type "Ne perds plus jamais un article pendant ta tournee"

### Recommandations PNL
- Tagline sensorielle : **"Pilote ton stock merch en tournee. Du fond de scène, en 3 clics."**
- Bouton principal : **"Commencer"** (non menaçant) + accent degrade violet BackStage
- Photo d'un stand merch en arriere-plan avec overlay sombre
- Preuve sociale : "4.8/5 · 150+ tournees gerees"

---

## 2. AUTH — 6.5/10 "Fonctionnel mais sec"

### Ce qu'on voit
"Cree ton compte" + 3 champs (prenom, email, password) + bouton "S'inscrire" + lien "Passer" en bas.

### Points forts
- Formulaire court (3 champs seulement)
- Validation inline
- Focus state visible
- Lien "Deja un compte" pour toggle

### Points faibles
- **"Cree ton compte" = froid** : pas de bienvenue
- **"Passer" en bas** : cree de la friction (pourquoi j'aurais envie de passer ?)
- **Pas de reassurance** : pas de "Tes donnees sont protegees" ou "Tu peux supprimer ton compte a tout moment"
- **Pas de social login** (Google, Apple) = 30-50% de perte potentielle sur signup
- **Pas de visualisation** des criteres de mot de passe
- **Pas de feedback progressif** : rien ne dit "Bien ! Plus qu'un champ"

### Recommandations PNL
- Titre : **"En 30 secondes tu es operationnel"** (ancrage temporel)
- Micro-victoires : "Bien reçu !" apres le prenom, "Email valide ✓" apres email
- Reassurance visible : ligne "Pas d'engagement · Suppression en 1 clic · RGPD"
- Social login en tete : Google, Apple (1 clic au lieu de 3 champs)

---

## 3. BOARD (Dashboard) — 8.5/10 "Le meilleur module"

### Ce qu'on voit
Role welcome card → 4 KPIs perso → packing progress → next event → 3 quick actions (Entree/Sortie/Transfert) → alerts → stock par categorie → graphique 7j → mouvements recents → events a venir.

### Points forts
- **Hierarchie excellente** : on voit son role, son impact, son prochain concert en 2s
- **KPIs personalises par role** (TM voit pas la meme chose que MM)
- **3 quick actions** ultra visibles = regle 3 clics respectee
- **Alerts couleurs semantiques** (rouge=rupture, orange=alerte)
- **Graphique mouvements 7j** = comprend sa velocity
- **19 KPIs au total** apres Phase K (valeur stock, rotation, dormant, etc.)

### Points faibles
- **Peu d'animations** : scroll lourd, pas de fade-in sur cards
- **Indigo soft** : manque d'energie premium
- **Pas de gradient riches** sur les KPI cards principaux
- **Contraste secondaire faible** : `#94A3B8` sur `#F8FAFC` = fail WCAG AA
- **Navigation bottom petite** : icones 18px difficiles a toucher sur mobile

### Recommandations PNL
- **Metaphore theatrale** : role welcome card = "Toi, Tour Manager de EK TOUR 25 ANS, voici ton quartier general"
- Animer les KPIs au chargement (count-up de 0 a la valeur)
- Ajouter une **ligne gagnante** en haut si KPIs verts : "Tout est sous controle · 0 rupture · 100% pack"
- Sinon : "2 ruptures a traiter · Tap pour agir"
- Micro-celebration quand on resout une alerte (confetti subtle 1s)

---

## 4. TOUR (liste concerts) — 7/10 "Standard mais efficace"

### Points forts
- Cards concerts avec date + lieu + badge statut
- Filtre par statut
- Bouton "Ajouter concert" visible

### Points faibles
- **Pas de vue calendrier** : juste une liste
- **Pas de map geographique** pour visualiser la tournee
- **Badge statut plat** : pas d'impact visuel fort

### Recommandations PNL
- **Toggle Liste / Carte / Calendrier** (visual thinker vs sequential thinker = 2 profils utilisateurs)
- Highlight couleur sur le concert du jour (pulse subtle)
- Thumbnail image/illustration par type de concert (concert, festival, showcase)

---

## 5. EVENTDETAIL (fiche concert) — 7.5/10

### Points forts
- 5 onglets clairs : Resume / Equipe / Check / Packing / Previsions
- Countdown J-X visible
- Navigation prev/next concerts

### Points faibles
- **Fullscreen overlay = claustrophobe** : pas de breadcrumb, pas de sidebar
- **5 tabs =** peut frôler la loi de Hick (7±2) si on ajoute d'autres
- **Prev/next peu decouvrable** : boutons planques

### Recommandations PNL
- **Metaphore "Carnet de tournee"** : fiche ressemble a une page de journal/carnet
- Onglets en icones + labels (actuellement labels seuls, lisibles mais pas scannables)
- Progress bar globale : "Preparation 80% · Il te reste 3 tasks"

---

## 6. ARTICLES / CATALOGUE — 6.5/10

### Points forts
- Search bar proeminente
- Filtres categorie + sous-famille
- CRUD accessible

### Points faibles
- **Liste plate** : pas de thumbnails images
- **Pas de tri intelligent** (par stock, par ventes, par marge)
- **Empty state pauvre** si zero produit
- **Pas de bulk select** pour actions multiples

### Recommandations PNL
- **Grid avec photos** produits (visuel avant tout pour merch)
- Tri smart : "Top ventes", "Plus faible stock", "Plus haute marge"
- Actions rapides au hover/long-press : "+1 au stock" sans ouvrir la fiche
- Empty state inspirant : "Premier pas : ajoute ton t-shirt phare !"

---

## 7. ARTICLES / STOCK (Depots) — 7.5/10

### Points forts
- Header gradient subtil bleu
- KPIs par lieu
- Liste par location avec qty et nb produits

### Points faibles
- **Pas de visualisation carte** des lieux (important pour multi-iles Martinique/Guadeloupe)
- **Pas de drag-and-drop** pour transferts entre lieux

### Recommandations PNL
- Mini-carte des Antilles avec cercles proportionnels au stock par lieu
- Drag-and-drop entre colonnes lieux pour transfert rapide

---

## 8. ARTICLES / MOUVEMENTS — 7/10

### Points forts
- Groupement par date (Aujourd'hui, Hier, Cette semaine)
- Filtre type in/out/transfer
- Icones semantiques

### Points faibles
- **Densite forte** : chaque ligne est chargee
- **Pas d'export CSV direct** depuis la vue

### Recommandations PNL
- **Timeline verticale** plutot que liste : plus visuel, plus narratif
- Bouton export CSV en haut a droite

---

## 9. PRODUCTDETAIL — 6.5/10

### Points forts
- Stock par location affiche
- Historique mouvements
- CA par concert

### Points faibles
- **Page tres longue** : toutes les infos dans un scroll
- **Pas de sections collapsibles**
- **Photo produit grande SI remplie** mais souvent absente

### Recommandations PNL
- **Fiche type "carte produit"** : photo grande, info essentielle au-dessus du fold
- Sections accordeon (Stock / Mouvements / CA / Fournisseur)
- Bouton "Voir tout" au bas de chaque section

---

## 10. PERSONAL DASHBOARD — 7/10

### Points forts
- "Salut {prenom} !" = chaleureux
- Avatar, completion profil
- Liste projets

### Points faibles
- **Trop court** : peu de contexte
- **Pas de stats personnelles** (mes ventes ce mois, mon impact tournee)

---

# ANALYSE PNL GLOBALE

## Les 8 principes PNL evalues

| Principe | Note | Verdict |
|----------|------|---------|
| **1. Ancrage emotionnel** | 5/10 | Role welcome bien. Mais rien de memorable (pas d'onboarding emotionnel, pas de wow visuel) |
| **2. Langage sensoriel** | 5/10 | Copy utilitaire. Manque verbes d'action forts (vs "Pilote", "Visualise", "Anticipe") |
| **3. Economie cognitive (Hick)** | 8/10 | < 7 choix principaux partout. 3 onglets apres Phase K = excellent |
| **4. Hierarchie visuelle** | 8.5/10 | Tres bonne, oeil sait ou aller en 2s |
| **5. Metaphore metier** | 6/10 | Vocabulaire tournee/merch OK mais pas incarne visuellement (pas d'illustration concert, pas d'image de stand) |
| **6. Feedback positif** | 6/10 | Toasts OK, micro-wins manquent (pas de celebration quand on resout une alerte) |
| **7. Reduction friction** | 8/10 | Regle 3 clics respectee majoritairement apres Phase K |
| **8. Personnalisation** | 8/10 | Role-based view = excellent. Pourrait aller plus loin (theme couleur par role) |

**Note PNL globale : 6.8/10**

---

# PALETTE COULEURS — DIAGNOSTIC

## Actuel
```
--accent:        #6366F1  (indigo soft)
--bg-base:       #FFFFFF
--bg-surface:    #F8FAFC
--text-primary:  #1E293B
--success:       #16A34A
--danger:        #DC2626
--warning:       #D97706
```

## Probleme
- **Indigo `#6366F1` = gentil** : OK pour une app de notes, mais un outil pro pour la tournee demande plus de caractere
- **Pas de couleur premium** : pas d'or, pas de noir profond, pas de purple sature
- **Semantiques OK** mais jamais de degrade

## Recommendation : nouvelle palette BackStage v2
```
--accent:         #7C3AED  (purple sature, coherent avec gradient logo)
--accent-hover:   #6D28D9  (purple deeper)
--accent-gradient: linear-gradient(135deg, #8B5CF6 0%, #5B21B6 100%)  (signature)
--gold:           #D4A843  (premium touch pour badges)
--text-primary:   #0F172A  (black deeper)
```

---

# ICONES — DIAGNOSTIC

## Actuel : Lucide React (bon choix)
Coherence : 9/10 — icones metier-aware (Package, Tent, Calendar, TrendingUp)

## Manques
- Pas d'icone custom pour le **scene** (tournee)
- Pas d'icone **merch stand**
- Icones tres petites dans bottom nav (18px → devrait etre 22-24px)

---

# REGLE DES 3 CLICS — AUDIT

| Action | Clics actuels | OK ? |
|--------|---------------|------|
| Voir liste articles | 1 | Oui |
| Ajouter article | 2 | Oui |
| Modifier un article | 2 | Oui |
| Voir historique mouvements | 2 (Articles → sous-vue) | Oui |
| Entree stock | 2-3 | Oui |
| Sortie stock | 2-3 | Oui |
| Voir liste concerts | 1 | Oui |
| Voir fiche concert | 2 | Oui |
| Voir KPIs globaux | 0 (Board direct) | Oui |
| Voir top ventes | 0 (Board direct) | Oui |
| Modifier son profil | 3 (Personal → Profil → Edit) | Oui |
| Desactiver un module | 3 (Plus → Settings → toggle) | Oui |
| Exporter stock CSV | 3 | Oui |

**Verdict** : apres Phase K, **100% des actions principales sont en ≤ 3 clics**.

---

# PLAN DE REFONTE — PHASE L

## Priorite 1 (4-6h) — "Polish Premium"

1. **Changer accent #6366F1 → #7C3AED (purple sature)** coherent avec logo
2. **Ajouter degrade signature** sur CTAs principaux (card headers, boutons primaires)
3. **Augmenter taille icones bottom nav** (18 → 22px, labels 10 → 12px)
4. **Ameliorer contraste** : #94A3B8 → #64748B pour texte secondaire sur surfaces claires
5. **Animations micro** : count-up KPIs au chargement Board, pulse sur alertes critiques, lift shadow au hover cards

## Priorite 2 (6-8h) — "Dashboard merch hero"

6. **Landing page refondue** : tagline PNL, photo merch stand en hero, preuve sociale, 3 CTA avec clarte
7. **Auth** : social login Google/Apple, micro-victoires, reassurance
8. **Board hero** : ligne gagnante en haut ("Tout sous controle" / "2 alertes a traiter")
9. **Tour** : toggle Liste / Carte / Calendrier

## Priorite 3 (1 semaine) — "Dark mode + data viz"

10. **Dark mode** complet (CSS vars deja prets, il manque que le toggle + media query)
11. **Charts riches** : remplacer barres simples par courbes smooth (recharts ou ligne simple SVG)
12. **Grid articles avec photos** au lieu de liste plate

## Priorite 4 (2 semaines) — "Metaphore artistique"

13. **Theming par role** : MM = violet, TM = bleu, LD = jaune (comme les feux de scene)
14. **Illustrations** : stand merch, tournee (multi-iles), concerts
15. **Video/animation** d'onboarding (3 slides immersives)

---

# VERDICT

**L'app est professionnelle et fonctionnelle (7.2/10) mais manque de polish premium.**

Points critiques pour un SaaS paye :
- Indigo trop soft → passer au purple sature (coherent avec logo)
- Pas de dark mode (outil pro utilise tard le soir)
- Animations minimales (user veut "sentir" que l'app repond)
- Landing passive (on ne comprend pas la promesse en 2s)
- Pas d'illustration metier (tout est abstrait)

**Avec la Phase L recommendee, on passerait a 8.7/10.**

Documents :
- `AUDIT-UX-VISUEL-PNL.md` : ce document
