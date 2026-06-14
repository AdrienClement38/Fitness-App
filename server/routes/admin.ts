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
  getUserById,
  listUsersWithCounts,
  setUserRole,
  updatePassword,
} from '../repositories/userRepository';
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

export default router;
