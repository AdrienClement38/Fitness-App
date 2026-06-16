/** Routes d'authentification : inscription, connexion, déconnexion, profil courant. */
import {Router} from 'express';
import {z} from 'zod';
import {
  SESSION_COOKIE,
  adminEmails,
  cookieOptions,
  getUserFromRequest,
  hashPassword,
  newToken,
  parseCookies,
  sessionExpiry,
  verifyPassword,
} from '../auth';
import {
  consumeResetToken,
  createSession,
  createUser,
  deleteExpiredSessions,
  deleteSession,
  deleteUser,
  deleteUserSessions,
  getUserByEmail,
  getUserById,
  markUserVerified,
  setGender,
  setResetToken,
  setUserRole,
  setVerifyToken,
  updatePassword,
  verifyEmailByToken,
} from '../repositories/userRepository';
import {isEmailConfigured, sendPasswordResetEmail, sendVerificationEmail} from '../email';
import {isDisposableEmail} from '../disposableEmails';
import {closeUserSockets} from '../sync';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const RESET_TTL_MS = 60 * 60 * 1000; // 1 h
// Hôtes de confiance pour les liens INSÉRÉS DANS LES EMAILS (confirmation / réinitialisation).
// Anti « Host header poisoning » : un en-tête Host forgé par un attaquant ne doit jamais finir
// dans un lien (avec jeton) envoyé à la victime. Priorité : APP_URL (recommandé en prod) ;
// sinon on n'accepte que localhost (dev) ou un hôte explicitement de confiance, et à défaut on
// retombe sur l'hôte prod — JAMAIS le Host fourni par le client.
const TRUSTED_HOSTS = (process.env.APP_TRUSTED_HOSTS || 'fitnessapp.alwaysdata.net')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);
function appBase(req: {protocol: string; get: (h: string) => string | undefined}): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const host = (req.get('host') || '').toLowerCase();
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  if (isLocal || TRUSTED_HOSTS.includes(host)) return `${req.protocol}://${host}`;
  return `https://${TRUSTED_HOSTS[0]}`;
}

const router = Router();

const credentials = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

// Anti-brute-force basique en mémoire (instance unique sur AlwaysData free tier).
const attempts = new Map<string, {count: number; reset: number}>();
function rateLimited(key: string, max = 10, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  // Éviction opportuniste des fenêtres expirées : borne la mémoire même sous un
  // spray d'IP variées (sinon la Map croît sans limite).
  if (attempts.size > 5000) {
    for (const [k, v] of attempts) if (v.reset < now) attempts.delete(k);
  }
  const e = attempts.get(key);
  if (!e || e.reset < now) {
    attempts.set(key, {count: 1, reset: now + windowMs});
    return false;
  }
  e.count += 1;
  return e.count > max;
}

router.post('/register', async (req, res) => {
  if (rateLimited(`reg:${req.ip}`)) return res.status(429).json({error: 'Trop de tentatives. Réessaie dans quelques minutes.'});
  // Honeypot : champ caché du formulaire que seuls les bots remplissent. Rempli -> on rejette.
  if (typeof req.body?.website === 'string' && req.body.website.trim() !== '') {
    return res.status(400).json({error: 'Inscription invalide.'});
  }
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Email invalide ou mot de passe trop court (8 caractères minimum).'});
  const email = parsed.data.email.trim().toLowerCase();
  // Refus des adresses jetables (anti-bots / abus du quota d'envoi).
  if (isDisposableEmail(email)) return res.status(400).json({error: 'Les adresses email jetables ne sont pas acceptées.'});
  if (await getUserByEmail(email)) return res.status(409).json({error: 'Un compte existe déjà avec cet email.'});

  // Sexe (optionnel) : seules 'male'/'female' sont retenues, sinon null (non renseigné).
  const gender = req.body?.gender === 'male' || req.body?.gender === 'female' ? req.body.gender : null;
  // Confirmation d'email seulement si un envoi est réellement configuré. Sinon, la
  // confirmation serait impossible -> le compte naît VÉRIFIÉ (jamais de bandeau ni de purge).
  const emailActive = await isEmailConfigured();
  const verifyToken = emailActive ? newToken() : undefined;
  const user = await createUser(
    email,
    await hashPassword(parsed.data.password),
    verifyToken,
    emailActive ? new Date(Date.now() + VERIFY_TTL_MS) : undefined,
    gender,
  );
  if (!emailActive) await markUserVerified(user.id);
  // Auto-promotion si l'email est déclaré admin (ADMIN_EMAILS) : pas besoin de redémarrer.
  const role: 'user' | 'admin' = adminEmails().includes(email) ? 'admin' : 'user';
  if (role !== user.role) await setUserRole(user.id, role);
  // Envoi best-effort (seulement si configuré) : une panne SMTP ne bloque pas l'inscription.
  if (emailActive) {
    sendVerificationEmail(email, `${appBase(req)}/verifier-email?token=${verifyToken}`).catch((e) =>
      console.error('[email] envoi confirmation échoué :', (e as Error).message),
    );
  }
  const token = newToken();
  await createSession(user.id, token, sessionExpiry());
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  return res.status(201).json({id: user.id, email: user.email, role, emailVerified: !emailActive, gender});
});

router.post('/login', async (req, res) => {
  if (rateLimited(`login:${req.ip}`)) return res.status(429).json({error: 'Trop de tentatives. Réessaie dans quelques minutes.'});
  void deleteExpiredSessions().catch(() => {}); // purge best-effort, ne bloque pas le login
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Email ou mot de passe invalide.'});
  const email = parsed.data.email.trim().toLowerCase();
  // Limite AUSSI par compte ciblé (en plus de l'IP) : freine un brute-force distribué sur
  // de multiples IP contre un même email (la limite par IP seule ne l'attrape pas).
  if (rateLimited(`login-id:${email}`)) return res.status(429).json({error: 'Trop de tentatives sur ce compte. Réessaie dans quelques minutes.'});

  const user = await getUserByEmail(email);
  if (!user) {
    await hashPassword(parsed.data.password); // équilibre le temps de réponse (anti-énumération)
    return res.status(401).json({error: 'Email ou mot de passe incorrect.'});
  }
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({error: 'Email ou mot de passe incorrect.'});
  }

  const token = newToken();
  await createSession(user.id, token, sessionExpiry());
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  return res.json({id: user.id, email: user.email, role: user.role, emailVerified: user.emailVerified, gender: user.gender});
});

const verifyBody = z.object({token: z.string().min(1).max(256)});
// Public : le lien de l'email peut être ouvert sur un appareil non connecté.
router.post('/verify-email', async (req, res) => {
  const parsed = verifyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Jeton manquant.'});
  const status = await verifyEmailByToken(parsed.data.token);
  if (status === 'ok') return res.json({ok: true});
  return res.status(400).json({error: status === 'expired' ? 'Lien expiré.' : 'Lien invalide ou déjà utilisé.'});
});

// Renvoi de l'email de confirmation (utilisateur connecté, non vérifié).
router.post('/resend-verification', async (req, res) => {
  const auth = await getUserFromRequest(req);
  if (!auth) return res.status(401).json({error: 'Non connecté.'});
  if (auth.emailVerified) return res.json({ok: true, alreadyVerified: true});
  if (rateLimited(`verif:${auth.id}`, 5)) return res.status(429).json({error: 'Trop de demandes. Réessaie dans quelques minutes.'});
  const verifyToken = newToken();
  await setVerifyToken(auth.id, verifyToken, new Date(Date.now() + VERIFY_TTL_MS));
  await sendVerificationEmail(auth.email, `${appBase(req)}/verifier-email?token=${verifyToken}`).catch((e) =>
    console.error('[email] renvoi confirmation échoué :', (e as Error).message),
  );
  return res.json({ok: true});
});

// Demande de réinitialisation. Anti-énumération : réponse identique qu'un compte
// existe ou non. Rate-limité par IP ET par email (anti-spam d'une boîte victime).
const forgotBody = z.object({email: z.string().email().max(200)});
router.post('/forgot-password', async (req, res) => {
  if (rateLimited(`forgot:${req.ip}`)) return res.status(429).json({error: 'Trop de demandes. Réessaie dans quelques minutes.'});
  const parsed = forgotBody.safeParse(req.body);
  if (!parsed.success) return res.json({ok: true});
  const email = parsed.data.email.trim().toLowerCase();
  if (rateLimited(`forgot-mail:${email}`, 3)) return res.json({ok: true});
  const user = await getUserByEmail(email);
  if (user) {
    const resetToken = newToken();
    await setResetToken(user.id, resetToken, new Date(Date.now() + RESET_TTL_MS));
    sendPasswordResetEmail(email, `${appBase(req)}/reinitialiser-mot-de-passe?token=${resetToken}`).catch((e) =>
      console.error('[email] envoi réinit échoué :', (e as Error).message),
    );
  }
  return res.json({ok: true});
});

// Application d'un nouveau mot de passe via le jeton reçu par email (single-use).
const resetBody = z.object({token: z.string().min(1).max(256), newPassword: z.string().min(8).max(200)});
router.post('/reset-password', async (req, res) => {
  const parsed = resetBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Lien invalide ou mot de passe trop court (8 caractères minimum).'});
  const {status, userId} = await consumeResetToken(parsed.data.token, await hashPassword(parsed.data.newPassword));
  if (status !== 'ok') {
    return res.status(400).json({error: status === 'expired' ? 'Lien expiré — refais une demande.' : 'Lien invalide ou déjà utilisé.'});
  }
  if (userId) {
    await deleteUserSessions(userId); // déconnecte partout après changement de mot de passe
    closeUserSockets(userId);
  }
  return res.json({ok: true});
});

router.post('/logout', async (req, res) => {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (token) await deleteSession(token);
  res.clearCookie(SESSION_COOKIE, {path: '/'});
  return res.json({ok: true});
});

router.get('/me', async (req, res) => {
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({error: 'Non connecté.'});
  return res.json(user);
});

// Met à jour son sexe (Homme/Femme/null) — pour la perso (programmes mis en avant, logo).
router.post('/gender', async (req, res) => {
  const auth = await getUserFromRequest(req);
  if (!auth) return res.status(401).json({error: 'Non connecté.'});
  const gender = req.body?.gender === 'male' || req.body?.gender === 'female' ? req.body.gender : null;
  await setGender(auth.id, gender);
  return res.json({ok: true, gender});
});

const passwordChange = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

router.post('/change-password', async (req, res) => {
  const auth = await getUserFromRequest(req);
  if (!auth) return res.status(401).json({error: 'Non connecté.'});
  // Borne les essais de vérification du mot de passe ACTUEL (clé sur l'utilisateur authentifié).
  if (rateLimited(`pwck:${auth.id}`)) return res.status(429).json({error: 'Trop de tentatives. Réessaie dans quelques minutes.'});
  const parsed = passwordChange.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Nouveau mot de passe trop court (8 caractères minimum).'});

  const user = await getUserById(auth.id);
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return res.status(401).json({error: 'Mot de passe actuel incorrect.'});
  }

  await updatePassword(user.id, await hashPassword(parsed.data.newPassword));
  // Révoque toutes les sessions (déconnecte les autres appareils) puis recrée celle-ci.
  await deleteUserSessions(user.id);
  closeUserSockets(user.id); // ferme aussi les canaux temps réel des sessions révoquées
  const token = newToken();
  await createSession(user.id, token, sessionExpiry());
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  return res.json({ok: true});
});

const deleteAccount = z.object({password: z.string().min(1).max(200)});

router.post('/delete-account', async (req, res) => {
  const auth = await getUserFromRequest(req);
  if (!auth) return res.status(401).json({error: 'Non connecté.'});
  if (rateLimited(`pwck:${auth.id}`)) return res.status(429).json({error: 'Trop de tentatives. Réessaie dans quelques minutes.'});
  const parsed = deleteAccount.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Mot de passe requis pour confirmer.'});

  const user = await getUserById(auth.id);
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({error: 'Mot de passe incorrect.'});
  }

  await deleteUser(user.id); // efface le compte + ses sessions/données (cascade)
  closeUserSockets(user.id); // ferme les canaux temps réel du compte supprimé
  res.clearCookie(SESSION_COOKIE, {path: '/'});
  return res.json({ok: true});
});

export default router;
