/**
 * Format unique des durées courtes (repos prescrit, badges, compte à rebours) en
 * M:SS — afficher PARTOUT pareil évite la conversion mentale (le « : » signifie
 * « temps », pas besoin de suffixe « s »). Choix « mm:ss partout » plutôt que
 * « secondes partout » : le minuteur se lit comme une horloge qui descend vers
 * 0:00, et un repos long (2-3 min) se lit « 3:00 » bien mieux que « 180 s ».
 */
export const mmss = (s: number) =>
  `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

/** Durée longue lisible : « 45 min » sous l'heure, sinon « 1h05 » / « 2h ». */
export function humanMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** Plage de repos en M:SS (ex. « 1:00–1:30 »), valeurs nulles gérées. */
export function mmssRange(min: number | null, max: number | null) {
  if (min == null && max == null) return '—';
  if (min == null) return mmss(max as number);
  if (max == null || min === max) return mmss(min);
  return `${mmss(min)}–${mmss(max)}`;
}
