/**
 * Suivi de séance (L2, log léger). Deux choses en localStorage :
 *  - `active-workout` : la séance en cours (survit à un reload en pleine salle) ;
 *  - `workout-logs`   : l'historique des séances terminées (newest first).
 * Le poids est pré-rempli depuis la dernière fois (progression). Zéro backend.
 */
import {useSyncExternalStore} from 'react';
import type {MeasureKind} from './api';

export interface LoggedSet {
  weight: number | null;
  reps: number | null;
  done: boolean;
}
export interface LoggedExercise {
  exerciseId: string;
  nameFr: string | null;
  nameEn: string;
  targetReps: string; // objectif affiché : reps, secondes ou minutes selon kind
  kind: MeasureKind; // mode de saisie (load / bodyweight / duration / cardio)
  sets: LoggedSet[];
}
export interface WorkoutLog {
  id: string;
  startedIso: string;
  finishedIso: string | null;
  programName: string | null;
  sessionName: string;
  exercises: LoggedExercise[];
}

/** Graine pour démarrer une séance (depuis un programme curated ou perso). */
export interface SessionSeed {
  programName: string | null;
  sessionName: string;
  exercises: {
    exerciseId: string;
    nameFr: string | null;
    nameEn: string;
    kind: MeasureKind;
    sets: number | null;
    repsMin: number | null;
    repsMax: number | null;
  }[];
}

const HKEY = 'workout-logs';
const AKEY = 'active-workout';

function readH(): WorkoutLog[] {
  try {
    return JSON.parse(localStorage.getItem(HKEY) || '[]') as WorkoutLog[];
  } catch {
    return [];
  }
}
function readA(): WorkoutLog | null {
  try {
    return JSON.parse(localStorage.getItem(AKEY) || 'null') as WorkoutLog | null;
  } catch {
    return null;
  }
}

let history = readH();
let active = readA();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function emit() {
  listeners.forEach((l) => l());
}
function saveHistory(next: WorkoutLog[]) {
  history = next;
  try {
    localStorage.setItem(HKEY, JSON.stringify(history));
  } catch {
    /* quota */
  }
  emit();
}
function saveActive(next: WorkoutLog | null) {
  active = next;
  try {
    if (next) localStorage.setItem(AKEY, JSON.stringify(next));
    else localStorage.removeItem(AKEY);
  } catch {
    /* quota */
  }
  emit();
}

const genId = () => `w-${crypto.randomUUID()}`;

function repsLabel(min: number | null, max: number | null): string {
  if (min == null) return '';
  if (max == null || min === max) return String(min);
  return `${min}-${max}`;
}

/** Dernier poids enregistré pour un exercice (pré-remplissage). */
export function lastWeight(exerciseId: string): number | null {
  for (const log of history) {
    const ex = log.exercises.find((e) => e.exerciseId === exerciseId);
    if (ex) {
      for (let i = ex.sets.length - 1; i >= 0; i--) {
        if (ex.sets[i].weight != null) return ex.sets[i].weight;
      }
    }
  }
  return null;
}

/** Démarre une séance pré-remplie et la met en « active ». Retourne son id. */
export function startSession(seed: SessionSeed): string {
  const id = genId();
  const log: WorkoutLog = {
    id,
    startedIso: new Date().toISOString(),
    finishedIso: null,
    programName: seed.programName,
    sessionName: seed.sessionName,
    exercises: seed.exercises.map((e) => {
      const count = e.sets && e.sets > 0 ? e.sets : 1;
      const w = lastWeight(e.exerciseId);
      return {
        exerciseId: e.exerciseId,
        nameFr: e.nameFr,
        nameEn: e.nameEn,
        targetReps: repsLabel(e.repsMin, e.repsMax),
        kind: e.kind,
        sets: Array.from({length: count}, () => ({weight: w, reps: e.repsMin, done: false})),
      };
    }),
  };
  saveActive(log);
  return id;
}

export function updateActive(mut: (draft: WorkoutLog) => void) {
  if (!active) return;
  const draft = structuredClone(active);
  mut(draft);
  saveActive(draft);
}

/** Termine la séance active -> bascule dans l'historique. */
export function finishActive() {
  if (!active) return;
  const finished: WorkoutLog = {...structuredClone(active), finishedIso: new Date().toISOString()};
  saveHistory([finished, ...history]);
  saveActive(null);
}

export function abandonActive() {
  saveActive(null);
}

export function deleteLog(id: string) {
  saveHistory(history.filter((l) => l.id !== id));
}

/** Volume total d'une séance (somme poids × reps des séries faites). */
export function logVolume(log: WorkoutLog): number {
  let v = 0;
  for (const ex of log.exercises) {
    for (const s of ex.sets) {
      if (s.done && s.weight != null && s.reps != null) v += s.weight * s.reps;
    }
  }
  return Math.round(v);
}

export function setsDone(log: WorkoutLog): number {
  return log.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
}

export function useActiveWorkout(): WorkoutLog | null {
  return useSyncExternalStore(subscribe, () => active, () => active);
}
export function useWorkoutHistory(): WorkoutLog[] {
  return useSyncExternalStore(subscribe, () => history, () => history);
}
