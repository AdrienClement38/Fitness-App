import {defineConfig} from 'vitest/config';

/**
 * Tests côté Node (repositories + accès DB) sur une base PGlite ISOLÉE
 * (`./.pglite-test`, distincte de la base de dev `./.pglite`).
 * Fichiers exécutés en série : une seule instance PGlite à la fois.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: {PGLITE_DIR: './.pglite-test'},
    fileParallelism: false,
    hookTimeout: 30000,
  },
});
