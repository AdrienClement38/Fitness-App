/**
 * Suivi de séance (L2, log léger). Deux choses en localStorage :
 *  - `active-workout` : la séance en cours (survit à un reload en pleine salle) ;
 *  - `workout-logs`   : l'historique des séances terminées (newest first).
 * Le poids est pré-rempli depuis la dernière fois (progression). Zéro backend.
 */
import {useSyncExternalStore} from 'react';
import type {MeasureKind} from './api';
import {pushItems, registerCollection, type SyncItem} from './sync';

export interface LoggedSet {
  weight: number | null;
  reps: number | null;
  done: boolean;
  doneAtIso?: string | null; // horodatage de fin de série (stats poids · série · temps)
  restTakenSeconds?: number | null; // repos réellement pris APRÈS cette série
}
export interface LoggedExercise {
  exerciseId: string;
  nameFr: string | null;
  nameEn: string;
  targetReps: string; // objectif affiché : reps, secondes ou minutes selon kind
  kind: MeasureKind; // mode de saisie (load / bodyweight / duration / cardio)
  restSeconds: number | null; // repos prescrit entre les séries
  sets: LoggedSet[];
}
/** Repos en cours (le compte à rebours survit à un reload : tout est horodaté). */
export interface RestState {
  ei: number; // index de l'exercice
  si: number; // index de la série qui vient d'être faite
  startedIso: string;
  targetSeconds: number;
}
export interface WorkoutLog {
  id: string;
  startedIso: string | null; // null tant que le chrono n'est pas lancé (« Commencer la séance »)
  finishedIso: string | null;
  programName: string | null;
  sessionName: string;
  exercises: LoggedExercise[];
  rest?: RestState | null; // séance active uniquement
  updatedAt?: string; // pour la sync (last-write-wins)
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
    restSeconds: number | null;
  }[];
}

const HKEY = 'workout-logs';
const AKEY = 'active-workout';
const TKEY = 'workout-tombstones'; // id -> date ISO de suppression (pour la sync)
const KIND = 'workout-log';

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
function readT(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TKEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

let history = readH();
let active = readA();
const tombstones = readT();
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
function saveTombstones() {
  try {
    localStorage.setItem(TKEY, JSON.stringify(tombstones));
  } catch {
    /* quota */
  }
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
    startedIso: null, // le chrono démarre via « Commencer la séance »
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
        restSeconds: e.restSeconds,
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

/** Lance le chrono de la séance (bouton « Commencer la séance »). Idempotent. */
export function startChrono() {
  updateActive((d) => {
    if (!d.startedIso) d.startedIso = new Date().toISOString();
  });
}

const DEFAULT_REST_SECONDS = 90;

/**
 * Coche une série : marquée faite (horodatée) + démarre le repos prescrit.
 * Décocher annule l'horodatage, le repos mesuré, et le minuteur s'il portait
 * sur cette série.
 */
export function toggleSetDone(ei: number, si: number) {
  updateActive((d) => {
    const ex = d.exercises[ei];
    const s = ex?.sets[si];
    if (!s) return;
    if (s.done) {
      s.done = false;
      s.doneAtIso = null;
      s.restTakenSeconds = null;
      if (d.rest && d.rest.ei === ei && d.rest.si === si) d.rest = null;
    } else {
      s.done = true;
      s.doneAtIso = new Date().toISOString();
      if (!d.startedIso) d.startedIso = s.doneAtIso; // filet : démarre le chrono s'il a été oublié
      d.rest = {ei, si, startedIso: s.doneAtIso, targetSeconds: ex.restSeconds ?? DEFAULT_REST_SECONDS};
    }
  });
}

/** Ajuste le repos en cours (± secondes, plancher 5 s). */
export function adjustRest(deltaSeconds: number) {
  updateActive((d) => {
    if (d.rest) d.rest.targetSeconds = Math.max(5, d.rest.targetSeconds + deltaSeconds);
  });
}

/** Termine le repos : enregistre le repos réellement pris sur la série concernée. */
export function finishRest() {
  updateActive((d) => {
    if (!d.rest) return;
    const s = d.exercises[d.rest.ei]?.sets[d.rest.si];
    if (s) s.restTakenSeconds = Math.max(0, Math.round((Date.now() - new Date(d.rest.startedIso).getTime()) / 1000));
    d.rest = null;
  });
}

/** Termine la séance active -> bascule dans l'historique. */
export function finishActive() {
  if (!active) return;
  const at = new Date().toISOString();
  // Chrono jamais lancé → durée bornée à 0 (start = fin).
  const startedIso = active.startedIso ?? at;
  const finished: WorkoutLog = {...structuredClone(active), startedIso, finishedIso: at, updatedAt: at, rest: null};
  saveHistory([finished, ...history]);
  saveActive(null);
  pushItems([{kind: KIND, itemId: finished.id, data: finished, updatedAt: at, deleted: false}]);
}

export function abandonActive() {
  saveActive(null);
}

export function deleteLog(id: string) {
  const at = new Date().toISOString();
  tombstones[id] = at;
  saveTombstones();
  saveHistory(history.filter((l) => l.id !== id));
  pushItems([{kind: KIND, itemId: id, data: null, updatedAt: at, deleted: true}]);
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

/* ---- Synchronisation (last-write-wins par updatedAt + tombstones) ------ */
const logAt = (l: WorkoutLog) => l.updatedAt ?? l.finishedIso ?? l.startedIso ?? '';

function snapshot(): SyncItem[] {
  const items: SyncItem[] = history.map((l) => ({kind: KIND, itemId: l.id, data: l, updatedAt: logAt(l), deleted: false}));
  for (const [id, at] of Object.entries(tombstones)) {
    items.push({kind: KIND, itemId: id, data: null, updatedAt: at, deleted: true});
  }
  return items;
}

function applyRemote(items: SyncItem[]) {
  const byId = new Map(history.map((l) => [l.id, l]));
  let histChanged = false;
  let tombChanged = false;
  for (const it of items) {
    const local = byId.get(it.itemId);
    const localAt = local ? logAt(local) : tombstones[it.itemId];
    if (localAt && localAt >= it.updatedAt) continue; // le nôtre est aussi récent ou plus
    if (it.deleted) {
      if (local) {
        byId.delete(it.itemId);
        histChanged = true;
      }
      tombstones[it.itemId] = it.updatedAt;
      tombChanged = true;
    } else {
      byId.set(it.itemId, it.data as WorkoutLog);
      histChanged = true;
      if (tombstones[it.itemId]) {
        delete tombstones[it.itemId];
        tombChanged = true;
      }
    }
  }
  if (tombChanged) saveTombstones();
  if (histChanged) saveHistory([...byId.values()].sort((a, b) => (logAt(a) < logAt(b) ? 1 : -1)));
}

registerCollection(KIND, {snapshot, applyRemote});
