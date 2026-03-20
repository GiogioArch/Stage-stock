# BACKSTAGE — À FAIRE

## Modules : utilité Stock vs Dépôts ?

**Question** : Les modules Stock et Dépôts affichent-ils vraiment des infos différentes ou c'est les mêmes données avec un affichage différent ?

**Analyse nécessaire** :
- **Dépôts** = vue par lieu (quel lieu contient quoi ?)
- **Stock** = vue par produit (où est ce produit ?)
- Si les deux existent, chaque module doit apporter une valeur UNIQUE que l'autre n'a pas
- Sinon → fusionner en un seul module "Inventaire" avec des sous-onglets (par lieu / par produit)

**Critère** : chaque module qui prend une place sur le Board doit être indispensable. Si un module n'apporte pas une action ou une vue qu'on ne peut pas obtenir ailleurs → il n'a pas sa place.

**Action** : auditer tous les modules et documenter pour chacun sa raison d'exister unique.

---

## Board personnalisable

**Objectif** : L'utilisateur doit pouvoir personnaliser son Board (réordonner, masquer/afficher des modules).

**Scope** :
- Personnalisation par utilisateur, par projet
- Stockage Supabase (persisté cross-device)
- Respecter les droits d'accès modules (module_access dans project_members)

**Status** : FAIT (commit 7f75f30)

---

## Mélodie — Reconfiguration complète

Mélodie ne répond pas aux besoins. Avant de la refaire, répondre à ces questions :

### 1. Rôle de Mélodie
- Juste l'onboarding (inscription/connexion) ou assistante permanente accessible depuis l'app (chat, aide contextuelle, suggestions) ?

### 2. Parcours d'inscription
- Le flow actuel en 8 étapes est trop long ? Trop court ? Quelles étapes sont inutiles ?
- L'étape "sélection métier" est-elle importante ou à supprimer/déplacer ?

### 3. Personnalité / Ton
- Ton plus chaleureux/créole ? Plus pro/corporate ? Plus fun ?
- Le nom "Mélodie" convient ?

### 4. Ce qui ne marche PAS concrètement
- Qu'est-ce qui a été essayé avec Mélodie qui n'a pas fonctionné ?
- Quel écran ou moment bloque ?

### 5. Ce que Mélodie devrait faire
- Aide à la navigation ("comment je fais pour...") ?
- Résumés intelligents ("tu as 3 alertes stock, le prochain concert est dans 5 jours") ?
- Actions rapides par commande texte ?
