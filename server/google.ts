/**
 * « Sign in with Google » (OAuth 2.0 / OpenID Connect), zéro dépendance.
 * Flux Authorization Code côté serveur. Activé seulement si GOOGLE_CLIENT_ID +
 * GOOGLE_CLIENT_SECRET sont présents dans le .env serveur ; sinon désactivé.
 */
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export const googleConfigured = (): boolean => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/** URL de consentement Google (vers laquelle on redirige le navigateur). */
export function googleAuthUrl(redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `${AUTH_ENDPOINT}?${p.toString()}`;
}

export interface GoogleIdentity {
  sub: string; // identifiant Google stable
  email: string;
  emailVerified: boolean;
  name: string | null;
}

/**
 * Échange le code d'autorisation contre l'identité Google. L'id_token est reçu
 * DIRECTEMENT du endpoint Google via HTTPS (authentifié par notre client_secret) :
 * sa provenance est garantie par TLS, on peut donc lire son payload sans re-vérifier
 * la signature (approche serveur documentée par Google).
 */
export async function exchangeCodeForIdentity(code: string, redirectUri: string): Promise<GoogleIdentity> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const r = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body,
  });
  if (!r.ok) throw new Error(`échange de code Google : HTTP ${r.status}`);
  const tok = (await r.json()) as {id_token?: string};
  if (!tok.id_token) throw new Error('id_token manquant');
  const payloadPart = tok.id_token.split('.')[1];
  const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as {
    sub: string;
    email?: string;
    email_verified?: boolean | string;
    name?: string;
  };
  if (!payload.email) throw new Error('email absent du jeton Google');
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    name: payload.name ?? null,
  };
}
