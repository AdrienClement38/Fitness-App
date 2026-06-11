/**
 * « Mes programmes » : programmes persos de l'utilisateur, stockés en
 * localStorage (perso, hors-ligne, zéro backend). Dupliqués depuis un
 * programme curated puis éditables. Store réactif (useSyncExternalStore).
 */
import {useSyncExternalStore} from 'react';
import type {ProgramDetail} from './api';
import {pushItems, registerCollection, type SyncItem} from './sync';
import {mergeCollection} from './syncMerge';

export interface MyProgramExercise {
  exerciseId: string;
  nameFr: string | null;
  nameEn: string;
  force: string | null;
  category: string | null;
  equipmentId: string | null;
  sets: number | null;
  repsMin: number | null;
  repsMax: number | null;
  restSeconds: number | null;
  notesFr: string | null;
}
export interface MyProgramSession {
  nameFr: string;
  focusFr: string | null;
  exercises: MyProgramExercise[];
}
export interface MyProgram {
  id: string;
  nameFr: string;
  theme: string | null;
  level: string | null;
  fromProgramId: string | null; // programme curated d'origine (si dupliqué)
  sessions: MyProgramSession[];
  updatedAt?: string; // pour la sync (last-write-wins)
}

const KEY = 'my-programs';
const TKEY = 'my-programs-tombstones';
const KIND = 'my-program';
const EPOCH = '1970-01-01T00:00:00.000Z';
const now = () => new Date().toISOString();
const progAt = (p: MyProgram) => p.updatedAt ?? EPOCH;

function read(): MyProgram[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as MyProgram[];
  } catch {
    return [];
  }
}
function readT(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TKEY) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

let list = read();
let tombstones = readT();
const listeners = new Set<() => void>();

function commit(next: MyProgram[]) {
  list = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota / mode privé : on garde l'état en mémoire */
  }
  listeners.forEach((l) => l());
}
function saveTombstones() {
  try {
    localStorage.setItem(TKEY, JSON.stringify(tombstones));
  } catch {
    /* quota */
  }
}
function pushProgram(p: MyProgram) {
  pushItems([{kind: KIND, itemId: p.id, data: p, updatedAt: progAt(p), deleted: false}]);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const genId = () => `mp-${crypto.randomUUID()}`;

export function getMyProgram(id: string): MyProgram | undefined {
  return list.find((p) => p.id === id);
}

/** Duplique un programme curated en copie éditable. Retourne l'id de la copie. */
export function duplicateProgram(source: ProgramDetail): string {
  const id = genId();
  const copy: MyProgram = {
    id,
    nameFr: `${source.nameFr} (ma version)`,
    theme: source.theme,
    level: source.level,
    fromProgramId: source.id,
    updatedAt: now(),
    sessions: source.sessions.map((s) => ({
      nameFr: s.nameFr,
      focusFr: s.focusFr,
      exercises: s.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        nameFr: e.nameFr,
        nameEn: e.nameEn,
        force: e.force,
        category: e.category,
        equipmentId: e.equipmentId,
        sets: e.sets,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        restSeconds: e.restSeconds,
        notesFr: e.notesFr,
      })),
    })),
  };
  commit([...list, copy]);
  pushProgram(copy);
  return id;
}

/** Crée un programme vide (de zéro). Retourne son id. */
export function createEmptyProgram(name = 'Mon programme'): string {
  const id = genId();
  const p: MyProgram = {id, nameFr: name, theme: null, level: null, fromProgramId: null, updatedAt: now(), sessions: [{nameFr: 'Séance 1', focusFr: null, exercises: []}]};
  commit([...list, p]);
  pushProgram(p);
  return id;
}

export function updateMyProgram(updated: MyProgram) {
  const stamped: MyProgram = {...updated, updatedAt: now()};
  commit(list.map((p) => (p.id === stamped.id ? stamped : p)));
  pushProgram(stamped);
}

export function removeMyProgram(id: string) {
  const at = now();
  tombstones[id] = at;
  saveTombstones();
  commit(list.filter((p) => p.id !== id));
  pushItems([{kind: KIND, itemId: id, data: null, updatedAt: at, deleted: true}]);
}

/** Liste réactive des programmes persos. */
export function useMyPrograms(): MyProgram[] {
  return useSyncExternalStore(subscribe, () => list, () => list);
}

/* ---- Synchronisation (LWW + tombstones) -------------------------------- */
function snapshot(): SyncItem[] {
  const items: SyncItem[] = list.map((p) => ({kind: KIND, itemId: p.id, data: p, updatedAt: progAt(p), deleted: false}));
  for (const [id, at] of Object.entries(tombstones)) {
    items.push({kind: KIND, itemId: id, data: null, updatedAt: at, deleted: true});
  }
  return items;
}
function applyRemote(items: SyncItem[]) {
  const byId = new Map(list.map((p) => [p.id, p]));
  const tomb = new Map(Object.entries(tombstones));
  const {itemsChanged, tombstonesChanged} = mergeCollection(byId, tomb, items, progAt);
  if (tombstonesChanged) {
    tombstones = Object.fromEntries(tomb);
    saveTombstones();
  }
  if (itemsChanged) commit([...byId.values()]);
}
registerCollection(KIND, {snapshot, applyRemote});
