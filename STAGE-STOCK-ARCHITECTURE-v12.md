(colle le contenu du fichier que je t'ai donné)
# STAGE STOCK — ARCHITECTURE PRODUIT COMPLÈTE
## De WMS à ERP du Spectacle Vivant

**Date :** 14 mars 2026
**Version :** v12 — Vision complète

---

## LA VISION EN UNE PHRASE

Stage Stock est le système d'information complet des professionnels du spectacle vivant : gestion de stock, logistique, achats, ventes, finance, marketing, équipe — le tout interconnecté, mobile-first, avec un assistant IA intégré.

---

## ARCHITECTURE À 3 COUCHES (validée)

```
COUCHE 1 — VITRINE          Landing + Auth + CGU
COUCHE 2 — MON ESPACE       Dashboard perso, profil, mon matos, mes projets, calendrier, finances
COUCHE 3 — LE PROJET        Tous les modules métier ci-dessous
```

---

## CARTOGRAPHIE DES 9 DOMAINES MÉTIER

### 1. LOGISTIQUE & STOCK (le cœur historique)

**Ce qui existe :**
- ✅ Articles (Products.jsx — 368 lignes + ProductDetail.jsx — 677 lignes)
- ✅ Dépôts / Lieux (Depots.jsx — 249 lignes)
- ✅ Stock multi-lieux (Stocks.jsx — 258 lignes)
- ✅ Mouvements entrée/sortie/transfert (Movements.jsx — 218 lignes + MovementModal.jsx — 167 lignes)
- ✅ Alertes réappro (Alerts.jsx — 157 lignes)
- ✅ Packing lists automatiques par rôle (PackingList.jsx — 359 lignes)
- ✅ Transport inter-îles (Transport.jsx — 579 lignes)
- ✅ Scanner code-barres (Scanner.jsx — 330 lignes)
- ✅ Variantes taille/couleur (stock_variants en base)
- ✅ RPC atomiques (move_stock, undo_movement)

**Ce qui manque :**
- ❌ Fiche dépôt détaillée (DepotDetail) — inventaire du lieu, historique, valeur
- ❌ Mode offline avec queue de synchronisation
- ❌ Gestion des retours (produit défectueux, invendu retour)
- ❌ Inventaire physique (comptage réel vs système)
- ❌ Traçabilité unitaire (n° de série pour le matériel de valeur)

**Maturité : 75%** — Le cœur fonctionne. Il manque des fiches détaillées et des fonctions avancées.

---

### 2. TOURNÉE & ÉVÉNEMENTS (la colonne vertébrale)

**Ce qui existe :**
- ✅ Calendrier visuel (Tour.jsx — 360 lignes)
- ✅ Fiches concert détaillées avec 5 sections (EventDetail.jsx — 785 lignes)
- ✅ Checklists interactives par événement (Checklists.jsx — 362 lignes)
- ✅ Prévisions de ventes par format/territoire (Forecast.jsx — 446 lignes)
- ✅ Matériel adapté au format (concert live ≠ sound system ≠ impro)
- ✅ 12 dates en base avec capacités, formats, territoires

**Ce qui manque :**
- ❌ Saisie des résultats réels post-concert (champs en base, pas branchés dans l'UI)
- ❌ Comparaison prévisionnel vs réel avec analyse d'écart
- ❌ Modèle de prévision auto-ajusté (recalibrage après chaque concert)
- ❌ Gestion des riders techniques (fiche technique par salle)
- ❌ Planification des répétitions / soundchecks
- ❌ Intégration billetterie (Shotgun, Dice, Eventbrite) — Phase SaaS

**Maturité : 65%** — Les structures sont là, mais le cycle complet (prévision → exécution → bilan → ajustement) n'est pas bouclé.

---

### 3. ACHATS & APPROVISIONNEMENT (nouveau domaine)

**Ce qui existe :**
- ✅ Seuils d'alerte de réappro (min_stock sur chaque produit)
- ✅ Alertes automatiques quand stock < seuil
- ⚠️ Forecast qui prédit les ruptures (dates critiques identifiées)

**Ce qui manque — TOUT LE RESTE :**
- ❌ Fiche fournisseur (nom, contact, délais, conditions, historique)
- ❌ Demande d'achat (qui demande quoi, pour quel projet, budget)
- ❌ Bon de commande (généré depuis une demande, envoyable au fournisseur)
- ❌ Réception de commande (contrôle qualité, écart quantité)
- ❌ Suivi des commandes en cours (commandé → expédié → reçu)
- ❌ Comparaison devis fournisseurs
- ❌ Historique d'achats par fournisseur et par article
- ❌ Budget achats par projet

**Tables Supabase à créer :**
- `suppliers` — fournisseurs (nom, contact, délais, notes)
- `purchase_orders` — bons de commande (fournisseur, date, statut, total)
- `purchase_order_lines` — lignes de commande (article, qté, prix unitaire)
- `purchase_receipts` — réceptions (commande, date, qté reçue, écart)

**Maturité : 10%** — Seules les alertes existent. Le processus achat complet est à construire.

---

### 4. VENTE & COMMERCE (partiellement existant)

**Ce qui existe :**
- ✅ Prix de vente sur les articles
- ✅ Table `sales` en base (event_id, product_id, variant, quantity, price)
- ⚠️ Mode Concert (POS) spécifié dans le CDC v5.4 mais statut d'implémentation à vérifier
- ✅ Prévisions de CA par concert

**Ce qui manque :**
- ❌ Vérifier que le POS fonctionne réellement (fond sombre, gros boutons, décrement auto)
- ❌ Panier multi-articles (un client achète 2 t-shirts + 1 porte-clé)
- ❌ Méthodes de paiement (espèces, CB, mobile)
- ❌ Ticket de caisse / reçu (même simplifié)
- ❌ Rapport de caisse de fin de soirée
- ❌ Catalogue en ligne / e-commerce (Shopify/WooCommerce — Phase SaaS)
- ❌ Gestion des prix (promotions, packs, tarifs par événement)
- ❌ CRM basique (clients fidèles, mailing list concert)

**Tables à créer/enrichir :**
- `sales` existe, enrichir avec `payment_method`, `receipt_number`
- `sale_items` — lignes de vente (pour panier multi-articles)
- `cash_reports` — rapport de caisse par événement
- `customers` — base clients (optionnel, Phase SaaS)

**Maturité : 30%** — La structure est là mais le POS terrain n'est pas validé.

---

### 5. FINANCE & COMPTABILITÉ (partiellement existant)

**Ce qui existe :**
- ✅ Amortissement linéaire FR (Finance.jsx — 297 lignes)
- ✅ Prorata temporis base 360 jours, seuil 500€ HT
- ✅ VNC (valeur nette comptable) par article
- ✅ Export CSV des mouvements
- ✅ Prévisions CA par concert et par scénario

**Ce qui manque :**
- ❌ Tableau de bord financier projet (recettes - dépenses = marge)
- ❌ Suivi des dépenses par catégorie (transport, hébergement, technique, merch)
- ❌ Budget prévisionnel vs réel
- ❌ Factures (émises et reçues)
- ❌ TVA (8.5% Martinique vs 20% métropole — déjà identifié)
- ❌ Bilan de tournée (toutes dates consolidées)
- ❌ Export comptable structuré pour expert-comptable (FEC — Fichier des Écritures Comptables)
- ❌ Rapports PDF par événement et par période

**Tables à créer :**
- `expenses` — dépenses (catégorie, montant, date, justificatif, projet)
- `invoices` — factures (type émise/reçue, montant HT/TTC, TVA, statut)
- `budgets` — budget prévisionnel par poste et par projet

**Maturité : 35%** — L'amortissement est correct et conforme. Le reste de la finance est à construire.

---

### 6. ÉQUIPE & RH (partiellement existant)

**Ce qui existe :**
- ✅ Gestion d'équipe projet (Equipe.jsx — 249 lignes)
- ✅ 12 rôles métier (Tour Manager, Régisseur Son, DJ, Roadie, Vendeur Merch...)
- ✅ Invitation par QR code / lien
- ✅ Accès par module et par rôle (AccessManager)
- ✅ Packing list personnalisée par rôle

**Ce qui manque :**
- ❌ Profil enrichi (CDC rédigé, pas implémenté)
- ❌ Disponibilités par date (qui est dispo pour quel concert)
- ❌ Contrats / cachets (intermittent, auto-entrepreneur)
- ❌ Feuilles de route par personne (ce que je dois faire, quand, où)
- ❌ Communication intégrée (aujourd'hui tout passe par WhatsApp)
- ❌ Historique des missions par personne

**Tables à créer :**
- `user_details` — profil enrichi (CDC existant)
- `availability` — disponibilités par user par event
- `contracts` — contrats/cachets (type, montant, statut)
- `assignments` — affectations (user → event → rôle → tâches)

**Maturité : 45%** — Les rôles et permissions sont bons. Le volet RH/contrats est absent.

---

### 7. MARKETING & COMMUNICATION (nouveau domaine)

**Ce qui existe :**
- ✅ Landing page Stage Stock (vitrine produit)
- ⚠️ Données de ventes par concert (exploitables pour le marketing)

**Ce qui manque — TOUT LE RESTE :**
- ❌ Catalogue produit public (page web des articles en vente)
- ❌ Visuels produits (photos, mockups)
- ❌ Gestion des réseaux sociaux (calendrier de publication)
- ❌ Mailing list / newsletter
- ❌ Analytics ventes (quel produit se vend le mieux, à quel concert, quelle taille)
- ❌ QR code produit pour achat en ligne
- ❌ Affichage stand merch (génération automatique de PLV avec prix)

**Tables à créer :**
- `media` — fichiers (photos, visuels) liés aux articles
- `campaigns` — campagnes marketing (type, dates, contenu)

**Maturité : 5%** — Quasi inexistant. À construire après les fondations métier.

---

### 8. GESTION NUMÉRIQUE & SYSTÈME D'INFORMATION (infrastructure)

**Ce qui existe :**
- ✅ PWA installable mobile
- ✅ Supabase (PostgreSQL + Auth + RLS + REST)
- ✅ GitHub + Cloudflare Pages (CI/CD)
- ✅ Module registry dynamique (activer/désactiver des modules)
- ✅ ErrorBoundary, fetchWithRetry, recovery 401
- ✅ Import CSV produits
- ✅ Notion pour la documentation

**Ce qui manque :**
- ❌ Mode offline avec queue de synchronisation
- ❌ Notifications push (alertes stock, rappels concert)
- ❌ Logs d'audit (qui a fait quoi, quand)
- ❌ Backup automatique des données
- ❌ Multi-tenant complet (org_id sur toutes les tables)
- ❌ API publique pour intégrations tierces
- ❌ Webhooks (événements vers n8n, WhatsApp)
- ❌ Monitoring / Sentry

**Maturité : 50%** — L'infrastructure est solide mais il manque les features enterprise.

---

### 9. ASSISTANT IA (nouveau domaine)

**Ce qui existe :**
- ❌ Rien dans l'app

**Ce qu'il faut construire :**
- Assistant contextuel intégré dans l'app (chatbot)
- Suggestions proactives ("Tu devrais réapprovisionner les M Kaki avant Triple 8")
- Analyse automatique post-concert ("Les M Noir se sont vendus 30% au-dessus des prévisions")
- Génération de rapports ("Fais-moi le bilan de la tournée")
- Aide à la décision ("Combien commander pour la prochaine vague ?")
- Recherche en langage naturel ("Combien de t-shirts M reste-t-il au stand ?")

**Implémentation :**
- Appels API Anthropic depuis l'app (Claude Sonnet)
- Contexte : données du projet (stock, ventes, prévisions, événements)
- UI : bulle flottante ou onglet dédié

**Maturité : 0%** — Tout est à construire. Mais c'est le différenciateur ultime.

---

## INTERCONNEXIONS — CE QUI REND L'APP INTELLIGENTE

C'est ici que Stage Stock devient plus qu'un ensemble de modules. C'est la connexion entre les domaines qui crée la valeur.

```
VENTE (concert)
  → décrement STOCK automatique
    → alimentation FINANCE (CA réel)
      → recalibrage FORECAST (prévisions ajustées)
        → alerte ACHATS (si stock < seuil après vente)
          → notification ÉQUIPE (vendeur voit son rapport)
            → donnée MARKETING (quel produit marche)
              → suggestion ASSISTANT ("Commande 200 M Noir")

              ACHAT (commande fournisseur)
                → budget FINANCE (dépense enregistrée)
                  → à la réception → entrée STOCK automatique
                    → mise à jour FORECAST (stock disponible recalculé)
                      → notification ÉQUIPE (logisticien informé)

                      CONCERT (événement)
                        → génère CHECKLIST automatique
                          → génère PACKING LIST par rôle
                            → déclenche TRANSPORT (si inter-îles)
                              → calcule PRÉVISIONS de ventes
                                → affecte ÉQUIPE (disponibilités)
                                  → après → rapport FINANCE + recalibrage FORECAST

                                  ALERTE STOCK
                                    → suggestion ACHATS (bon de commande pré-rempli)
                                      → notification ÉQUIPE (responsable logistique)
                                        → impact FORECAST (risque rupture sur prochaine date)
  → suggestion ASSISTANT (quantité optimale à commander)
```

---

## PRIORISATION — DANS QUEL ORDRE CONSTRUIRE

### NIVEAU 1 — Fondations (maintenant → avril 2026)
Ce qui fait que l'app est UTILISABLE au quotidien.

1. **Couche 2 — Espace personnel** (dashboard, profil, mes projets)
2. **Fiche dépôt détaillée** (DepotDetail)
3. **Résultats réels post-concert** (boucler le cycle prévision→réel)
4. **POS validé** (vérifier que le mode concert fonctionne)

### NIVEAU 2 — Métier (mai → juillet 2026)
Ce qui fait que l'app est COMPLÈTE pour une tournée.

5. **Achats & Appro** (fournisseurs, bons de commande, réceptions)
6. **Finance enrichie** (dépenses, budget, bilan)
7. **Rapport de caisse** post-concert
8. **Inventaire physique** (comptage terrain)

### NIVEAU 3 — Intelligence (août → octobre 2026)
Ce qui fait que l'app est PLUS INTELLIGENTE que les concurrents.

9. **Assistant IA** (suggestions, analyses, rapports)
10. **Forecast auto-ajusté** (recalibrage après chaque concert)
11. **Analytics avancés** (tendances, top ventes, marges par produit)

### NIVEAU 4 — Scale (novembre 2026 → 2027)
Ce qui fait que l'app est COMMERCIALISABLE.

12. **Multi-tenant complet** + onboarding automatisé
13. **Stripe** (abonnements)
14. **Mode offline** avec queue de sync
15. **Marketing** (catalogue public, analytics)
16. **Intégrations** (billetterie, e-commerce, compta)
17. **API publique**

---

## MODULES DE L'APP — VUE FINALE

### Couche 2 — Mon Espace (4 onglets)
| Onglet | Contenu |
|--------|---------|
| Accueil | Dashboard perso, projets, prochaines dates, alertes |
| Projets | Liste, créer, rejoindre, archiver |
| Calendrier | Toutes les dates, tous projets |
| Profil | Identité, matos perso, finances perso |

### Couche 3 — Le Projet (modules activables)
| Module | Domaine | Priorité |
|--------|---------|----------|
| Board | Vue d'ensemble | Existe ✅ |
| Tournée | Événements | Existe ✅ |
| Articles | Stock | Existe ✅ |
| Dépôts | Stock | À enrichir ⚠️ |
| Stock | Stock | Existe ✅ |
| Mouvements | Stock | Existe ✅ |
| Équipe | RH | Existe ✅ |
| Finance | Compta | À enrichir ⚠️ |
| Alertes | Stock | Existe ✅ |
| Forecast | Intelligence | Existe ✅ |
| Scanner | Stock | Existe ✅ |
| Transport | Logistique | Existe ✅ |
| Achats | Appro | À créer ❌ |
| Ventes/POS | Commerce | À valider ⚠️ |
| Marketing | Communication | Phase 4 ❌ |
| Assistant | IA | Phase 3 ❌ |
| Réglages | Système | Existe ✅ |

---

*Fin de l'architecture produit — Version 12 — 14 mars 2026*
*Stage Stock : de WMS à ERP du spectacle vivant*
                                          