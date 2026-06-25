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
  setEquipment,
  setGender,
  setResetToken,
  setUserRole,
  setVerifyToken,
  updatePassword,
  verifyEmailByToken,
} from '../repositories/userRepository';
import {isEmailConfigured, sendPasswordResetEmail, sendVerificationEmail} from '../email';
import {exchangeCodeForIdentity, googleAuthUrl, googleConfigured} from '../google';
import {isDisposableEmail} from '../disposableEmails';
import {closeUserSockets, notifyUser} from '../sync';
import {sanitizeEquipment} from '../../src/lib/equipment';

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
  // Matériel accessible (optionnel) : liste de jetons validée. Absent -> null (non renseigné).
  const equipment = sanitizeEquipment(req.body?.equipment);
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
    equipment,
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
  return res.status(201).json({id: user.id, email: user.email, role, emailVerified: !emailActive, gender, equipment});
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
  return res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    gender: user.gender,
    equipment: user.equipment,
  });
});

/* ---- « Sign in with Google » (OAuth 2.0) -------------------------------- */
const GOOGLE_STATE_COOKIE = 'sds_oauth_state';
const googleRedirectUri = (req: {protocol: string; get: (h: string) => string | undefined}) =>
  `${appBase(req)}/api/auth/google/callback`;

// Lance le flux : pose un cookie `state` (anti-CSRF) puis redirige vers le consentement Google.
router.get('/google', (req, res) => {
  if (!googleConfigured()) return res.redirect('/compte?error=google_off');
  if (rateLimited(`goog:${req.ip}`, 30)) return res.redirect('/compte?error=google');
  const state = newToken();
  res.cookie(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60 * 1000,
  });
  return res.redirect(googleAuthUrl(googleRedirectUri(req), state));
});

// Retour de Google : vérifie le `state`, échange le code, lie/crée le compte (par email),
// ouvre une session. Le rattachement par email vérifié est sûr (Google a prouvé la propriété).
router.get('/google/callback', async (req, res) => {
  res.clearCookie(GOOGLE_STATE_COOKIE, {path: '/'});
  try {
    if (!googleConfigured()) return res.redirect('/compte?error=google_off');
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const cookieState = parseCookies(req.headers.cookie)[GOOGLE_STATE_COOKIE];
    if (!code || !state || !cookieState || state !== cookieState) return res.redirect('/compte?error=google');

    const id = await exchangeCodeForIdentity(code, googleRedirectUri(req));
    if (!id.emailVerified) return res.redirect('/compte?error=google_unverified');

    let user = await getUserByEmail(id.email);
    if (!user) {
      // Compte créé via Google : mot de passe aléatoire INUTILISABLE (l'utilisateur ne le
      // connaît pas) ; email réputé vérifié (Google l'a vérifié). Il pourra définir un mot de
      // passe plus tard via « mot de passe oublié » s'il veut aussi la connexion email.
      user = await createUser(id.email, await hashPassword(newToken()), undefined, undefined, null, null);
      await markUserVerified(user.id);
      const role: 'user' | 'admin' = adminEmails().includes(id.email) ? 'admin' : 'user';
      if (role !== user.role) await setUserRole(user.id, role);
    } else if (!user.emailVerified) {
      await markUserVerified(user.id); // Google prouve la propriété de l'email -> on régularise
    }
    const token = newToken();
    await createSession(user.id, token, sessionExpiry());
    res.cookie(SESSION_COOKIE, token, cookieOptions());
    return res.redirect('/');
  } catch (e) {
    console.error('[google] callback échoué :', (e as Error).message);
    return res.redirect('/compte?error=google');
  }
});

const verifyBody = z.object({token: z.string().min(1).max(256)});
// Public : le lien de l'email peut être ouvert sur un appareil non connecté.
router.post('/verify-email', async (req, res) => {
  const parsed = verifyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Jeton manquant.'});
  const {status, userId} = await verifyEmailByToken(parsed.data.token);
  if (status === 'ok') {
    // Pousse la maj à TOUS les appareils connectés de l'utilisateur -> le bandeau
    // « confirme ton email » disparaît partout en temps réel (pas que sur cet onglet).
    if (userId) notifyUser(userId, {type: 'account'});
    return res.json({ok: true});
  }
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
  // Propage aux autres appareils (logo + programmes mis en avant se mettent à jour).
  notifyUser(auth.id, {type: 'account'});
  return res.json({ok: true, gender});
});

// Met à jour le matériel accessible (salle + équipements) — pour mettre en avant les
// exercices faisables. Liste de jetons validée ; toujours un tableau (même vide).
router.post('/equipment', async (req, res) => {
  const auth = await getUserFromRequest(req);
  if (!auth) return res.status(401).json({error: 'Non connecté.'});
  const equipment = sanitizeEquipment(req.body?.equipment) ?? [];
  await setEquipment(auth.id, equipment);
  // Propage aux autres appareils : la mise en avant des exercices se met à jour partout.
  notifyUser(auth.id, {type: 'account'});
  return res.json({ok: true, equipment});
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
