import 'dotenv/config';
import {migrateDb} from './client';

/** Applique les migrations Drizzle (script `npm run db:migrate`). */
migrateDb()
  .then(() => {
    console.log('[db] migrations appliquées.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[db] échec des migrations :', err);
    process.exit(1);
  });
