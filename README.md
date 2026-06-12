# Kinetic

Application web (PWA) d'exercices de musculation et de savoir d'entraînement,
pensée pour un usage **mobile à la salle** et un hébergement **léger** sur la
version gratuite d'AlwaysData.

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
  pages/                  Home, Exercises, ExerciseDetail, Muscles, MuscleDetail, Knowledge
  components/             Layout (nav mobile), ExerciseCard, ui
  lib/                    api.ts (client typé + libellés FR), useFetch.ts
server/
  db/schema.ts            schéma Drizzle (pg-core)
  db/client.ts            PGlite (local) | PostgreSQL (prod) selon DATABASE_URL
  db/seed.ts              valide data/*.json + dataset, puis insère
  db/migrations/          migrations Drizzle (générées)
  repositories/           exercise / muscle / knowledge — TOUT le SQL ici
  routes/                 endpoints REST /api/*
server.ts                 entrée Express (API + Vite en dev / dist en prod)
data/                     librairie JSON : référentiels, savoir, enrichissement FR
etl/sources/              dataset d'amorçage (free-exercise-db, domaine public)
docs/SOURCES.md           provenance & méthodologie qualité
```

## Qualité des données

Le seed (`server/db/seed.ts`) **valide avant d'insérer** : tout muscle / matériel /
pattern / source cité doit exister, énumérations légales, bornes numériques
(reps > 0, intensité ∈ [1,100], MEV ≤ MRV). Une anomalie **stoppe le seed**.
Les champs inconnus dans la source restent `NULL` — rien d'inventé.

## API

```
GET /api/exercises?search=&muscle=&equipment=&level=&category=&force=&page=
GET /api/exercises/:id
GET /api/exercises/facets
GET /api/muscles            GET /api/muscles/:id
GET /api/knowledge/principles | rep-schemes | volume-landmarks | splits | sources
```

## Déploiement AlwaysData (étape ultérieure)

1. Créer une base **PostgreSQL** dans l'admin AlwaysData.
2. Définir `DATABASE_URL` (env du site) vers cette base.
3. `npm ci && npm run build` → `dist/` (front) + `dist/server.cjs` (serveur).
4. Démarrer `node dist/server.cjs` : les **migrations s'appliquent au démarrage**.
5. Charger les données une fois : `DATABASE_URL=… npm run db:seed`.

Pas de Docker, un seul process Node — tient dans le free tier (256 Mo RAM, ¼ CPU).

## Roadmap

- Enrichir davantage de fiches en complet (erreurs/conseils/contre-indications) au-delà des 38.
- Images (chemins upstream conservés dans `exercise.images`).
- Fonctions « connecté » : favoris, suivi de séances, programmes.

Backlog détaillé des évolutions : [docs/ROADMAP.md](docs/ROADMAP.md).
Détail des sources & méthodologie : [docs/SOURCES.md](docs/SOURCES.md).
