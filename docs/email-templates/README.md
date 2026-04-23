# Templates email Supabase — BackStage

Supabase envoie des emails transactionnels (confirmation d'inscription, reset
password, invitation…) en utilisant des **templates HTML configurables** dans le
dashboard. Ces templates sont hors du code de l'app — ils vivent dans la console
Supabase. Ce dossier contient les **versions de référence** qu'on peut
copier-coller si un template est cassé, vide, ou à reset.

## Accès

Dashboard :
https://supabase.com/dashboard/project/domuweiczcimqncriykk/auth/templates

## Templates disponibles ici

| Fichier | Template Supabase | Déclenché quand |
|---------|-------------------|-----------------|
| `reset-password.html` | **Reset Password** | L'utilisateur clique "Mot de passe oublié" |

## Règles critiques

### 1. Toujours inclure `{{ .ConfirmationURL }}`
C'est la variable qui contient l'URL cliquable avec token. **Sans elle, le mail
est envoyé sans lien — c'est ce bug qu'on a détecté chez Yvann le 21/04/2026.**

### 2. Configurer le Site URL
Dashboard > Authentication > URL Configuration > **Site URL** doit pointer vers
l'URL de prod BackStage (pas `localhost:3000`). Le lien dans l'email pointe
vers ce Site URL + un hash avec les tokens.

**URL prod actuelle** : à confirmer avec Gio (probablement
`https://falling-art-7930.workers.dev` ou un domaine custom).

### 3. Whitelister les Redirect URLs
Dashboard > Authentication > URL Configuration > **Redirect URLs** doit
contenir :
- `https://[URL-prod]/` et `https://[URL-prod]/**`
- `http://localhost:3000/` et `http://localhost:3000/**` (pour le dev local)

Sinon Supabase refuse le redirect et renvoie une erreur au clic sur le lien.

## Comment copier-coller un template

1. Ouvre le fichier `.html` de ce dossier
2. Copie tout le contenu (sauf les commentaires `<!-- -->` du début si tu veux)
3. Dashboard Supabase > Authentication > Email Templates > sélectionne le
   template concerné
4. Colle dans le champ **Message (HTML)**
5. Clique "Save"
6. Teste en demandant un reset password depuis l'app
