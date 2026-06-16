# AC-KINETIK

Application web (PWA) d'exercices de musculation et de savoir d'entraînement,
pensée pour un usage **mobile à la salle** et un hébergement **léger** sur la
version gratuite d'AlwaysData.

**Multi-comptes** (authentification maison, cookie httpOnly) avec **synchronisation**
des séances, programmes persos et favoris entre appareils, et fonctionnement
**offline-first** (tout le suivi vit en local, synchronisé en tâche de fond).

> Contenu en **français**, identifiants/énumérations en **anglais**.
> Base **SQLite-like en local (PGlite)**, **PostgreSQL** en production — même code.

## Stack

| Couche | Choix |
|---|---|
| Langage | **TypeScript** |
| Frontend | **Vite + React 19 + Tailwind v4**, en **PWA** (installable, offline) |
| Backend | **Express** (API REST) |
| Base de données | **Drizzle ORM** · **PGlite** (Postgres embarqué) en local · **PostgreSQL** en prod |
| Validation | **Zod** + contrôles d'intégrité au seed |

Aligné sur l'écosystème des autres projets (Co-Tripper, Courses…) : Node/TS,
DB légère en local → PostgreSQL AlwaysData, déploiement Node standalone.

## Contenu (vérifié en base)

- **873 exercices, tous en français** : 38 fiches complètes (exécution, erreurs, conseils, contre-indications) + 835 traduites (nom + exécution)
- 17 muscles · 12 matériels · 10 patterns de mouvement
- Savoir : 12 principes sourcés · 5 schémas de reps · 13 repères de volume · 4 splits
- 9 sources documentées (Schoenfeld, ACSM, NSCA, RP…)

## Démarrage rapide (local)

```bash
npm install
npm run db:generate   # (déjà fait) génère la migration Drizzle depuis le schéma
npm run db:seed       # crée la base PGlite (./​.pglite) et charge les données validées
npm run dev           # API + front sur http://localhost:3003
```

> Aucune base à installer : PGlite est un PostgreSQL embarqué (un dossier `.pglite`,
> zéro serveur, zéro Docker).

## Architecture (découplée)

Dépendances **UI → client API → routes → repository → DB**. Le SQL ne vit que
dans les repositories ; le moteur de base est derrière la config (une variable
d'env). Toucher une couche n'impacte pas les autres.

```
src/                      Frontend React (Vite)
  pages/                  Home, Exercises, Muscles, Knowledge, Programs, Workout, Suivi, Account, Admin
  components/             Layout (nav mobile), cartes, bandeaux (maintenance/email), ui
  lib/                    api.ts (client typé) · auth.ts · sync.ts (WebSocket)
                          workoutLogs / myPrograms / favorites / records (stores localStorage synchronisés)
server/
  db/schema.ts            schéma Drizzle (pg-core)
  db/client.ts            PGlite (local) | PostgreSQL (prod) selon DATABASE_URL
  db/seed.ts              valide data/*.json + dataset, puis insère (transactionnel)
  db/migrations/          migrations Drizzle (appliquées au démarrage)
  repositories/           exercise / muscle / knowledge / program / user — TOUT le SQL ici
  routes/                 REST /api/* : exercises, muscles, knowledge, programs, auth, admin
  auth.ts                 sessions (cookie httpOnly), scrypt, rôles · sync.ts (WebSocket)
  crypto.ts               chiffrement au repos (AES-256-GCM) · email.ts (SMTP/confirmation)
server.ts                 entrée Express (API + Vite en dev / dist en prod)
data/                     librairie JSON : référentiels, savoir, programmes, enrichissement FR
etl/sources/              dataset d'amorçage (free-exercise-db, domaine public)
docs/                     SOURCES.md · deploiement-alwaysdata.md
```

## Qualité des données

Le seed (`server/db/seed.ts`) **valide avant d'insérer** : tout muscle / matériel /
pattern / source cité doit exister, énumérations légales, bornes numériques
(reps > 0, intensité ∈ [1,100], MEV ≤ MRV). Une anomalie **stoppe le seed**.
Les champs inconnus dans la source restent `NULL` — rien d'inventé.

## API

**Référentiel (lecture, partagé)**
```
GET /api/exercises?search=&muscle=&equipment=&level=&category=&force=&page=
GET /api/exercises/:id | /api/exercises/facets
GET /api/muscles | /api/muscles/:id
GET /api/knowledge/principles | rep-schemes | volume-landmarks | splits | sources
GET /api/programs | /api/programs/:id
GET /api/app-status                         (annonce + mode maintenance)
```

**Comptes** (session = cookie httpOnly ; mots de passe scrypt + sel)
```
POST /api/auth/register | login | logout | verify-email | resend-verification
POST /api/auth/forgot-password | reset-password | change-password | delete-account
GET  /api/auth/me                            POST /api/auth/gender
```

**Admin** (réservé `role=admin`, gardé côté serveur sur chaque route)
```
GET  /api/admin/stats | /api/admin/users
DELETE /api/admin/users/:id    POST /api/admin/users/:id/{role,reset-password}
GET/POST /api/admin/settings/smtp           POST /api/admin/settings/test-email
```

**Synchronisation** : WebSocket `/ws`, **authentifié par cookie** (l'`userId` vient du
serveur, jamais du client). Le client merge (last-write-wins) ; le serveur ne stocke que
des **blobs chiffrés au repos**, strictement cloisonnés par utilisateur.

## Déploiement AlwaysData (étape ultérieure)

1. Créer une base **PostgreSQL** dans l'admin AlwaysData.
2. Définir `DATABASE_URL` (env du site) vers cette base.
3. `npm ci && npm run build` → `dist/` (front) + `dist/server.cjs` (serveur).
4. Démarrer `node dist/server.cjs` : les **migrations s'appliquent au démarrage**.
5. Charger les données une fois : `DATABASE_URL=… npm run db:seed`.

Pas de Docker, un seul process Node — tient dans le free tier (256 Mo RAM, ¼ CPU).

> **Déploiements suivants : automatisés** (GitHub Actions, `.github/workflows/deploy.yml`) :
> tests + build, rsync de `dist/` + `data/` + migrations, **reseed transactionnel du
> catalogue** sur le serveur, puis redémarrage. Secrets (SSH, DB) en secrets GitHub.

## Roadmap

- Enrichir davantage de fiches en complet (erreurs/conseils/contre-indications) au-delà des 38.
- Images des exercices (chemins upstream conservés dans `exercise.images`).

Backlog détaillé des évolutions : [docs/ROADMAP.md](docs/ROADMAP.md).
Détail des sources & méthodologie : [docs/SOURCES.md](docs/SOURCES.md).
