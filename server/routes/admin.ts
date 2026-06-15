/**
 * Routes d'administration, réservées aux comptes role='admin'. Gestion des
 * comptes utilisateurs : liste (infos de COMPTE uniquement, jamais le contenu
 * privé), suppression, reset de mot de passe, changement de rôle. Le rôle est
 * vérifié CÔTÉ SERVEUR sur chaque route (cacher l'UI ne suffirait pas).
 */
import {Router} from 'express';
import {z} from 'zod';
import {getUserFromRequest, hashPassword, newToken, type AuthUser} from '../auth';
import {
  deleteUser,
  deleteUserSessions,
  getAdminStats,
  getUserById,
  listUsersWithCounts,
  setUserRole,
  updatePassword,
} from '../repositories/userRepository';
import {clearSmtpConfig, configForTest, saveSmtpConfig, sendTestEmail, smtpStatus} from '../email';
import {getAdminAppStatus, setAnnouncement, setMaintenance} from '../appStatus';
import {closeUserSockets} from '../sync';

const router = Router();

// Garde admin sur TOUTES les routes de ce routeur.
router.use(async (req, res, next) => {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({error: 'Non connecté.'});
  if (user.role !== 'admin') return res.status(403).json({error: "Accès réservé à l'administrateur."});
  res.locals.admin = user;
  next();
});

router.get('/stats', async (_req, res) => {
  res.json(await getAdminStats());
});

router.get('/users', async (_req, res) => {
  res.json(await listUsersWithCounts());
});

router.delete('/users/:id', async (req, res) => {
  const admin = res.locals.admin as AuthUser;
  if (req.params.id === admin.id) return res.status(400).json({error: 'Tu ne peux pas supprimer ton propre compte ici.'});
  const target = await getUserById(req.params.id);
  if (!target) return res.status(404).json({error: 'Utilisateur introuvable.'});
  await deleteUser(target.id); // cascade : sessions + données synchronisées
  closeUserSockets(target.id);
  return res.json({ok: true});
});

const roleBody = z.object({role: z.enum(['user', 'admin'])});
router.post('/users/:id/role', async (req, res) => {
  const admin = res.locals.admin as AuthUser;
  if (req.params.id === admin.id) return res.status(400).json({error: 'Tu ne peux pas changer ton propre rôle.'});
  const parsed = roleBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Rôle invalide.'});
  const target = await getUserById(req.params.id);
  if (!target) return res.status(404).json({error: 'Utilisateur introuvable.'});
  await setUserRole(target.id, parsed.data.role);
  return res.json({ok: true, role: parsed.data.role});
});

router.post('/users/:id/reset-password', async (req, res) => {
  const target = await getUserById(req.params.id);
  if (!target) return res.status(404).json({error: 'Utilisateur introuvable.'});
  const tempPassword = newToken().replace(/[^a-zA-Z0-9]/g, '').slice(0, 12); // fort, à usage unique
  await updatePassword(target.id, await hashPassword(tempPassword));
  await deleteUserSessions(target.id); // déconnecte l'utilisateur de partout
  closeUserSockets(target.id);
  return res.json({tempPassword}); // à transmettre à l'utilisateur ; il le changera ensuite
});

/* ---- Paramètres applicatifs : SMTP (envoi d'emails) ------------------- */

// État de la config SMTP — JAMAIS le mot de passe (juste son existence + provenance).
router.get('/settings/smtp', async (_req, res) => {
  res.json(await smtpStatus());
});

const smtpBody = z.object({
  host: z.string().trim().min(1).max(200),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().trim().min(1).max(200),
  from: z.string().trim().max(200).optional(),
  pass: z.string().max(400).optional(), // vide => on conserve le mot de passe déjà stocké
});

// Enregistre la config SMTP (mot de passe chiffré au repos). Renvoie l'état (masqué).
router.post('/settings/smtp', async (req, res) => {
  const parsed = smtpBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Configuration SMTP invalide.'});
  await saveSmtpConfig(parsed.data);
  return res.json(await smtpStatus());
});

// Supprime la config SMTP en base (retour au repli env / dev).
router.delete('/settings/smtp', async (_req, res) => {
  await clearSmtpConfig();
  return res.json(await smtpStatus());
});

const testBody = z.object({
  host: z.string().trim().min(1).max(200).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  user: z.string().trim().min(1).max(200).optional(),
  from: z.string().trim().max(200).optional(),
  pass: z.string().max(400).optional(),
  to: z.string().trim().email().max(200).optional(),
});

// Envoie un email de test (config du formulaire si fournie, sinon effective). Par
// défaut le test s'envoie au compte émetteur lui-même (prouve qu'il sait envoyer).
// Remonte l'erreur SMTP brute pour le diagnostic.
router.post('/settings/test-email', async (req, res) => {
  const parsed = testBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Données de test invalides.'});
  const {to, ...cfg} = parsed.data;
  const config = await configForTest(cfg);
  if (!config) return res.status(400).json({error: 'Configuration SMTP incomplète (hôte, utilisateur et mot de passe requis).'});
  const dest = to || config.user; // par défaut : l'adresse émettrice elle-même
  try {
    await sendTestEmail(config, dest);
    return res.json({ok: true, to: dest});
  } catch (e) {
    return res.status(502).json({error: e instanceof Error ? e.message : "Échec de l'envoi du test."});
  }
});

/* ---- État applicatif : bandeau d'annonce + mode maintenance ----------- */

router.get('/settings/app', (_req, res) => {
  res.json(getAdminAppStatus());
});

const announcementBody = z.object({
  message: z.string().max(500),
  tone: z.enum(['info', 'warn']),
  active: z.boolean(),
});
router.post('/settings/announcement', async (req, res) => {
  const parsed = announcementBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Annonce invalide.'});
  await setAnnouncement(parsed.data);
  return res.json(getAdminAppStatus());
});

const maintenanceBody = z.object({active: z.boolean(), message: z.string().max(500)});
router.post('/settings/maintenance', async (req, res) => {
  const parsed = maintenanceBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Données invalides.'});
  await setMaintenance(parsed.data);
  return res.json(getAdminAppStatus());
});

export default router;
