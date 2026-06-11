/** Accès données « comptes » : utilisateurs et sessions serveur. */
import {randomUUID} from 'node:crypto';
import {eq} from 'drizzle-orm';
import {db, schema} from '../db/client';

const {users, sessions} = schema;

export async function getUserByEmail(email: string) {
  const [u] = await db.select().from(users).where(eq(users.email, email));
  return u ?? null;
}

export async function createUser(email: string, passwordHash: string) {
  const id = `u-${randomUUID()}`;
  const [u] = await db.insert(users).values({id, email, passwordHash}).returning();
  return u;
}

export async function createSession(userId: string, token: string, expiresAt: Date) {
  await db.insert(sessions).values({token, userId, expiresAt});
}

/** Session + email de l'utilisateur, en une requête (pour la résolution du cookie). */
export async function getSessionWithUser(token: string) {
  const [row] = await db
    .select({userId: sessions.userId, expiresAt: sessions.expiresAt, email: users.email})
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.token, token));
  return row ?? null;
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}
