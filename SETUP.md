# SETUP — Comment démarrer Stage Stock avec Claude Code

## Prérequis

Tu as besoin de 3 choses sur ton PC :

### 1. Git
- Télécharge : https://git-scm.com/downloads
- Installe avec les options par défaut
- Vérifie : ouvre un terminal (PowerShell ou CMD) et tape `git --version`

### 2. Node.js (version 18+)
- Télécharge : https://nodejs.org (prends la version LTS)
- Installe avec les options par défaut
- Vérifie : `node --version` et `npm --version`

### 3. Claude Code
- Ouvre PowerShell et tape :
  ```
  irm https://claude.ai/install.ps1 | iex
  ```
- OU si tu préfères npm : `npm install -g @anthropic-ai/claude-code`
- Au premier lancement, Claude Code ouvrira ton navigateur pour l'authentification avec ton compte Anthropic (Pro ou Max requis)

## Installation du projet

### Étape 1 — Clone le repo
```bash
git clone https://github.com/GiogioArch/Stage-stock.git
cd Stage-stock
```

### Étape 2 — Installe les dépendances
```bash
npm install
```

### Étape 3 — Vérifie que ça compile
```bash
npm run build
```
Tu dois voir "✓ built in X.XXs" sans erreur.

### Étape 4 — Lance le serveur de développement
```bash
npm run dev
```
Ouvre le lien affiché (http://localhost:5173) dans ton navigateur.

### Étape 5 — Lance Claude Code
Dans un AUTRE terminal, dans le même dossier :
```bash
cd Stage-stock
claude
```
Claude Code va lire le fichier CLAUDE.md automatiquement et connaître tout le contexte du projet.

## Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de dev (hot reload) |
| `npm run build` | Compile pour la production |
| `npm run preview` | Prévisualise le build de production |
| `git add . && git commit -m "message" && git push` | Pousse sur GitHub → déploie sur Cloudflare |

## Workflow quotidien

1. Ouvre un terminal → `cd Stage-stock` → `npm run dev`
2. Ouvre un 2ème terminal → `cd Stage-stock` → `claude`
3. Dis à Claude ce que tu veux : "ajoute les checklists dans l'onglet Tournée"
4. Claude modifie les fichiers, tu vois les changements en direct dans le navigateur
5. Quand c'est bon : `git add . && git commit -m "checklists tournée" && git push`
6. Cloudflare Pages déploie automatiquement

## Connecter Cloudflare Pages

1. Va sur https://dash.cloudflare.com
2. Workers & Pages → Create → Pages → Connect to Git
3. Sélectionne le repo `Stage-stock`
4. Build command : `npm run build`
5. Output directory : `dist`
6. Deploy

Chaque push sur `main` déclenchera un build automatique.
