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
import {bootstrapAdmins, deleteUnverifiedBefore, grandfatherExistingUsers, markAllVerified} from './server/repositories/userRepository';
import {adminEmails, getUserFromRequest} from './server/auth';
import {isEmailConfigured} from './server/email';
import {getPublicAppStatus, isMaintenanceActive, loadAppStatus} from './server/appStatus';
import {dataEncryptionEnabled} from './server/crypto';
import type {NextFunction, Request, Response} from 'express';

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

// État applicatif public (bandeau d'annonce + mode maintenance) : lu par le client
// au chargement. Toujours accessible, même en maintenance.
app.get('/api/app-status', (_req, res) => res.json(getPublicAppStatus()));

// Garde de maintenance : quand le mode est actif, les routes de DONNÉES sont coupées
// pour tout le monde sauf l'admin. Auth/admin/app-status restent ouverts (l'admin doit
// pouvoir se connecter et désactiver, le client doit pouvoir lire l'état). Court-circuit
// immédiat (flag mémoire) hors maintenance → zéro surcoût en temps normal.
async function maintenanceGuard(req: Request, res: Response, next: NextFunction) {
  if (!isMaintenanceActive()) return next();
  const user = await getUserFromRequest(req);
  if (user?.role === 'admin') return next();
  return res.status(503).json({error: 'maintenance', message: getPublicAppStatus().maintenance.message});
}

app.use('/api/exercises', maintenanceGuard, exercisesRouter);
app.use('/api/muscles', maintenanceGuard, musclesRouter);
app.use('/api/knowledge', maintenanceGuard, knowledgeRouter);
app.use('/api/programs', maintenanceGuard, programsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

async function startServer() {
  // Auto-migration au démarrage : la base (PostgreSQL en prod, PGlite en dev)
  // est mise à niveau avant de servir les requêtes.
  await migrateDb();

  // Garde de confidentialité : en prod, alerter si le chiffrement au repos est OFF
  // (DATA_ENCRYPTION_KEY absente -> blobs sync_items + mot de passe SMTP stockés en clair).
  if (process.env.NODE_ENV === 'production' && !dataEncryptionEnabled) {
    console.warn(
      '[AC-KINETIK] ⚠️ DATA_ENCRYPTION_KEY absente en production : sync_items et mot de passe SMTP stockés EN CLAIR. Définis DATA_ENCRYPTION_KEY pour activer le chiffrement au repos.',
    );
  }

  // Promotion des admin(s) déclarés dans ADMIN_EMAILS (idempotent).
  const promoted = await bootstrapAdmins(adminEmails());
  if (promoted.length) console.log(`[AC-KINETIK] Admin promu(s) : ${promoted.join(', ')}`);

  // Comptes créés AVANT la confirmation d'email : régularisés (considérés vérifiés).
  const regularized = await grandfatherExistingUsers();
  if (regularized) console.log(`[AC-KINETIK] ${regularized} compte(s) historique(s) régularisé(s) (email réputé vérifié)`);
  // Confirmation d'email : active UNIQUEMENT si un envoi est réellement configuré.
  //  - configuré   -> nettoyage anti-bots : comptes jamais confirmés depuis > 7 jours.
  //  - non configuré -> la confirmation est impossible : on régularise tout le monde
  //    (jamais de bandeau ni de purge pour un compte qui ne pourra jamais confirmer).
  if (await isEmailConfigured()) {
    const purged = await deleteUnverifiedBefore(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    if (purged) console.log(`[AC-KINETIK] ${purged} compte(s) non confirmé(s) purgé(s)`);
  } else {
    const reputedVerified = await markAllVerified();
    if (reputedVerified) console.log(`[AC-KINETIK] Envoi d'email non configuré → ${reputedVerified} compte(s) régularisé(s) (confirmation désactivée)`);
  }

  // État applicatif (annonce + maintenance) en cache mémoire.
  await loadAppStatus();

  if (process.env.NODE_ENV !== 'production') {
    // Import dynamique : Vite n'est chargé qu'en dev, le bundle de prod
    // (dist/server.cjs) ne dépend donc pas de Vite (hébergement léger AlwaysData).
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({server: {middlewareMode: true}, appType: 'spa'});
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Le bundle serveur (server.cjs / seed.cjs) et les sourcemaps vivent dans dist/ mais ne
    // sont PAS du contenu public -> on les masque (sinon GET /server.cjs exposerait le code serveur).
    app.use((req, res, next) => {
      if (/\.(cjs|map)$/.test(req.path)) return res.status(404).end();
      next();
    });
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
