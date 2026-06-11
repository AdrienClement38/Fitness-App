import 'dotenv/config';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import exercisesRouter from './server/routes/exercises';
import musclesRouter from './server/routes/muscles';
import knowledgeRouter from './server/routes/knowledge';
import {migrateDb} from './server/db/client';

const app = express();
const PORT = Number(process.env.PORT) || 3003;

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
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use('/api/exercises', exercisesRouter);
app.use('/api/muscles', musclesRouter);
app.use('/api/knowledge', knowledgeRouter);

async function startServer() {
  // Auto-migration au démarrage : la base (PostgreSQL en prod, PGlite en dev)
  // est mise à niveau avant de servir les requêtes.
  await migrateDb();

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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Salle de sport] En écoute sur http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Salle de sport] Échec du démarrage :', err);
  process.exit(1);
});
