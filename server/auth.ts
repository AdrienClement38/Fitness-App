/**
 * Auth maison, zéro dépendance : hash de mot de passe via `crypto.scrypt`
 * (KDF mémoire-dur, recommandé OWASP), sessions par cookie httpOnly.
 */
import {randomBytes, scrypt, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import type {Request} from 'express';
import {getSessionWithUser} from './repositories/userRepository';

const scryptAsync = promisify(scrypt);

/** Hash d'un mot de passe : `saltHex:hashHex` (sel aléatoire par mot de passe). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

/** Vérification à temps constant (timingSafeEqual) contre le hash stocké. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const derived = (await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length)) as Buffer;
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export const SESSION_COOKIE = 'sds_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

export const newToken = () => randomBytes(32).toString('base64url'); // jeton 256 bits
export const sessionExpiry = () => new Date(Date.now() + SESSION_TTL_MS);

/** Options du cookie de session (Secure seulement en prod, sur HTTPS). */
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

/** Emails déclarés admin (variable d'env ADMIN_EMAILS, séparés par des virgules). */
export const adminEmails = (): string[] =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** Parse l'en-tête Cookie (pas de dépendance cookie-parser). */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export type Gender = 'male' | 'female';

export interface AuthUser {
  id: string;
  email: string;
  role: string; // 'user' | 'admin'
  emailVerified: boolean;
  gender: Gender | null; // null = préfère ne pas dire / non renseigné
  equipment: string[] | null; // matériel accessible ; null = non renseigné (cf. equipment.ts)
}

/** Utilisateur déduit d'un en-tête Cookie (HTTP ou upgrade WebSocket), ou null. */
export async function getAuthUserByCookie(cookieHeader: string | undefined): Promise<AuthUser | null> {
  const token = parseCookies(cookieHeader)[SESSION_COOKIE];
  if (!token) return null;
  const sess = await getSessionWithUser(token);
  if (!sess || sess.expiresAt.getTime() < Date.now()) return null;
  return {
    id: sess.userId,
    email: sess.email,
    role: sess.role,
    emailVerified: sess.emailVerified,
    gender: (sess.gender as Gender | null) ?? null,
    equipment: (sess.equipment as string[] | null) ?? null,
  };
}

/** Utilisateur courant déduit du cookie de session, ou null. */
export async function getUserFromRequest(req: Request): Promise<AuthUser | null> {
  return getAuthUserByCookie(req.headers.cookie);
}
