# BackStage WMS — Merch Edition
## Document de reference metier & technique

**Objectif** : Gerer le stock merchandising de la tournee EK TOUR 25 ANS
**Approche** : Brider BackStage aux modules merch (pas de nouveau projet)
**Utilisateur principal** : Gio (Tour Manager / Merch Manager)

---

# PARTIE 1 — PROCESS METIER

## 1. Cycle de vie d'un article merch

```
CREATION → APPROVISIONNEMENT → STOCKAGE → DISTRIBUTION → VENTE → BILAN
```

### 1.1 Creation article
Un article merch a ces attributs :

| Champ | Obligatoire | Exemple |
|-------|-------------|---------|
| Nom | Oui | T-shirt Homme Kaki Gildan |
| SKU | Oui | SL-TSH-KAK-S |
| Categorie | Oui | Textiles |
| Sous-categorie | Non | T-shirts Homme |
| Marque/Collection | Oui | Solda Lanmou |
| Fournisseur | Oui | Gildan via imprimeur local |
| Prix d'achat HT | Oui | 5.00 EUR |
| Prix de vente TTC | Oui | 25.00 EUR |
| Tailles/Variantes | Si applicable | S, M, L, XL, XXL |
| Code-barres | Recommande | Auto-genere ou saisi |
| Photo | Recommande | URL image |
| Seuil alerte stock | Oui | 10 unites |
| Statut | Auto | Actif / Inactif |

**Convention SKU recommandee** :
```
[COLLECTION]-[TYPE]-[COULEUR]-[TAILLE]
SL-TSH-KAK-S    = Solda Lanmou / T-shirt / Kaki / Small
SL-TSH-KAK-M    = Solda Lanmou / T-shirt / Kaki / Medium
SL-POL-NOI-L    = Solda Lanmou / Polo / Noir / Large
EK25-POS-A2     = EK 25 Ans / Poster / A2
EK25-MUG-001    = EK 25 Ans / Mug / #001
```

---

## 2. Approvisionnement (Achats)

### 2.1 Process complet

```
BESOIN → COMMANDE → SUIVI → RECEPTION → CONTROLE → MISE EN STOCK
```

**Etape 1 — Identification du besoin**
- Consultation des niveaux de stock actuels
- Alerte automatique quand stock <= seuil min
- Prevision basee sur le calendrier de tournee (nombre de dates, capacite salles)
- Decision : quelle quantite commander ?

**Etape 2 — Commande fournisseur (Bon de Commande)**
- Selection du fournisseur
- Creation du BC avec lignes de commande :
  - Article, quantite, prix unitaire HT, taux TVA
  - Date de livraison souhaitee
  - Lieu de livraison (depot)
- Statuts du BC :

```
BROUILLON → ENVOYE → CONFIRME → EXPEDIE → RECU (partiel/total) → CLOTURE
                                                   ↘ LITIGE
```

**Etape 3 — Reception marchandise**
- A la reception, on controle :
  - Quantite recue vs quantite commandee
  - Qualite / etat des articles
  - Conformite (bons modeles, bonnes tailles, bonnes couleurs)
- On saisit les quantites recues par ligne
- **Le stock est mis a jour automatiquement** a la validation de la reception
- Si ecart : on note le litige (manquant, defectueux, erreur)

**Etape 4 — Cloture**
- BC totalement recu → statut CLOTURE
- BC partiellement recu → reste ouvert jusqu'a reception complete
- Possibilite d'annuler les lignes non livrees

### 2.2 Documents generes
| Document | Quand | Contenu |
|----------|-------|---------|
| Bon de Commande (BC) | A la creation | Articles, qte, prix, fournisseur, date |
| Bon de Reception (BR) | A la reception | Qte recue, ecarts, date reception |
| Avoir fournisseur | Si litige | Articles refuses/manquants |

---

## 3. Gestion des stocks

### 3.1 Lieux de stockage

Pour la tournee EK :
| Lieu | Type | Utilisation |
|------|------|-------------|
| Entrepot EK Shop (Ducos) | Fixe | Stock principal, preparation |
| Vehicule tournee | Mobile | Stock en deplacement |
| Stand merch concert | Ephemere | Stock pour vente sur site |
| Stock consigne | Fixe | Invendus retour de concert |

### 3.2 Types de mouvements

| Mouvement | De → Vers | Declencheur |
|-----------|-----------|-------------|
| **Entree** | (ext) → Depot | Reception commande fournisseur |
| **Sortie** | Depot → (ext) | Vente, perte, don, defaut |
| **Transfert** | Depot A → Depot B | Preparation concert, retour |
| **Ajustement** | — | Inventaire physique (ecart +/-) |
| **Annulation** | — | Correction d'erreur (mouvement inverse) |

### 3.3 Valorisation du stock
- **Methode** : Prix Moyen Pondere (PMP) ou cout d'achat fixe
- **Valeur stock** = somme(quantite x prix_achat_ht) par article
- **Marge brute** = prix_vente_ttc - prix_achat_ht - TVA
- **Taux de marge** = marge / prix_vente * 100

### 3.4 Alertes stock
| Alerte | Condition | Couleur |
|--------|-----------|---------|
| Rupture | Stock total = 0 | Rouge |
| Stock bas | Stock <= seuil min | Orange |
| Surstock | Stock > 3x seuil | Bleu (info) |

---

## 4. Distribution & Logistique tournee

### 4.1 Cycle d'un concert

```
J-7  : Planification (verifier stock dispo pour le merch prevu)
J-3  : Preparation (packing list, transfert entrepot → vehicule)
J-0  : Concert (vente sur stand, comptage debut/fin)
J+1  : Retour (transfert stand → vehicule ou entrepot, bilan ventes)
```

### 4.2 Packing list merch
- Generee automatiquement par evenement
- Basee sur : format concert, capacite salle, taux de conversion prevu
- Taux de conversion par format :
  - Concert live : 10-12% de la jauge
  - Sound system : 6-8%
  - Festival : 8-10%
  - Showcase/Impro : 12-15%
- Multiplicateur territoire : Martinique x1.0, Guadeloupe x0.85

### 4.3 Inventaire tournant
- Comptage physique a chaque retour de concert
- Comparaison stock theorique vs stock reel
- Ecarts enregistres comme ajustements (mouvement in/out)
- Objectif : zero ecart inexplique

---

## 5. Ventes & Bilan

### 5.1 Suivi des ventes
- Par concert : nombre d'articles vendus, CA
- Par article : bestsellers, flops
- Par periode : semaine, mois, saison

### 5.2 KPIs merch
| KPI | Formule | Objectif |
|-----|---------|----------|
| CA total | Somme(qte_vendue x prix_vente) | Suivre le revenu |
| Marge brute | CA - cout_achat_total | Rentabilite |
| Taux de marge | Marge / CA * 100 | > 60% pour le merch |
| Taux de conversion | Articles vendus / jauge | 10-12% live |
| Rotation stock | Ventes / stock moyen | Eviter le surstock |
| Taux de rupture | Nb ruptures / nb articles | < 5% |
| Panier moyen | CA / nb transactions | Augmenter |

### 5.3 Bilan par concert
| Donnee | Source |
|--------|--------|
| Stock depart (avant concert) | Packing list / comptage depart |
| Stock retour (apres concert) | Comptage retour |
| Ventes = depart - retour | Calcul automatique |
| CA = ventes x prix_vente | Calcul automatique |
| Marge = CA - (ventes x prix_achat) | Calcul automatique |

### 5.4 Bilan global tournee
- CA cumule par article, par concert, par mois
- Stock restant valorise (a prix d'achat)
- Prevision de reappro basee sur les dates restantes
- Alerte : risque de rupture avant fin de tournee

---

# PARTIE 2 — PLAN TECHNIQUE (brider BackStage)

## 1. Modules a activer (merch only)

| Module | Activer | Justification |
|--------|---------|---------------|
| Dashboard | OUI | KPIs merch |
| Articles | OUI | Catalogue produits merch |
| Stock | OUI | Niveaux par lieu |
| Depots | OUI | Lieux de stockage |
| Achats | OUI | Commandes fournisseurs → reception → stock |
| Inventaire | OUI | Comptage physique |
| Tournee | OUI | Calendrier concerts (pour packing) |
| Alertes | OUI | Ruptures et stock bas |
| Previsions | OUI | Forecast ventes merch |
| Ventes | OUI | POS concert |
| Scanner | OUI | Code-barres |
| --- | --- | --- |
| Finance (amortissement) | NON | Pas pertinent pour le merch |
| Transport | NON | Trop complexe pour maintenant |
| Equipe (roles multiples) | NON | Gio seul pour le moment |

## 2. Corrections prioritaires a faire

### P0 — Bloquants

| # | Probleme | Action |
|---|----------|--------|
| 1 | **Achats deconnectes du stock** | Ajouter flow de reception : quand BC passe a "recu", stock augmente automatiquement |
| 2 | **Pas de prix de vente** sur les articles | Ajouter colonne `sell_price_ttc` |
| 3 | **Pas de bilan ventes par concert** | Calculer ventes = stock depart - stock retour |

### P1 — Importants

| # | Probleme | Action |
|---|----------|--------|
| 4 | Variantes (tailles) pas exploitees | Activer le systeme de variantes dans le formulaire produit |
| 5 | Pas de prevision de reappro | Calculer stock prevu vs dates restantes |
| 6 | Pas de code-barres auto | Generer un code-barres a la creation de l'article |

### P2 — Confort

| # | Probleme | Action |
|---|----------|--------|
| 7 | Pas de photo produit (upload) | Pour le moment, URL suffit |
| 8 | Pas d'historique prix | Stocker l'historique des prix d'achat |
| 9 | Dashboard pas adapte merch | Customiser les KPIs pour le merch |

## 3. Configuration initiale

### Etape 1 — Modules
Dans BackStage > Reglages > Modules : desactiver Finance, Transport, Equipe

### Etape 2 — Lieux de stockage
Creer 4 lieux :
1. Entrepot EK Shop (Ducos) — type: fixe
2. Vehicule tournee — type: mobile
3. Stand merch — type: ephemere
4. Consigne retours — type: fixe

### Etape 3 — Articles merch (vrais articles)
Saisir les 400 t-shirts commandes :

| Article | SKU | Qte | Prix achat HT | Prix vente TTC |
|---------|-----|-----|---------------|----------------|
| T-shirt H Gildan Kaki S | SL-TSH-KAK-S | 25 | 5.00 | 25.00 |
| T-shirt H Gildan Kaki M | SL-TSH-KAK-M | 30 | 5.00 | 25.00 |
| T-shirt H Gildan Kaki L | SL-TSH-KAK-L | 25 | 5.00 | 25.00 |
| T-shirt H Gildan Kaki XL | SL-TSH-KAK-XL | 20 | 5.00 | 25.00 |
| T-shirt H Gildan Noir S | SL-TSH-NOI-S | 25 | 5.00 | 25.00 |
| T-shirt H Gildan Noir M | SL-TSH-NOI-M | 30 | 5.00 | 25.00 |
| T-shirt H Gildan Noir L | SL-TSH-NOI-L | 25 | 5.00 | 25.00 |
| T-shirt H Gildan Noir XL | SL-TSH-NOI-XL | 20 | 5.00 | 25.00 |
| T-shirt F Sol's Noir S | SL-TSF-NOI-S | 25 | 5.00 | 25.00 |
| T-shirt F Sol's Noir M | SL-TSF-NOI-M | 30 | 5.00 | 25.00 |
| T-shirt F Sol's Noir L | SL-TSF-NOI-L | 25 | 5.00 | 25.00 |
| T-shirt F Sol's Noir XL | SL-TSF-NOI-XL | 20 | 5.00 | 25.00 |
| T-shirt F Sol's Rouge S | SL-TSF-ROU-S | 20 | 5.00 | 25.00 |
| T-shirt F Sol's Rouge M | SL-TSF-ROU-M | 25 | 5.00 | 25.00 |
| T-shirt F Sol's Rouge L | SL-TSF-ROU-L | 20 | 5.00 | 25.00 |
| T-shirt F Sol's Rouge XL | SL-TSF-ROU-XL | 15 | 5.00 | 25.00 |
| **TOTAL** | | **400** | | |

### Etape 4 — Stock initial
Faire une entree stock de 400 t-shirts dans "Entrepot EK Shop (Ducos)"

### Etape 5 — Fournisseurs
Creer le(s) fournisseur(s) d'impression/confection

---

# PARTIE 3 — CHECKLIST LANCEMENT

- [ ] Desactiver les modules non-merch dans Reglages
- [ ] Verifier les 4 lieux de stockage
- [ ] Saisir les 16 SKUs t-shirts (ou importer CSV)
- [ ] Faire l'entree de stock initiale (400 t-shirts)
- [ ] Creer le fournisseur
- [ ] Creer le premier bon de commande (les 400 deja recus)
- [ ] Tester un transfert : Entrepot → Vehicule
- [ ] Tester le scanner sur un SKU
- [ ] Verifier les alertes stock
- [ ] Verifier la packing list pour le prochain concert
- [ ] Activer la confirmation email dans Supabase
- [ ] Coller les templates email BackStage

---

**Ce document est la reference. Toute evolution future part de la.**
