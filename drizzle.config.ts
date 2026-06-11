import {defineConfig} from 'drizzle-kit';

/**
 * Config Drizzle Kit (génération des migrations SQL).
 * Dialecte PostgreSQL : les migrations s'appliquent à PGlite (local) comme à
 * PostgreSQL (prod, AlwaysData). Application : server/db/migrate.ts + au démarrage.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
});
