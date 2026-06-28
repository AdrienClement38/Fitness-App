/**
 * Bandeau d'annonce — règle d'affichage (logique pure & testable). Le bandeau reste affiché
 * tant que l'utilisateur ne l'a pas FERMÉ (croix) : fermer mémorise sa version, synchronisée
 * par compte (cf. announcementDismiss) -> ne réapparaît plus sur aucun de ses appareils.
 * L'admin (re)publie -> nouvelle version côté serveur -> le bandeau réapparaît pour tous.
 * Repli : si le serveur n'envoie pas (encore) de version (fenêtre de déploiement), on dérive
 * une version du contenu — le bandeau réapparaît alors quand le message change.
 */
export type BannerAnnouncement = {message: string; tone: 'info' | 'warn'; version?: string};

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Version effective d'une annonce : celle du serveur, sinon repli sur un hash du contenu. */
export function announcementVersion(a: BannerAnnouncement): string {
  return a.version || hash(`${a.tone}:${a.message}`);
}

/**
 * Le bandeau s'affiche-t-il ?
 *  - warn (orange) : TOUJOURS (c'est une alerte, non fermable).
 *  - info (bleue) : tant que sa version n'a pas été fermée (croix) par l'utilisateur.
 */
export function shouldShowAnnouncement(a: BannerAnnouncement | null, dismissedVersion: string): boolean {
  if (a == null) return false;
  if (a.tone === 'warn') return true;
  return announcementVersion(a) !== dismissedVersion;
}
