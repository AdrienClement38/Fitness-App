import {drizzle as drizzlePg, type NodePgDatabase} from 'drizzle-orm/node-postgres';
import {migrate as migratePg} from 'drizzle-orm/node-postgres/migrator';
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {Pool} from 'pg';
import * as schema from './schema';

/** Dossier de persistance de la base locale (PGlite). Surchargé par `PGLITE_DIR` (tests). */
export const LOCAL_DB_DIR = process.env.PGLITE_DIR || './.pglite';
const MIGRATIONS_FOLDER = './server/db/migrations';

let database: NodePgDatabase<typeof schema>;
let migrateFn: () => Promise<void>;

/**
 * TLS pour la connexion Postgres. AlwaysData présente un certificat valide
 * (TLS 1.3) → on vérifie le certificat (`ssl: true`). Désactivé pour un Postgres
 * local (localhost) ou via `DATABASE_SSL=disable` (parité locale sans TLS).
 */
function pgSsl(connectionString: string): boolean {
  if (process.env.DATABASE_SSL === 'disable') return false;
  try {
    const host = new URL(connectionString).hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
  } catch {
    /* URL non standard : on laisse pg gérer */
  }
  return true;
}

/**
 * Instance Drizzle unique + sa fonction de migration (même connexion).
 *  - `DATABASE_URL` défini (prod AlwaysData) → PostgreSQL via `pg`.
 *  - sinon (dev/test) → PGlite (Postgres embarqué, fichier local), chargé À LA
 *    DEMANDE : c'est une devDependency, absente des node_modules de prod
 *    (`npm install --omit=dev`) pour garder le serveur léger.
 */
if (process.env.DATABASE_URL) {
  const pool = new Pool({connectionString: process.env.DATABASE_URL, max: 4, ssl: pgSsl(process.env.DATABASE_URL)});
  const d = drizzlePg(pool, {schema});
  database = d;
  migrateFn = () => migratePg(d, {migrationsFolder: MIGRATIONS_FOLDER});
} else {
  // `__filename` existe en CJS (bundle esbuild), `import.meta.url` en ESM (tsx/vitest).
  const req = createRequire(typeof __filename !== 'undefined' ? __filename : import.meta.url);
  const {PGlite} = req('@electric-sql/pglite') as typeof import('@electric-sql/pglite');
  const {drizzle: drizzlePglite} = req('drizzle-orm/pglite') as typeof import('drizzle-orm/pglite');
  const {migrate: migratePglite} = req('drizzle-orm/pglite/migrator') as typeof import('drizzle-orm/pglite/migrator');

  mkdirSync(LOCAL_DB_DIR, {recursive: true});
  const client = new PGlite(LOCAL_DB_DIR);
  const d = drizzlePglite(client, {schema});
  // API de requête identique (même dialecte pg-core) : cast sûr à l'usage.
  database = d as unknown as NodePgDatabase<typeof schema>;
  migrateFn = () => migratePglite(d, {migrationsFolder: MIGRATIONS_FOLDER});
}

export const db = database;
/** Applique les migrations sur l'instance courante (au démarrage + seed + tests). */
export const migrateDb = migrateFn;
export {schema};
