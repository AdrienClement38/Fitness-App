/** Accès données « comptes » : utilisateurs et sessions serveur. */
import {randomUUID} from 'node:crypto';
import {and, count, desc, eq, inArray, isNotNull, isNull, lt, ne, sql} from 'drizzle-orm';
import {db, schema} from '../db/client';

const {users, sessions, syncItems} = schema;

export async function getUserByEmail(email: string) {
  const [u] = await db.select().from(users).where(eq(users.email, email));
  return u ?? null;
}

export async function createUser(email: string, passwordHash: string, verifyToken?: string, verifyExpires?: Date) {
  const id = `u-${randomUUID()}`;
  const [u] = await db
    .insert(users)
    .values({id, email, passwordHash, verifyToken: verifyToken ?? null, verifyExpires: verifyExpires ?? null})
    .returning();
  return u;
}

export async function createSession(userId: string, token: string, expiresAt: Date) {
  await db.insert(sessions).values({token, userId, expiresAt});
}

/** Session + email de l'utilisateur, en une requête (pour la résolution du cookie). */
export async function getSessionWithUser(token: string) {
  const [row] = await db
    .select({userId: sessions.userId, expiresAt: sessions.expiresAt, email: users.email, role: users.role, emailVerified: users.emailVerified})
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.token, token));
  return row ?? null;
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function getUserById(id: string) {
  const [u] = await db.select().from(users).where(eq(users.id, id));
  return u ?? null;
}

export async function updatePassword(id: string, passwordHash: string) {
  await db.update(users).set({passwordHash}).where(eq(users.id, id));
}

/** Révoque toutes les sessions d'un utilisateur (ex. après changement de mot de passe). */
export async function deleteUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Suppression du compte (RGPD). Les sessions (et données liées) tombent en cascade. */
export async function deleteUser(id: string) {
  await db.delete(users).where(eq(users.id, id));
}

/** Purge les sessions expirées (croissance bornée de la table). Best-effort. */
export async function deleteExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

/* ---- Confirmation d'email -------------------------------------------- */

/** Valide un email à partir de son jeton (single-use). */
export async function verifyEmailByToken(token: string): Promise<'ok' | 'expired' | 'invalid'> {
  const [u] = await db.select().from(users).where(eq(users.verifyToken, token));
  if (!u) return 'invalid'; // jeton inconnu ou déjà consommé
  if (!u.verifyExpires || u.verifyExpires.getTime() < Date.now()) return 'expired';
  await db.update(users).set({emailVerified: true, verifyToken: null, verifyExpires: null}).where(eq(users.id, u.id));
  return 'ok';
}

/** (Re)génère le jeton de confirmation d'un utilisateur (renvoi d'email). */
export async function setVerifyToken(id: string, token: string, expires: Date) {
  await db.update(users).set({verifyToken: token, verifyExpires: expires}).where(eq(users.id, id));
}

/**
 * Comptes existant AVANT la confirmation d'email (donc sans jeton) : considérés
 * vérifiés (grandfather). Idempotent : un compte du nouveau flux a toujours un
 * verify_token, donc n'est jamais touché. Retourne le nombre régularisé.
 */
export async function grandfatherExistingUsers(): Promise<number> {
  const res = await db
    .update(users)
    .set({emailVerified: true})
    .where(and(eq(users.emailVerified, false), isNull(users.verifyToken)))
    .returning({id: users.id});
  return res.length;
}

/**
 * Purge les comptes jamais confirmés créés avant `date` (anti-bots). On ne supprime
 * QUE les comptes issus du flux de confirmation (verify_token non nul) -> jamais les
 * comptes historiques régularisés. Retourne le nombre supprimé.
 */
export async function deleteUnverifiedBefore(date: Date): Promise<number> {
  const res = await db
    .delete(users)
    .where(and(eq(users.emailVerified, false), isNotNull(users.verifyToken), lt(users.createdAt, date)))
    .returning({id: users.id});
  return res.length;
}

/* ---- Administration (rôles + gestion des comptes) --------------------- */

/** Promeut en admin les comptes dont l'email est dans ADMIN_EMAILS (au démarrage). Retourne les emails promus. */
export async function bootstrapAdmins(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];
  const res = await db
    .update(users)
    .set({role: 'admin'})
    .where(and(inArray(users.email, emails), ne(users.role, 'admin')))
    .returning({email: users.email});
  return res.map((r) => r.email);
}

/** Change le rôle d'un utilisateur. */
export async function setUserRole(id: string, role: 'user' | 'admin') {
  await db.update(users).set({role}).where(eq(users.id, id));
}

/**
 * Liste des comptes pour l'admin : infos de COMPTE uniquement (jamais le contenu
 * privé synchronisé) + compteurs de séances/programmes synchronisés (engagement).
 */
export async function listUsersWithCounts() {
  const us = await db
    .select({id: users.id, email: users.email, role: users.role, emailVerified: users.emailVerified, createdAt: users.createdAt})
    .from(users)
    .orderBy(users.createdAt);
  const counts = await db
    .select({userId: syncItems.userId, kind: syncItems.kind, n: count()})
    .from(syncItems)
    .where(eq(syncItems.deleted, false))
    .groupBy(syncItems.userId, syncItems.kind);
  const byUser = new Map<string, Record<string, number>>();
  for (const c of counts) {
    const m = byUser.get(c.userId) ?? {};
    m[c.kind] = Number(c.n);
    byUser.set(c.userId, m);
  }
  return us.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt.toISOString(),
    workoutLogs: byUser.get(u.id)?.['workout-log'] ?? 0,
    myPrograms: byUser.get(u.id)?.['my-program'] ?? 0,
  }));
}

/**
 * Statistiques d'usage pour le tableau de bord admin : agrégats de comptes et de
 * contenu synchronisé (jamais de données privées), via des `count(*) filter` en une
 * passe. Les comptes sont castés en int4 (sinon bigint -> string).
 */
export async function getAdminStats() {
  const d7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [u] = await db
    .select({
      total: sql<number>`count(*)::int`,
      verified: sql<number>`(count(*) filter (where ${users.emailVerified}))::int`,
      admins: sql<number>`(count(*) filter (where ${users.role} = 'admin'))::int`,
      last7: sql<number>`(count(*) filter (where ${users.createdAt} >= ${d7}))::int`,
      last30: sql<number>`(count(*) filter (where ${users.createdAt} >= ${d30}))::int`,
    })
    .from(users);

  const [c] = await db
    .select({
      workoutLogs: sql<number>`(count(*) filter (where ${syncItems.kind} = 'workout-log'))::int`,
      myPrograms: sql<number>`(count(*) filter (where ${syncItems.kind} = 'my-program'))::int`,
      favorites: sql<number>`(count(*) filter (where ${syncItems.kind} = 'favorite'))::int`,
    })
    .from(syncItems)
    .where(eq(syncItems.deleted, false));

  const recent = await db
    .select({email: users.email, createdAt: users.createdAt, emailVerified: users.emailVerified, role: users.role})
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(5);

  return {
    users: {
      total: u?.total ?? 0,
      verified: u?.verified ?? 0,
      unverified: (u?.total ?? 0) - (u?.verified ?? 0),
      admins: u?.admins ?? 0,
      last7: u?.last7 ?? 0,
      last30: u?.last30 ?? 0,
    },
    content: {
      workoutLogs: c?.workoutLogs ?? 0,
      myPrograms: c?.myPrograms ?? 0,
      favorites: c?.favorites ?? 0,
    },
    recentSignups: recent.map((r) => ({
      email: r.email,
      createdAt: r.createdAt.toISOString(),
      emailVerified: r.emailVerified,
      role: r.role,
    })),
  };
}
