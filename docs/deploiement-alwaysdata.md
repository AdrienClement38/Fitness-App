# Déploiement sur AlwaysData

Cible : compte AlwaysData (free tier — 256 Mo RAM, ¼ CPU). Philosophie : on
**build en local**, le serveur ne reçoit que les artefacts et n'installe que les
dépendances runtime (`npm install --omit=dev` ≈ express/drizzle/pg/ws/zod…,
ni Vite, ni React, ni PGlite).

## 1. Côté panel AlwaysData (une fois)

### a) Base PostgreSQL
Admin → **Bases de données → PostgreSQL** → Ajouter :
- une **base** (ex. `compte_gym`) et un **utilisateur** dédié avec mot de passe.
- L'hôte est `postgresql-compte.alwaysdata.net`.
- → `DATABASE_URL=postgresql://utilisateur:motdepasse@postgresql-compte.alwaysdata.net:5432/compte_gym`

### b) SSH
Admin → **Accès distant → SSH** : activer un utilisateur SSH (mot de passe et/ou
clé publique). Sert au dépôt des fichiers et au `npm install` serveur.

### c) Le site
Admin → **Web → Sites** → Ajouter :
- **Type : Node.js** (ou « programme utilisateur »).
- **Commande : `node dist/server.cjs`**
- **Répertoire de travail : `/home/compte/salle-de-sport`** (la racine déployée —
  important : les migrations sont résolues relativement au cwd).
- **Version de Node : ≥ 20.**
- **Environnement** :
  ```
  NODE_ENV=production
  DATABASE_URL=postgresql://utilisateur:motdepasse@postgresql-compte.alwaysdata.net:5432/compte_gym
  ```
  (Ne PAS définir PORT ni IP : AlwaysData les injecte, le serveur les lit.)
- HTTPS : automatique (certificat AlwaysData). WebSocket : passe par leur proxy.

## 2. Artefacts à déployer

```
salle-de-sport/
  dist/                      ← npm run build (front + sw.js + server.cjs)
  server/db/migrations/      ← appliquées au démarrage (chemin relatif au cwd)
  package.json
  package-lock.json
```
Rien d'autre (ni src/, ni data/, ni node_modules — il est reconstruit sur place).

## 3. Premier déploiement

```bash
# En local
npm run build

# Dépôt des fichiers (scp/rsync/SFTP) vers ~/salle-de-sport :
#   dist/  server/db/migrations/  package.json  package-lock.json

# Sur le serveur (SSH)
cd ~/salle-de-sport
npm install --omit=dev

# Seed de la bibliothèque : DEPUIS LE POSTE LOCAL (le serveur n'a pas tsx/data)
# PowerShell :
#   $env:DATABASE_URL='postgresql://...alwaysdata.net:5432/...'; npm run db:seed
# (idempotent : vide puis recharge la bibliothèque ; ne touche PAS aux comptes
#  utilisateurs ni à la synchronisation)

# Puis démarrer/redémarrer le site depuis le panel (Web → Sites → ↻)
```

Vérifications post-déploiement :
- `https://compte.alwaysdata.net/api/programs` → 15 programmes ;
- la page s'affiche, inscription d'un compte OK (cookie `Secure` : il faut HTTPS) ;
- la sync WebSocket se connecte (page Compte → « Synchronisé sur tes appareils »).

## 4. Mises à jour suivantes

1. `npm run build` en local ;
2. re-déposer `dist/` (+ `server/db/migrations/` si nouvelles migrations,
   + package.json/lock si dépendances changées → `npm install --omit=dev`) ;
3. re-seed seulement si `data/` a changé ;
4. redémarrer le site (panel ou API AlwaysData).

## CI/CD automatique (GitHub Actions)

Workflow : `.github/workflows/deploy.yml`. À chaque **push sur `main`** :
1. **CI** : `npm ci` → `typecheck` → `test` (Vitest) → `build`.
2. **Deploy** (si CI verte) : build, puis **rsync** de `dist/` + `server/db/migrations/`
   + `package.json`/`lock` vers `~/salle-de-sport`, `npm install --omit=dev`, puis `pkill -x node`
   (AlwaysData relance l'upstream avec le nouveau code à la 1ʳᵉ requête ; les migrations Drizzle
   s'appliquent au démarrage). Une requête de réveil + vérif termine le job.

Les **pull requests** ne lancent que la CI (pas le deploy).

### Secret à configurer (une fois)
GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret** :
- **`SSH_PRIVATE_KEY`** = le contenu **intégral** de la clé privée de déploiement
  (`~/.ssh/alwaysdata_salle` côté poste local — la clé publique est déjà dans
  `~/.ssh/authorized_keys` du serveur). Ne jamais committer cette clé.

Host (`ssh-fitnessapp.alwaysdata.net`) et user (`fitnessapp`) sont en clair dans le workflow
(non sensibles). Le `.env` serveur (NODE_ENV + DATABASE_URL) reste sur le serveur, hors CI.

### Ce que la CI ne fait PAS
- **Pas de seed** automatique (le seed vide+recharge la bibliothèque ; il ne touche pas aux comptes
  ni à la sync, mais inutile à chaque deploy). Re-seeder seulement quand `data/` change, **depuis le
  poste local** : `DATABASE_URL=... npm run db:seed`.
- Les **migrations de schéma** (`server/db/migrations/`) sont envoyées par le deploy et appliquées
  automatiquement au redémarrage du serveur — rien à faire manuellement.

### Restart plus « propre » (option)
`pkill -x node` marche (relance à la demande). Pour un redémarrage explicite sans coupure, on peut
passer par l'**API AlwaysData** (`PATCH .../v1/site/<id>/` avec un token API en secret) — à ajouter
plus tard si besoin.

## Notes de parité (validées en local contre un vrai PostgreSQL)

- Migrations Drizzle appliquées automatiquement au démarrage et par le seed.
- `app.set('trust proxy', 1)` : IP cliente réelle derrière le proxy AlwaysData.
- Cookies de session `HttpOnly; Secure; SameSite=Lax` en production.
- Le serveur écoute sur `process.env.IP`/`process.env.PORT` quand AlwaysData les fournit.
- PGlite n'est PAS chargé quand `DATABASE_URL` est défini (devDependency, absente en prod).
