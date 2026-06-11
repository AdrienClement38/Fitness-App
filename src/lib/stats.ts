/**
 * Stats dérivées de l'historique des séances (workout-logs). Tout est calculé
 * à la volée côté client : progression par exercice, records, volume hebdo.
 */
import type {WorkoutLog} from './workoutLogs';
import type {MeasureKind} from './api';

/** 1RM estimé (formule d'Epley) : charge max théorique pour 1 répétition. */
export const epley1RM = (weight: number, reps: number): number => weight * (1 + reps / 30);

const logDate = (l: WorkoutLog): string => l.finishedIso ?? l.startedIso;

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
