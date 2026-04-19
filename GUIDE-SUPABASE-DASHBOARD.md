# Guide Supabase Dashboard — Actions manuelles Phase A

**Objectif** : Finaliser la securisation de BackStage. Les actions ci-dessous ne peuvent PAS etre faites via SQL — elles doivent etre cochees dans le dashboard.

**URL** : https://supabase.com/dashboard/project/domuweiczcimqncriykk

---

## 1. Activer la protection mots de passe leakes (HaveIBeenPwned)

**Ou** : Authentication > Sign In / Providers > Email

1. Clic sur **Email** (section Providers)
2. Active **"Leaked password protection"** (toggle)
3. Ajuste **"Minimum password length"** a **8**
4. **Save**

Effet : les mots de passe compromis connus seront rejetes au signup/reset.

---

## 2. Activer la rotation des refresh tokens

**Ou** : Authentication > Settings (ou Session)

1. Cherche **"Refresh Token Rotation"**
2. Active-le
3. **"Refresh Token Reuse Interval"** : **10 secondes**
4. **Save**

Effet : un refresh token vole ne peut etre utilise qu'une seule fois. L'attaquant et l'utilisateur legitime ne peuvent pas avoir la meme session.

---

## 3. Reduire la duree de vie des access tokens

**Ou** : Authentication > Settings > JWT expiry limit

1. Baisser de **3600s** (1h) a **900s** (15 min)
2. **Save**

Effet : si un token est vole via XSS, il expire en 15 min. Le refresh token rotation prendra le relai pour l'utilisateur legitime.

---

## 4. Activer la confirmation email obligatoire

**Ou** : Authentication > Providers > Email

1. Active **"Confirm email"** (toggle)
2. **Save**

Effet : pas d'acces a l'app tant que l'email n'est pas verifie.

---

## 5. Configurer les URLs de redirection

**Ou** : Authentication > URL Configuration

1. **Site URL** : `https://stage-stock-ek.pages.dev`
2. **Redirect URLs** (ajouter) :
   - `https://stage-stock-ek.pages.dev/**`
   - `http://localhost:5173/**` (dev local)
3. **Save**

Effet : les liens email (confirmation, reset) redirigeront vers le bon domaine.

---

## 6. Coller les templates email BackStage

**Ou** : Authentication > Email Templates

Pour chaque template, coller le HTML depuis `email-templates/` du repo :

| Template Supabase | Fichier source | Subject |
|-------------------|----------------|---------|
| **Confirm signup** | `email-templates/confirm-signup.html` | `Confirme ton compte BackStage` |
| **Reset password** | `email-templates/reset-password.html` | `Reinitialise ton mot de passe — BackStage` |
| **Invite user** | `email-templates/invite.html` | `Tu es invite sur BackStage` |

Procedure pour chaque :
1. Clic sur le nom du template
2. Remplace **Subject heading** par le sujet ci-dessus
3. Remplace tout le **Body** par le contenu du fichier HTML
4. **Save**

---

## 7. Verifier les rate limits

**Ou** : Authentication > Rate Limits

Defauts recommandes :
- **Signups per hour** : 30 (defaut)
- **Password reset requests per hour** : 30 (defaut)
- **Verification emails per hour** : 30 (defaut)
- **OTP requests per hour** : 30 (defaut)

Pas d'action urgente mais a surveiller si du spam arrive.

---

## 8. Activer MFA (optionnel, pour la v2)

**Ou** : Authentication > Providers > MFA

Si vous voulez proposer un second facteur (TOTP / SMS) pour les comptes admin.
Pas prioritaire pour le MVP mais a prevoir pour la version SaaS payante.

---

## Apres ces actions

Re-lancer l'advisor Supabase pour confirmer :
```
supabase-mcp > get_advisors(type='security')
```

Le seul WARN `auth_leaked_password_protection` doit disparaitre une fois HIBP active.

---

## Checklist rapide

- [ ] HIBP active (section 1)
- [ ] Minimum password 8 chars (section 1)
- [ ] Refresh token rotation ON + reuse interval 10s (section 2)
- [ ] JWT expiry a 900s (section 3)
- [ ] Email confirmation obligatoire (section 4)
- [ ] Site URL + Redirect URLs (section 5)
- [ ] 3 templates email colles + sujets (section 6)
- [ ] Rate limits verifies (section 7)

**Tous ces reglages pris collectivement = Phase A complete.**
