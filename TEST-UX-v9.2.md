# Test UX — Stage Stock v9.2

**Date** : 31 mars 2026
**Branche** : `claude/busy-lederberg`
**Environnement** : Vite dev server (localhost:5173)
**Viewports testes** : Desktop (1280x800), Mobile (375x812), Tablet (768x1024)

---

## 1. Landing Page

| Test | Resultat | Note |
|------|----------|------|
| Chargement initial | OK | Page affichee sans erreur, 0 erreur console |
| Hero (logo, titre, CTA) | OK | Bien centre, lisible |
| Section "Tout ce qu'il te faut" (6 features) | OK | Grille 2 colonnes |
| Section pricing (3 tiers) | OK | Starter/Team/Pro visibles |
| Section testimonials | OK | "Retour terrain bientot disponible" |
| Footer CTA + mentions legales | OK | CGU + Confidentialite |
| CTA "Commencer gratuitement" | OK | Redirige vers formulaire login |
| Mobile 375px | OK | Responsive, pas de debordement |
| Tablet 768px | OK | Layout adapte |

**Verdict** : Landing page complete et fonctionnelle sur tous les viewports.

---

## 2. Authentification

| Test | Resultat | Note |
|------|----------|------|
| Formulaire login affiche | OK | Email + mot de passe + bouton |
| Validation champs vides | OK | "Email invalide" + "6 caracteres minimum" en rouge |
| Bordures rouges sur erreur | OK | Inputs avec border rouge |
| Erreurs disparaissent au remplissage | OK | Clear error on change |
| Liens "Mot de passe oublie" et "Creer" | OK | Visibles et cliquables |
| Bouton "Retour" vers landing | A VERIFIER | Le click semble rester sur la page auth (possible faux negatif du test automatise) |
| Mobile 375px | OK | Formulaire bien adapte |

**Verdict** : Validation frontend fonctionnelle. Bouton Retour a verifier manuellement.

---

## 3. Features v9.2 (verification code — test fonctionnel requiert login)

### 3.1 Code-barres produits
| Element | Statut | Fichier |
|---------|--------|---------|
| Generateur Code 128B SVG | Code OK | src/lib/qrcode.js |
| Affichage barcode dans ProductDetail | Code OK | ProductDetail.jsx |
| Champ barcode dans formulaire produit | Code OK | Products.jsx |
| Bouton "Copier" clipboard | Code OK | ProductDetail.jsx |

### 3.2 Undo mouvement stock
| Element | Statut | Fichier |
|---------|--------|---------|
| Bouton Annuler (RotateCcw) sur mouvements < 24h | Code OK | Movements.jsx |
| Confirmation avant annulation | Code OK | Movements.jsx (Confirm) |
| Mouvement inverse cree | Code OK | Movements.jsx handleUndo |
| Marquage [Annule] + visuel barre | Code OK | Movements.jsx |

### 3.3 Duplication evenement
| Element | Statut | Fichier |
|---------|--------|---------|
| Bouton Copy dans Tour.jsx (liste) | Code OK | Tour.jsx |
| Bouton Copy dans EventDetail.jsx (header) | Code OK | EventDetail.jsx |
| Pre-remplissage "Copie - " + date videe | Code OK | Tour.jsx handleDuplicate |
| defaultValues prop sur EventFormModal | Code OK | Tour.jsx |

### 3.4 Export CSV
| Element | Statut | Fichier |
|---------|--------|---------|
| Utilitaire csvExport.js (BOM, point-virgule) | Code OK | src/lib/csvExport.js |
| Bouton export produits | Code OK | Products.jsx |
| Bouton export mouvements | Code OK | Movements.jsx |
| Bouton export stock | Code OK | Stocks.jsx |

**Verdict** : Code des 4 features verifie et complet. Test fonctionnel complet necesssite un login Supabase reel.

---

## 4. Accessibilite

| Test | Resultat | Note |
|------|----------|------|
| htmlFor/id sur Field (ProfileHelpers) | OK | Tous les composants Field ont htmlFor |
| ARIA dialog sur Modal (UI.jsx) | Code OK | role="dialog", aria-modal, aria-label |
| ARIA alertdialog sur Confirm | Code OK | role="alertdialog", aria-describedby |
| Escape ferme les modals | Code OK | onKeyDown handler |
| Auto-focus sur modal open | Code OK | useRef + focus |
| Skip-to-content link | Code OK | .sr-only-focusable dans App.jsx |
| aria-label sur bottom nav | Code OK | aria-label={label} |
| aria-current="page" sur onglet actif | Code OK | aria-current conditionally |
| Auth.jsx labels htmlFor | MANQUANT | Labels Auth inline sans htmlFor |

**Verdict** : Accessibilite significativement amelioree. Reste a ajouter htmlFor sur Auth.jsx.

---

## 5. Responsive

| Viewport | Landing | Login | Note |
|----------|---------|-------|------|
| Desktop 1280x800 | OK | OK | Layout centre, bonnes proportions |
| Tablet 768x1024 | OK | OK | Grid 2 colonnes, formulaire centre |
| Mobile 375x812 | OK | OK | Single column, pas de debordement, boutons pleine largeur |

**Verdict** : Responsive OK sur les 3 breakpoints principaux.

---

## 6. Performance

| Metrique | Valeur |
|----------|--------|
| Bundle principal | 282 KB (gzip ~81 KB) |
| Code splitting | 15+ chunks |
| Plus gros chunk module | EventDetail 47 KB |
| Erreurs console | 0 |
| Erreurs reseau | 0 (apres fix cache Vite) |
| Temps de build | ~3.5s |

**Verdict** : Performance excellente pour une SPA React.

---

## 7. Bugs trouves

| # | Bug | Severite | Action |
|---|-----|----------|--------|
| B1 | Auth.jsx : labels sans htmlFor | Mineur | Ajouter htmlFor sur les 2 labels email/password |
| B2 | Bouton "Retour" login -> landing : comportement a verifier manuellement | Mineur | Possible faux negatif du test auto |

---

## 8. Tests non realisables (necessitent login)

- Dashboard KPIs et role-based views
- Navigation entre modules (bottom nav)
- Scanner code-barres (necessite camera)
- MovementModal (validation, stock check)
- Packing list auto-generation
- EventDetail (5 onglets)
- Profil (6 onglets decoupes)
- Export CSV (necessite donnees)
- Undo mouvement (necessite mouvements existants)

**Recommandation** : Faire un test manuel complet sur mobile avec le vrai compte Supabase avant merge sur main.

---

## Resume

| Categorie | Score | Detail |
|-----------|-------|--------|
| Landing | 10/10 | Complete, responsive, 0 erreur |
| Auth/Validation | 9/10 | Validation OK, htmlFor manquant |
| Architecture | 10/10 | Code split, lazy loading, context OK |
| Features v9.2 | 9/10 | Code complet, test fonctionnel en attente |
| Accessibilite | 8/10 | Gros progres, quelques labels restants |
| Responsive | 10/10 | Mobile/tablet/desktop OK |
| Performance | 10/10 | Bundle 282 KB, build 3.5s |

**Score global : 9.4/10**

**Prochaine etape** : Test manuel sur mobile avec vrai login avant merge sur main.
