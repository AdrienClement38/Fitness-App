/**
 * Stats dérivées de l'historique des séances (workout-logs). Tout est calculé
 * à la volée côté client : progression par exercice, records, volume hebdo.
 */
import type {WorkoutLog} from './workoutLogs';
import type {MeasureKind} from './api';

/** 1RM estimé (formule d'Epley) : charge max théorique pour 1 répétition. */
export const epley1RM = (weight: number, reps: number): number => weight * (1 + reps / 30);

const logDate = (l: WorkoutLog): string => l.finishedIso ?? l.startedIso ?? '';

/** Clé de semaine (lundi, AAAA-MM-JJ) d'une date ISO. */
function weekKey(iso: string): string {
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export interface ExerciseStat {
  exerciseId: string;
  name: string;
  sessions: number;
  kind: MeasureKind;
  heaviest: {weight: number; reps: number} | null; // load : série la plus lourde
  best1RM: number | null; // load : 1RM estimé
  bestValue: number | null; // bodyweight/duration/cardio : meilleur nombre (reps / s / min)
  lastDateIso: string;
}

/** Agrège les stats par exercice (records + nb de séances), triées par fréquence. */
export function exerciseStats(logs: WorkoutLog[]): ExerciseStat[] {
  const map = new Map<string, ExerciseStat>();
  for (const log of logs) {
    const date = logDate(log);
    for (const ex of log.exercises) {
      const done = ex.sets.filter((s) => s.done);
      if (done.length === 0) continue;
      let st = map.get(ex.exerciseId);
      if (!st) {
        st = {
          exerciseId: ex.exerciseId,
          name: ex.nameFr ?? ex.nameEn,
          sessions: 0,
          kind: ex.kind,
          heaviest: null,
          best1RM: null,
          bestValue: null,
          lastDateIso: date,
        };
        map.set(ex.exerciseId, st);
      }
      st.sessions += 1;
      if (date > st.lastDateIso) st.lastDateIso = date;
      for (const s of done) {
        if (ex.kind === 'load') {
          if (s.weight != null && s.reps != null) {
            const e = epley1RM(s.weight, s.reps);
            if (st.best1RM == null || e > st.best1RM) st.best1RM = Math.round(e * 10) / 10;
            if (st.heaviest == null || s.weight > st.heaviest.weight) st.heaviest = {weight: s.weight, reps: s.reps};
          }
        } else if (s.reps != null && (st.bestValue == null || s.reps > st.bestValue)) {
          st.bestValue = s.reps;
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => b.sessions - a.sessions);
}

export interface ProgressPoint {
  dateIso: string;
  value: number;
}

/** Progression d'un exercice : meilleure série par séance (1RM estimé, ou durée si chrono), du plus ancien au plus récent. */
export function progression(logs: WorkoutLog[], exerciseId: string): {points: ProgressPoint[]; kind: MeasureKind} {
  const points: ProgressPoint[] = [];
  let kind: MeasureKind = 'load';
  for (const log of logs) {
    const ex = log.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const done = ex.sets.filter((s) => s.done);
    if (done.length === 0) continue;
    kind = ex.kind;
    let best: number | null = null;
    for (const s of done) {
      if (ex.kind === 'load') {
        if (s.weight != null && s.reps != null) best = Math.max(best ?? 0, epley1RM(s.weight, s.reps));
      } else if (s.reps != null) {
        best = Math.max(best ?? 0, s.reps);
      }
    }
    if (best != null) points.push({dateIso: logDate(log), value: Math.round(best * 10) / 10});
  }
  points.reverse(); // du plus ancien au plus récent
  return {points, kind};
}

export interface WeekVolume {
  weekStartIso: string;
  volume: number;
}

/** Volume (somme poids × reps des séries faites) agrégé par semaine, du plus ancien au plus récent. */
export function weeklyVolume(logs: WorkoutLog[]): WeekVolume[] {
  const map = new Map<string, number>();
  for (const log of logs) {
    const wk = weekKey(logDate(log));
    let v = 0;
    for (const ex of log.exercises) {
      for (const s of ex.sets) {
        if (s.done && s.weight != null && s.reps != null) v += s.weight * s.reps;
      }
    }
    map.set(wk, (map.get(wk) || 0) + v);
  }
  return [...map.entries()]
    .map(([weekStartIso, volume]) => ({weekStartIso, volume: Math.round(volume)}))
    .sort((a, b) => (a.weekStartIso < b.weekStartIso ? -1 : 1));
}

/** Durée de la séance en minutes (null si non terminée ou incohérente). */
export function durationMinutes(log: WorkoutLog): number | null {
  if (!log.finishedIso || !log.startedIso) return null;
  const ms = new Date(log.finishedIso).getTime() - new Date(log.startedIso).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.round(ms / 60000);
}

/** Repos moyen réellement pris entre les séries (secondes), null si jamais mesuré. */
export function avgRestSeconds(log: WorkoutLog): number | null {
  const vals: number[] = [];
  for (const ex of log.exercises) {
    for (const s of ex.sets) {
      if (s.done && s.restTakenSeconds != null) vals.push(s.restTakenSeconds);
    }
  }
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b) / vals.length);
}

export function summary(logs: WorkoutLog[]): {sessions: number; thisWeek: number; totalVolume: number} {
  let totalVolume = 0;
  for (const log of logs) {
    for (const ex of log.exercises) {
      for (const s of ex.sets) {
        if (s.done && s.weight != null && s.reps != null) totalVolume += s.weight * s.reps;
      }
    }
  }
  const nowWeek = weekKey(new Date().toISOString());
  const thisWeek = logs.filter((l) => weekKey(logDate(l)) === nowWeek).length;
  return {sessions: logs.length, thisWeek, totalVolume: Math.round(totalVolume)};
}

/* ---- Records persistants (survivent à la purge des vieilles séances) ------ */

/**
 * Résumé compact d'un record all-time pour un exercice. Stocké à part de
 * l'historique (cf. records.ts) pour SURVIVRE à la purge des séances > 3 mois.
 */
export interface ExerciseRecord {
  exerciseId: string;
  name: string;
  kind: MeasureKind;
  heaviest: {weight: number; reps: number} | null;
  best1RM: number | null;
  bestValue: number | null;
  lastDateIso: string;
  updatedAt: string; // pour la sync (last-write-wins, mais la fusion garde le meilleur)
}

const maxNullable = (a: number | null, b: number | null): number | null => (a == null ? b : b == null ? a : Math.max(a, b));
function betterHeaviest(
  a: {weight: number; reps: number} | null,
  b: {weight: number; reps: number} | null,
): {weight: number; reps: number} | null {
  if (!a) return b;
  if (!b) return a;
  return b.weight > a.weight ? b : a;
}

/**
 * Replie les meilleures perfs de `logs` dans une COPIE de `base` (pur, immuable).
 * Monotone : un record ne baisse jamais. `at` horodate les exercices touchés.
 */
export function foldRecords(base: Record<string, ExerciseRecord>, logs: WorkoutLog[], at: string): Record<string, ExerciseRecord> {
  const out: Record<string, ExerciseRecord> = {};
  for (const k of Object.keys(base)) out[k] = {...base[k], heaviest: base[k].heaviest ? {...base[k].heaviest} : null};
  for (const log of logs) {
    const date = logDate(log);
    for (const ex of log.exercises) {
      const done = ex.sets.filter((s) => s.done);
      if (done.length === 0) continue;
      let r = out[ex.exerciseId];
      if (!r) {
        r = {exerciseId: ex.exerciseId, name: ex.nameFr ?? ex.nameEn, kind: ex.kind, heaviest: null, best1RM: null, bestValue: null, lastDateIso: date, updatedAt: at};
        out[ex.exerciseId] = r;
      }
      if (date > r.lastDateIso) r.lastDateIso = date;
      for (const s of done) {
        if (ex.kind === 'load') {
          if (s.weight != null && s.reps != null) {
            const e = Math.round(epley1RM(s.weight, s.reps) * 10) / 10;
            if (r.best1RM == null || e > r.best1RM) r.best1RM = e;
            if (r.heaviest == null || s.weight > r.heaviest.weight) r.heaviest = {weight: s.weight, reps: s.reps};
          }
        } else if (s.reps != null && (r.bestValue == null || s.reps > r.bestValue)) {
          r.bestValue = s.reps;
        }
      }
      r.updatedAt = at;
    }
  }
  return out;
}

/** Fusionne deux records du même exercice en gardant le meilleur de chaque champ (commutatif, idempotent). */
export function betterRecord(a: ExerciseRecord | undefined, b: ExerciseRecord): ExerciseRecord {
  if (!a) return b;
  return {
    exerciseId: a.exerciseId,
    name: a.name || b.name,
    kind: a.kind,
    heaviest: betterHeaviest(a.heaviest, b.heaviest),
    best1RM: maxNullable(a.best1RM, b.best1RM),
    bestValue: maxNullable(a.bestValue, b.bestValue),
    lastDateIso: a.lastDateIso > b.lastDateIso ? a.lastDateIso : b.lastDateIso,
    updatedAt: a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt,
  };
}

export interface DisplayRecord {
  exerciseId: string;
  name: string;
  kind: MeasureKind;
  heaviest: {weight: number; reps: number} | null;
  best1RM: number | null;
  bestValue: number | null;
  lastDateIso: string;
  sessions: number;
}

/**
 * Records affichés = meilleur entre l'historique courant et le store persistant
 * (qui retient les séances purgées). Tri : fréquence décroissante puis récence.
 */
export function combineRecords(historyStats: ExerciseStat[], store: ExerciseRecord[]): DisplayRecord[] {
  const map = new Map<string, DisplayRecord>();
  const fold = (r: {
    exerciseId: string;
    name: string;
    kind: MeasureKind;
    heaviest: {weight: number; reps: number} | null;
    best1RM: number | null;
    bestValue: number | null;
    lastDateIso: string;
    sessions?: number;
  }) => {
    const cur = map.get(r.exerciseId);
    if (!cur) {
      map.set(r.exerciseId, {exerciseId: r.exerciseId, name: r.name, kind: r.kind, heaviest: r.heaviest, best1RM: r.best1RM, bestValue: r.bestValue, lastDateIso: r.lastDateIso, sessions: r.sessions ?? 0});
      return;
    }
    map.set(r.exerciseId, {
      exerciseId: cur.exerciseId,
      name: cur.name || r.name,
      kind: cur.kind,
      heaviest: betterHeaviest(cur.heaviest, r.heaviest),
      best1RM: maxNullable(cur.best1RM, r.best1RM),
      bestValue: maxNullable(cur.bestValue, r.bestValue),
      lastDateIso: cur.lastDateIso > r.lastDateIso ? cur.lastDateIso : r.lastDateIso,
      sessions: Math.max(cur.sessions, r.sessions ?? 0),
    });
  };
  for (const s of historyStats) fold(s);
  for (const r of store) fold(r);
  return [...map.values()].sort((a, b) => b.sessions - a.sessions || (a.lastDateIso < b.lastDateIso ? 1 : -1));
}

/**
 * Sépare les séances à garder (récentes) de celles à purger (date < cutoff).
 * Les séances sans date ne sont JAMAIS purgées (filet de sécurité).
 */
export function partitionLogsByAge(logs: WorkoutLog[], cutoffIso: string): {fresh: WorkoutLog[]; expired: WorkoutLog[]} {
  const fresh: WorkoutLog[] = [];
  const expired: WorkoutLog[] = [];
  for (const l of logs) {
    const d = l.finishedIso ?? l.startedIso ?? '';
    if (d !== '' && d < cutoffIso) expired.push(l);
    else fresh.push(l);
  }
  return {fresh, expired};
}
