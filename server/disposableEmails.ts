/**
 * Détection des adresses email jetables (anti-inscriptions de bots / usage abusif
 * du quota SMTP). Liste curée des domaines les plus courants — best-effort : de
 * nouveaux services apparaissent sans cesse, on couvre les plus répandus sans
 * dépendance externe (philosophie serveur léger). Combiné au plafond d'envoi et au
 * honeypot, ça suffit largement pour une appli perso.
 */
const DISPOSABLE_DOMAINS = new Set<string>([
  'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'mailinator.com', 'mailinator.net',
  'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.biz',
  'guerrillamailblock.com', 'sharklasers.com', 'grr.la', 'spam4.me',
  '10minutemail.com', '10minutemail.net', '20minutemail.com',
  'temp-mail.org', 'tempmail.com', 'tempmailo.com', 'tempr.email', 'tmpmail.org', 'tmpmail.net', 'mytemp.email',
  'throwawaymail.com', 'getnada.com', 'nada.email', 'mohmal.com',
  'fakeinbox.com', 'fakemail.net', 'fakemailgenerator.com', 'emailfake.com',
  'maildrop.cc', 'mailnesia.com', 'mailcatch.com', 'mailsac.com', 'maileater.com',
  'trashmail.com', 'trashmail.de', 'trash-mail.com', 'dispostable.com', 'discard.email',
  'jetable.org', 'spambox.us', 'mintemail.com', 'emailondeck.com', 'tempinbox.com',
  'getairmail.com', 'inboxbear.com', 'moakt.com', 'harakirimail.com', 'anonbox.net',
  '33mail.com', 'einrot.com', 'luxusmail.org', 'cuvox.de', 'dayrep.com', 'teleworm.us',
]);

/** Vrai si l'email appartient à un domaine jetable connu. */
export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return DISPOSABLE_DOMAINS.has(domain);
}
