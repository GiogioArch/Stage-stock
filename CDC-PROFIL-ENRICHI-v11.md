# CDC — PROFIL UTILISATEUR ENRICHI
## Stage Stock v11 — Spec complète pour Claude Code
## Date : 13 mars 2026

---

## CONTEXTE

Stage Stock évolue d'un WMS de tournée vers un **hub professionnel pour les travailleurs du spectacle**. L'app a deux niveaux :

1. **Espace personnel** (le "moi") — profil, inventaire perso, calendrier, finances, contrats
2. **Projets** (le "nous") — ce qui existe déjà (stock, tournée, équipe, etc.)

Cette spec couvre la **Phase 1 : Profil enrichi** avec support personne physique ET personne morale.

---

## ARCHITECTURE DONNÉES

### Nouvelle table : `user_details`

Séparée de `user_profiles` (qui reste le lien user ↔ projet/org). `user_details` contient les données PERSONNELLES de l'utilisateur, indépendantes de tout projet.

```sql
-- ============================================================
-- USER DETAILS — Profil enrichi personne physique / morale
-- Stage Stock v11 — Idempotent
-- ============================================================

-- 1. TABLE
CREATE TABLE IF NOT EXISTS user_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),

  -- Type de compte
  account_type TEXT NOT NULL DEFAULT 'physical' CHECK (account_type IN ('physical', 'legal')),

  -- ─── COMMUN (physique + morale) ───
  phone TEXT,
  phone_secondary TEXT,
  address_street TEXT,
  address_postal_code TEXT,
  address_city TEXT,
  address_country TEXT DEFAULT 'France',
  siret TEXT,                          -- 14 chiffres
  iban TEXT,                           -- données sensibles
  bic TEXT,
  website TEXT,
  social_instagram TEXT,
  social_facebook TEXT,
  social_linkedin TEXT,

  -- ─── PERSONNE PHYSIQUE ───
  first_name TEXT,
  last_name TEXT,
  stage_name TEXT,                     -- nom de scène / pseudo
  birth_date DATE,
  nationality TEXT,
  social_security_number TEXT,         -- données sensibles
  pole_emploi_spectacle TEXT,          -- numéro Audiens / Pôle Emploi
  legal_status TEXT CHECK (legal_status IN (
    'intermittent', 'auto_entrepreneur', 'salarie', 'benevole', 'micro_entreprise', NULL
  )),
  skills TEXT[],                       -- compétences (array de strings)
  availability_notes TEXT,             -- notes de disponibilité libres
  bio TEXT,                            -- présentation courte

  -- ─── PERSONNE MORALE ───
  company_name TEXT,                   -- raison sociale
  legal_form TEXT CHECK (legal_form IN (
    'sarl', 'sas', 'sasu', 'association_1901', 'micro_entreprise', 'eurl', 'ei', NULL
  )),
  siren TEXT,                          -- 9 chiffres
  tva_number TEXT,                     -- numéro TVA intracommunautaire
  capital TEXT,                        -- capital social
  representative_name TEXT,            -- représentant légal
  representative_role TEXT,            -- fonction du représentant
  company_creation_date DATE,

  -- ─── PHOTO ───
  avatar_url TEXT,                     -- URL photo profil (Supabase Storage ou externe)

  -- ─── META ───
  profile_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. RLS
ALTER TABLE user_details ENABLE ROW LEVEL SECURITY;

-- Chaque user ne voit/modifie QUE ses propres données
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_details' AND policyname = 'ud_select_own') THEN
    CREATE POLICY ud_select_own ON user_details FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_details' AND policyname = 'ud_insert_own') THEN
    CREATE POLICY ud_insert_own ON user_details FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_details' AND policyname = 'ud_update_own') THEN
    CREATE POLICY ud_update_own ON user_details FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

-- 3. INDEX
CREATE INDEX IF NOT EXISTS idx_user_details_user_id ON user_details (user_id);

-- 4. VÉRIFICATION
SELECT 'user_details' AS table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_details') AS nb_columns;
```

### Tables existantes — PAS de modification

- `user_profiles` reste tel quel (user_id, role_id, display_name, org_id) — c'est le lien user ↔ projet
- `project_members` reste tel quel — c'est l'appartenance à un projet

### Relation entre les tables

```
auth.users (Supabase)
  └── user_details (1:1) — données personnelles globales
  └── user_profiles (1:N par org) — lien avec chaque projet
  └── project_members (1:N par org) — appartenance + droits par projet
```

---

## COMPOSANT : ProfilePage.jsx

### Emplacement
`src/components/ProfilePage.jsx` — nouveau fichier

### Accès
Remplace le `ProfileModal` actuel dans App.jsx. Quand l'utilisateur clique sur son avatar/rôle dans le header, on ouvre `ProfilePage` en plein écran (comme EventDetail).

### Sections (onglets horizontaux scrollables)

1. **Identité** — photo, type de compte, infos personnelles ou société
2. **Professionnel** — statut juridique, SIRET, compétences, Audiens
3. **Mes projets** — liste des projets avec rôle et statut
4. **Mon matériel** — placeholder "Bientôt disponible" (phase 2)
5. **Mon calendrier** — placeholder "Bientôt disponible" (phase 3)
6. **Mes finances** — placeholder "Bientôt disponible" (phase 4)

### Section 1 — Identité

**Vue lecture (par défaut) :**
- Avatar (grande taille, 80x80, cercle)
- Nom complet ou raison sociale (gros, gras)
- Type de compte : badge "Personne physique" ou "Personne morale"
- Email (depuis auth)
- Téléphone
- Adresse complète
- Site web + réseaux sociaux (icônes cliquables)
- Bio / présentation

**Vue édition (bouton "Modifier") :**
- Tous les champs éditables
- Switch "Personne physique / Personne morale" en haut
- Les champs s'adaptent dynamiquement au type choisi
- Bouton "Enregistrer" qui fait un upsert sur `user_details`

**Champs personne physique :**
- Prénom, Nom, Nom de scène
- Date de naissance
- Nationalité
- Téléphone(s)
- Adresse complète
- Bio

**Champs personne morale :**
- Raison sociale
- Forme juridique (select)
- Nom du représentant légal
- Fonction du représentant
- Date de création
- Capital social
- Téléphone(s)
- Adresse siège

### Section 2 — Professionnel

**Champs personne physique :**
- Statut juridique (select : intermittent, auto-entrepreneur, salarié, bénévole, micro-entreprise)
- SIRET (input avec masque 14 chiffres)
- N° Sécurité sociale
- N° Pôle Emploi Spectacle / Audiens
- IBAN + BIC
- Compétences (multi-sélection chips depuis les 12 rôles métier + champ libre)

**Champs personne morale :**
- SIRET (input masque 14 chiffres)
- SIREN (auto-calculé = 9 premiers chiffres du SIRET)
- N° TVA intracommunautaire
- IBAN + BIC
- Forme juridique (si pas déjà renseigné en section 1)

**Affichage données sensibles :**
- IBAN : affiché masqué par défaut (FR76 •••• •••• •••• 1234)
- N° SS : affiché masqué (1 85 •• •• ••• ••• ••)
- Bouton "Voir" pour démasquer temporairement

### Section 3 — Mes projets

- Liste des projets (depuis `project_members` enrichi avec `organizations`)
- Pour chaque projet :
  - Nom du projet, logo
  - Mon rôle (badge couleur)
  - Statut : Admin / Membre
  - Date d'ajout
  - Nombre de modules accessibles
  - Bouton "Ouvrir" → navigue vers le projet
- Bouton "Créer un projet" en bas

### Sections 4, 5, 6 — Placeholders

Afficher une card avec :
- Icône thématique (📦 / 📅 / 💰)
- Titre
- Description courte
- Badge "Bientôt disponible"
- Style : opacité 0.6, pas de bouton d'action

---

## MODIFICATIONS App.jsx

### Remplacer ProfileModal par ProfilePage

Dans App.jsx, quand `showProfile` est true, au lieu de rendre `<ProfileModal>`, rendre `<ProfilePage>` en plein écran :

```jsx
{showProfile && (
  <ProfilePage
    user={user}
    userProfile={userProfile}
    userRole={userRole}
    membership={membership}
    selectedOrg={selectedOrg}
    roles={data.roles}
    onClose={() => setShowProfile(false)}
    onToast={showToast}
    onReload={loadAll}
    onLogout={() => { auth.signOut(); setUser(null); setUserRole(undefined); setUserProfile(null); setMembership(undefined); setSelectedOrg(null) }}
    onSwitchProject={() => { setSelectedOrg(null); setMembership(undefined); setShowProfile(false) }}
  />
)}
```

### Charger user_details au login

Dans `loadAll()` ou après l'auth, charger les données `user_details` :

```javascript
const [details] = await safe('user_details', `user_id=eq.${user.id}`)
setUserDetails(details || null)
```

Passer `userDetails` à `ProfilePage`.

---

## DESIGN

### Style cohérent avec le reste de l'app
- Fond : gradient pastel standard
- Cards : borderRadius 18px, ombres douces
- Onglets : pilules scrollables horizontales (comme EventDetail)
- Inputs : classe `.input` standard
- Labels : classe `.label`
- Bouton principal : classe `.btn-primary`

### Couleur du profil
- Couleur principale section profil : `#9B7DC4` (violet/prune)
- Background header profil : gradient vers violet léger
- Avatar : bordure avec couleur du rôle si assigné

### Données sensibles
- IBAN, n° SS : affichés masqués par défaut avec `●●●●`
- Petit bouton œil (👁️) pour démasquer
- Les champs sensibles ont un fond légèrement différent (#FFF8F0 → #FFFDF5)

---

## FLOW UTILISATEUR

### Premier accès au profil
1. User clique sur son avatar/badge rôle dans le header
2. ProfilePage s'ouvre
3. Si `user_details` n'existe pas → afficher un formulaire de bienvenue "Complète ton profil"
4. Premier champ : "Tu es..." → Personne physique / Personne morale
5. Formulaire adapté au choix
6. Bouton "Enregistrer" → upsert dans `user_details` + toast "Profil enregistré"

### Accès suivants
1. ProfilePage s'ouvre avec les données pré-remplies
2. Vue lecture par défaut
3. Bouton "Modifier" pour passer en édition
4. Les sections Mon matériel / Calendrier / Finances affichent "Bientôt disponible"

---

## RÈGLES TECHNIQUES

- Le SQL est dans un fichier séparé : `sql/create-user-details.sql`
- Le SQL est idempotent (IF NOT EXISTS, ON CONFLICT)
- Les RLS sont strictes : chaque user ne voit QUE ses propres données
- `npm run build` doit compiler sans erreur
- Le composant utilise `safe()` pour charger `user_details` (table peut ne pas exister)
- Les données sensibles ne sont JAMAIS loggées en console
- Entiers uniquement pour les codes postaux, SIRET, etc. — validation côté client

---

## CE QU'IL NE FAUT PAS FAIRE

- NE PAS modifier la table `user_profiles` existante
- NE PAS modifier la table `project_members`
- NE PAS toucher au flow de login/auth existant
- NE PAS casser les imports existants dans App.jsx
- NE PAS ajouter de dépendances npm
- NE PAS stocker de fichiers (upload photo = phase ultérieure, juste un champ URL pour l'instant)

---

## LIVRABLES

1. `sql/create-user-details.sql` — migration idempotente
2. `src/components/ProfilePage.jsx` — composant plein écran
3. Modification de `src/App.jsx` — remplacer ProfileModal par ProfilePage, charger user_details
4. `npm run build` qui compile sans erreur
5. `git add . && git commit -m "feat: enriched user profile (physical/legal)" && git push`

---

## PRIORITÉ

Ceci est la feature la plus importante. Elle pose la fondation de l'espace personnel qui distingue Stage Stock de tous les WMS concurrents. Chaque utilisateur a son identité, ses données, ses projets. C'est la base du SaaS.
