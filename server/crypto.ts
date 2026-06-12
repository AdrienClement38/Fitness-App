/**
 * Chiffrement au repos des blobs utilisateur (table `sync_items`).
 *
 * Pourquoi : le mot de passe est déjà haché (scrypt) et tout transite en TLS
 * (HTTPS + wss, et désormais la connexion Postgres elle-même). Restait la donnée
 * « au repos » dans la base : séances, programmes persos, favoris. On la chiffre
 * en AES-256-GCM (chiffrement authentifié) avec une clé serveur, de sorte qu'une
 * fuite de la base seule (dump, sauvegarde, accès SQL) ne livre pas le contenu.
 *
 * Clé : `DATA_ENCRYPTION_KEY` (env). Acceptée en base64 (32 o), hex (64 car.) ou
 * comme passphrase (dérivée en 32 o via scrypt). Si la variable est absente
 * (dev/PGlite local), on stocke en clair — transparent, sans rien casser.
 *
 * Robustesse : un blob chiffré illisible (clé changée/perdue, corruption) est
 * traité comme vide à la lecture, jamais une exception — le client, source de
 * vérité (localStorage), repoussera sa version au prochain sync. La donnée
 * « cicatrise » donc d'elle-même, sans risque de planter l'app.
 */
import {createCipheriv, createDecipheriv, randomBytes, scryptSync} from 'node:crypto';

function loadKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // 1) base64 -> exactement 32 octets ?
  const b64 = Buffer.from(trimmed, 'base64');
  if (b64.length === 32) return b64;
  // 2) hex 64 caracteres -> 32 octets ?
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, 'hex');
  // 3) sinon : passphrase libre -> clé 32 o dérivée (scrypt, sel applicatif fixe).
  return scryptSync(trimmed, 'salle-de-sport/data-key/v1', 32);
}

const KEY = loadKey(process.env.DATA_ENCRYPTION_KEY);

/** Vrai si une clé est configurée (donc chiffrement actif). */
export const dataEncryptionEnabled = KEY !== null;

interface Envelope {
  _enc: 'a256gcm';
  iv: string; // base64 (12 o)
  tag: string; // base64 (16 o)
  ct: string; // base64
}

function isEnvelope(v: unknown): v is Envelope {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as {_enc?: unknown})._enc === 'a256gcm' &&
    typeof (v as Envelope).iv === 'string' &&
    typeof (v as Envelope).tag === 'string' &&
    typeof (v as Envelope).ct === 'string'
  );
}

/**
 * Chiffre une valeur JSON pour le stockage. Sans clé configurée → renvoie la
 * valeur telle quelle (clair). `null`/`undefined` → `null` (rien à chiffrer).
 */
export function encryptData(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (!KEY) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', KEY, iv);
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    _enc: 'a256gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ct: ct.toString('base64'),
  } satisfies Envelope;
}

/**
 * Déchiffre une valeur lue en base. Tolérant : une donnée en clair (pas
 * d'enveloppe) est renvoyée telle quelle ; une enveloppe illisible (clé absente
 * ou mauvaise, corruption) renvoie `null` plutôt qu'une exception.
 */
export function decryptData(stored: unknown): unknown {
  if (stored === null || stored === undefined) return null;
  if (!isEnvelope(stored)) return stored; // clair (écrit sans clé, ou dev local)
  if (!KEY) return null; // blob chiffré mais aucune clé pour le lire
  try {
    const iv = Buffer.from(stored.iv, 'base64');
    const tag = Buffer.from(stored.tag, 'base64');
    const ct = Buffer.from(stored.ct, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(ct), decipher.final()]);
    return JSON.parse(out.toString('utf8'));
  } catch {
    return null; // clé changée / corruption : le client repoussera sa version
  }
}
