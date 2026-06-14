/**
 * Envoi d'emails (confirmation d'adresse). SMTP via nodemailer ; identifiants en
 * variables d'env (SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS, ex. Gmail + un
 * mot de passe d'application). SMTP_FROM optionnel (sinon l'adresse SMTP_USER).
 *
 * REPLI DEV : si le SMTP n'est pas configuré, le lien est écrit dans les logs au
 * lieu d'être envoyé — on peut tester tout le flux sans identifiants.
 */
import nodemailer, {type Transporter} from 'nodemailer';

let transporter: Transporter | null = null;
let resolved = false;

function getTransporter(): Transporter | null {
  if (resolved) return transporter;
  resolved = true;
  const {SMTP_HOST, SMTP_USER, SMTP_PASS} = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null; // non configuré -> repli dev
  const port = Number(process.env.SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465, // 465 = TLS implicite ; 587 = STARTTLS
    auth: {user: SMTP_USER, pass: SMTP_PASS},
  });
  return transporter;
}

const from = () => process.env.SMTP_FROM || `AC-KINETIK <${process.env.SMTP_USER ?? 'no-reply@ac-kinetik'}>`;

/** Email de confirmation d'adresse. Retourne true si réellement envoyé (false = repli dev). */
export async function sendVerificationEmail(to: string, link: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.log(`[email] SMTP non configuré — lien de confirmation pour ${to} :\n  ${link}`);
    return false;
  }
  await t.sendMail({
    from: from(),
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
