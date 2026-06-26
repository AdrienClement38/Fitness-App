/**
 * Calendrier mensuel (vue locale, lundi -> dimanche). Regroupe les séances par jour
 * calendaire LOCAL (pas UTC : « le jour où je suis allé à la salle » = mon jour à moi).
 * Logique pure et testable ; l'affichage (points verts, popup) vit dans WorkoutCalendar.
 */
import type {WorkoutLog} from './workoutLogs';

const pad = (n: number) => String(n).padStart(2, '0');

/** Clé jour LOCALE « YYYY-MM-DD » depuis un ISO (regroupement par jour calendaire local). */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Clé jour depuis (année, mois 0–11, jour). */
export function keyOf(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** Clé du jour courant (local). */
export function todayKey(): string {
  const d = new Date();
  return keyOf(d.getFullYear(), d.getMonth(), d.getDate());
}

export interface DayCell {
  year: number;
  month: number; // 0–11
  day: number;
  inMonth: boolean; // appartient au mois affiché (vs débordement mois adjacent)
  key: string;
}

/** Mois précédent / suivant (delta en mois), sans muter l'entrée. */
export function addMonths(v: {year: number; month: number}, delta: number): {year: number; month: number} {
  const d = new Date(v.year, v.month + delta, 1);
  return {year: d.getFullYear(), month: d.getMonth()};
}

/**
 * Grille du mois en semaines (lundi -> dimanche), avec débordement sur les mois
 * adjacents pour remplir la 1re et la dernière semaine. 4 à 6 semaines selon le mois.
 */
export function monthGrid(year: number, month: number): DayCell[][] {
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0
  const endOfMonth = new Date(year, month + 1, 0); // dernier jour du mois
  const cursor = new Date(year, month, 1 - startOffset); // lundi de la 1re semaine
  const weeks: DayCell[][] = [];
  for (let w = 0; w < 6; w += 1) {
    const week: DayCell[] = [];
    for (let i = 0; i < 7; i += 1) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      const d = cursor.getDate();
      week.push({year: y, month: m, day: d, inMonth: m === month && y === year, key: keyOf(y, m, d)});
      cursor.setDate(d + 1);
    }
    weeks.push(week);
    if (cursor > endOfMonth) break; // le lundi suivant dépasse le mois -> fini
  }
  return weeks;
}

/** Regroupe l'historique par jour local. Map<cléJour, séances> (ordre préservé). */
export function groupByDay(history: WorkoutLog[]): Map<string, WorkoutLog[]> {
  const map = new Map<string, WorkoutLog[]>();
  for (const log of history) {
    const iso = log.finishedIso ?? log.startedIso;
    if (!iso) continue;
    const k = dayKey(iso);
    const arr = map.get(k);
    if (arr) arr.push(log);
    else map.set(k, [log]);
  }
  return map;
}

/** Libellé du mois affiché, ex. « Juin 2026 ». */
export function monthLabel(year: number, month: number): string {
  const s = new Date(year, month, 1).toLocaleDateString('fr-FR', {month: 'long', year: 'numeric'});
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Libellé long d'une clé jour, ex. « Mercredi 24 juin 2026 ». */
export function labelFromKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
  return s.charAt(0).toUpperCase() + s.slice(1);
}
