/** Routes d'authentification : inscription, connexion, déconnexion, profil courant. */
import {Router} from 'express';
import {z} from 'zod';
import {
  SESSION_COOKIE,
  cookieOptions,
  getUserFromRequest,
  hashPassword,
  newToken,
  parseCookies,
  sessionExpiry,
  verifyPassword,
} from '../auth';
import {
  createSession,
  createUser,
  deleteSession,
  deleteUserSessions,
  getUserByEmail,
  getUserById,
  updatePassword,
} from '../repositories/userRepository';

const router = Router();

const credentials = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(200),
});

// Anti-brute-force basique en mémoire (instance unique sur AlwaysData free tier).
const attempts = new Map<string, {count: number; reset: number}>();
function rateLimited(key: string, max = 10, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
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
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Email invalide ou mot de passe trop court (8 caractères minimum).'});
  const email = parsed.data.email.trim().toLowerCase();
  if (await getUserByEmail(email)) return res.status(409).json({error: 'Un compte existe déjà avec cet email.'});

  const user = await createUser(email, await hashPassword(parsed.data.password));
  const token = newToken();
  await createSession(user.id, token, sessionExpiry());
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  return res.status(201).json({id: user.id, email: user.email});
});

router.post('/login', async (req, res) => {
  if (rateLimited(`login:${req.ip}`)) return res.status(429).json({error: 'Trop de tentatives. Réessaie dans quelques minutes.'});
  const parsed = credentials.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Email ou mot de passe invalide.'});
  const email = parsed.data.email.trim().toLowerCase();

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
  return res.json({id: user.id, email: user.email});
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

const passwordChange = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

router.post('/change-password', async (req, res) => {
  const auth = await getUserFromRequest(req);
  if (!auth) return res.status(401).json({error: 'Non connecté.'});
  const parsed = passwordChange.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({error: 'Nouveau mot de passe trop court (8 caractères minimum).'});

  const user = await getUserById(auth.id);
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return res.status(401).json({error: 'Mot de passe actuel incorrect.'});
  }

  await updatePassword(user.id, await hashPassword(parsed.data.newPassword));
  // Révoque toutes les sessions (déconnecte les autres appareils) puis recrée celle-ci.
  await deleteUserSessions(user.id);
  const token = newToken();
  await createSession(user.id, token, sessionExpiry());
  res.cookie(SESSION_COOKIE, token, cookieOptions());
  return res.json({ok: true});
});

export default router;
