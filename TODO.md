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

Voir analyse complète dans le code / conversation.
