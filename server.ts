import 'dotenv/config';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import exercisesRouter from './server/routes/exercises';
import musclesRouter from './server/routes/muscles';
import knowledgeRouter from './server/routes/knowledge';
import programsRouter from './server/routes/programs';
import authRouter from './server/routes/auth';
import adminRouter from './server/routes/admin';
import {attachSync} from './server/sync';
import {migrateDb} from './server/db/client';
import {bootstrapAdmins, deleteUnverifiedBefore, grandfatherExistingUsers} from './server/repositories/userRepository';
import {adminEmails} from './server/auth';

const app = express();
const PORT = Number(process.env.PORT) || 3003;
// AlwaysData fournit l'adresse d'écoute via IP (sinon : toutes interfaces).
const HOST = process.env.IP || '0.0.0.0';

// Derrière le reverse-proxy d'AlwaysData : IP cliente réelle.
app.set('trust proxy', 1);

// En-têtes de sécurité (CSP désactivée pour ne pas casser la SPA Vite/PWA).
app.use(helmet({contentSecurityPolicy: false}));
// Compression gzip (JSON d'API ~−70/80 %) : bande passante + mobile.
app.use(compression());
app.use(express.json({limit: '1mb'}));

// CORS : permet à la PWA installée / l'app mobile d'appeler l'API.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use('/api/exercises', exercisesRouter);
app.use('/api/muscles', musclesRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/programs', programsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

async function startServer() {
  // Auto-migration au démarrage : la base (PostgreSQL en prod, PGlite en dev)
  // est mise à niveau avant de servir les requêtes.
  await migrateDb();

  // Promotion des admin(s) déclarés dans ADMIN_EMAILS (idempotent).
  const promoted = await bootstrapAdmins(adminEmails());
  if (promoted.length) console.log(`[AC-KINETIK] Admin promu(s) : ${promoted.join(', ')}`);

  // Comptes créés AVANT la confirmation d'email : régularisés (considérés vérifiés).
  const regularized = await grandfatherExistingUsers();
  if (regularized) console.log(`[AC-KINETIK] ${regularized} compte(s) historique(s) régularisé(s) (email réputé vérifié)`);
  // Nettoyage anti-bots : comptes du nouveau flux jamais confirmés depuis > 7 jours.
  const purged = await deleteUnverifiedBefore(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  if (purged) console.log(`[AC-KINETIK] ${purged} compte(s) non confirmé(s) purgé(s)`);

  if (process.env.NODE_ENV !== 'production') {
    // Import dynamique : Vite n'est chargé qu'en dev, le bundle de prod
    // (dist/server.cjs) ne dépend donc pas de Vite (hébergement léger AlwaysData).
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({server: {middlewareMode: true}, appType: 'spa'});
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`[AC-KINETIK] En écoute sur http://${HOST}:${PORT}`);
  });
  attachSync(server);
}

startServer().catch((err) => {
  console.error('[AC-KINETIK] Échec du démarrage :', err);
  process.exit(1);
});
