/**
 * « Mes programmes » : programmes persos de l'utilisateur, stockés en
 * localStorage (perso, hors-ligne, zéro backend). Dupliqués depuis un
 * programme curated puis éditables. Store réactif (useSyncExternalStore).
 */
import {useSyncExternalStore} from 'react';
import type {ProgramDetail} from './api';

export interface MyProgramExercise {
  exerciseId: string;
  nameFr: string | null;
  nameEn: string;
  force: string | null;
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
}

const KEY = 'my-programs';

function read(): MyProgram[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as MyProgram[];
  } catch {
    return [];
  }
}

let list = read();
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
    sessions: source.sessions.map((s) => ({
      nameFr: s.nameFr,
      focusFr: s.focusFr,
      exercises: s.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        nameFr: e.nameFr,
        nameEn: e.nameEn,
        force: e.force,
        sets: e.sets,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        restSeconds: e.restSeconds,
        notesFr: e.notesFr,
      })),
    })),
  };
  commit([...list, copy]);
  return id;
}

/** Crée un programme vide (de zéro). Retourne son id. */
export function createEmptyProgram(name = 'Mon programme'): string {
  const id = genId();
  commit([...list, {id, nameFr: name, theme: null, level: null, fromProgramId: null, sessions: [{nameFr: 'Séance 1', focusFr: null, exercises: []}]}]);
  return id;
}

export function updateMyProgram(updated: MyProgram) {
  commit(list.map((p) => (p.id === updated.id ? updated : p)));
}

export function removeMyProgram(id: string) {
  commit(list.filter((p) => p.id !== id));
}

/** Liste réactive des programmes persos. */
export function useMyPrograms(): MyProgram[] {
  return useSyncExternalStore(subscribe, () => list, () => list);
}
