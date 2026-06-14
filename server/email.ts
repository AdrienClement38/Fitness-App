/**
 * Envoi d'emails (confirmation d'adresse, test SMTP) via nodemailer.
 *
 * Configuration SMTP, par ordre de priorité :
 *   1. BASE DE DONNÉES (table `app_settings`, clé `smtp`) — éditable depuis la
 *      page admin, sans redéploiement. Le mot de passe y est CHIFFRÉ au repos
 *      (enveloppe AES-256-GCM, cf. crypto.ts) et n'est jamais renvoyé au client.
 *   2. VARIABLES D'ENV (repli) : SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS /
 *      SMTP_FROM (ex. Gmail + mot de passe d'application).
 *   3. REPLI DEV : si rien n'est configuré, le lien est écrit dans les logs au
 *      lieu d'être envoyé — on peut tester tout le flux sans identifiants.
 *
 * Le transporteur est reconstruit à chaque envoi (envois rares : inscription,
 * test) : la config modifiée en admin est prise en compte sans redémarrage et
 * sans cache à invalider.
 */
import nodemailer, {type Transporter} from 'nodemailer';
import {decryptData, encryptData} from './crypto';
import {getSetting, setSetting} from './repositories/settingsRepository';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from?: string;
}

const SMTP_KEY = 'smtp';
// Données additionnelles authentifiées : lie le mot de passe chiffré à sa clé de
// stockage (un blob ne peut pas être rejoué ailleurs).
const PASS_AAD = 'app-settings/smtp-pass';

/** Forme stockée en base : `pass` est une enveloppe chiffrée (ou clair si pas de clé). */
interface StoredSmtp {
  host?: string;
  port?: number;
  user?: string;
  from?: string;
  pass?: unknown; // enveloppe AES-GCM (objet) ou chaîne (dev sans clé)
}

/** Config SMTP en base (mot de passe déchiffré). null si incomplète. */
async function smtpFromDb(): Promise<SmtpConfig | null> {
  const s = await getSetting<StoredSmtp>(SMTP_KEY);
  if (!s) return null;
  const pass = s.pass == null ? '' : String(decryptData(s.pass, PASS_AAD) ?? '');
  if (!s.host || !s.user || !pass) return null;
  return {host: s.host, port: Number(s.port) || 587, user: s.user, pass, from: s.from || undefined};
}

/** Config SMTP depuis les variables d'env (repli). null si incomplète. */
function smtpFromEnv(): SmtpConfig | null {
  const {SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM} = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return {
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: SMTP_FROM || undefined,
  };
}

/** Config SMTP effective : base d'abord, puis variables d'env. null si rien. */
export async function resolveSmtp(): Promise<{config: SmtpConfig; source: 'db' | 'env'} | null> {
  const fromDb = await smtpFromDb();
  if (fromDb) return {config: fromDb, source: 'db'};
  const fromEnv = smtpFromEnv();
  if (fromEnv) return {config: fromEnv, source: 'env'};
  return null;
}

function transportFor(c: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.port === 465, // 465 = TLS implicite ; 587 = STARTTLS
    auth: {user: c.user, pass: c.pass},
    tls: {rejectUnauthorized: false}, // tolère un certif auto-signé (certains relais)
    connectionTimeout: 10000,
  });
}

const fromAddr = (c: SmtpConfig) => c.from?.trim() || `AC-KINETIK <${c.user}>`;

/* ---- Persistance (admin) --------------------------------------------- */

/**
 * Persiste la config SMTP éditée en admin. Le mot de passe est chiffré au repos.
 * `pass` vide => on CONSERVE le mot de passe déjà stocké (l'UI n'a pas à le
 * ressaisir et il n'a jamais à transiter en lecture).
 */
export async function saveSmtpConfig(input: {host: string; port: number; user: string; from?: string; pass?: string}): Promise<void> {
  const existing = (await getSetting<StoredSmtp>(SMTP_KEY)) ?? {};
  const passEnvelope =
    input.pass && input.pass.length > 0 ? encryptData(input.pass, PASS_AAD) : existing.pass ?? null;
  const value: StoredSmtp = {
    host: input.host.trim(),
    port: Number(input.port) || 587,
    user: input.user.trim(),
    from: input.from?.trim() || undefined,
    pass: passEnvelope,
  };
  await setSetting(SMTP_KEY, value);
}

export interface SmtpStatus {
  host: string;
  port: number;
  user: string;
  from: string;
  hasPass: boolean; // un mot de passe est stocké (jamais sa valeur)
  source: 'db' | 'env' | 'none'; // d'où vient la config réellement utilisée
  envFallback: boolean; // des variables d'env SMTP sont présentes (repli possible)
}

/** Vue admin de la config SMTP : JAMAIS le mot de passe en clair, juste son existence + la provenance effective. */
export async function smtpStatus(): Promise<SmtpStatus> {
  const stored = await getSetting<StoredSmtp>(SMTP_KEY);
  const env = smtpFromEnv();
  const resolved = await resolveSmtp();
  return {
    host: stored?.host ?? '',
    port: Number(stored?.port) || 587,
    user: stored?.user ?? '',
    from: stored?.from ?? '',
    hasPass: stored?.pass != null,
    source: resolved ? resolved.source : 'none',
    envFallback: env !== null,
  };
}

/**
 * Construit la config à TESTER : si l'admin fournit hôte+utilisateur, on teste
 * ces valeurs (mot de passe saisi, sinon celui déjà stocké) ; sinon on teste la
 * config effective (base puis env). null si incomplète (mot de passe manquant).
 */
export async function configForTest(input: {host?: string; port?: number; user?: string; from?: string; pass?: string}): Promise<SmtpConfig | null> {
  if (input.host && input.user) {
    let pass = input.pass ?? '';
    if (!pass) {
      const stored = await getSetting<StoredSmtp>(SMTP_KEY);
      if (stored?.pass != null) pass = String(decryptData(stored.pass, PASS_AAD) ?? '');
    }
    if (!pass) return null;
    return {host: input.host.trim(), port: Number(input.port) || 587, user: input.user.trim(), pass, from: input.from};
  }
  const resolved = await resolveSmtp();
  return resolved ? resolved.config : null;
}

/* ---- Envois ----------------------------------------------------------- */

/** Email de confirmation d'adresse. Retourne true si réellement envoyé (false = repli dev). */
export async function sendVerificationEmail(to: string, link: string): Promise<boolean> {
  const resolved = await resolveSmtp();
  if (!resolved) {
    console.log(`[email] SMTP non configuré — lien de confirmation pour ${to} :\n  ${link}`);
    return false;
  }
  const c = resolved.config;
  await transportFor(c).sendMail({
    from: fromAddr(c),
    to,
    subject: 'Confirme ton adresse — AC-KINETIK',
    text:
      `Bienvenue sur AC-KINETIK !\n\nConfirme ton adresse en ouvrant ce lien :\n${link}\n\n` +
      `Le lien expire dans 24 h. Si tu n'es pas a l'origine de cette inscription, ignore cet email.`,
    html:
      `<p>Bienvenue sur <strong>AC-KINETIK</strong> !</p>` +
      `<p>Confirme ton adresse :</p>` +
      `<p><a href="${link}">Confirmer mon adresse</a></p>` +
      `<p style="color:#64748b;font-size:13px">Ou colle ce lien dans ton navigateur : ${link}<br>` +
      `Il expire dans 24 h. Si tu n'es pas à l'origine de cette inscription, ignore cet email.</p>`,
  });
  return true;
}

/** Envoie un email de test avec une config donnée (sans la persister). Lève en cas d'échec SMTP. */
export async function sendTestEmail(c: SmtpConfig, to: string): Promise<void> {
  await transportFor(c).sendMail({
    from: fromAddr(c),
    to,
    subject: 'Test SMTP — AC-KINETIK',
    text: 'Si tu lis cet email, la configuration SMTP de AC-KINETIK fonctionne.',
    html:
      `<p>Si tu lis cet email, la configuration SMTP de <strong>AC-KINETIK</strong> fonctionne. ✅</p>` +
      `<p style="color:#64748b;font-size:13px">Email de test envoyé depuis la page d'administration.</p>`,
  });
}
