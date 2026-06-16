/**
 * Records all-time par exercice — résumé compact, synchronisé, qui SURVIT à la
 * purge des vieilles séances (cf. pruneOldLogs dans workoutLogs.ts). Quand une
 * séance est purgée, sa meilleure perf est repliée ici AVANT suppression. La
 * fusion (locale comme entre appareils) garde toujours le meilleur : un record
 * ne baisse jamais. Zéro logique serveur : un blob compact de plus à synchroniser.
 */
import {useSyncExternalStore} from 'react';
import {betterRecord, foldRecords, type ExerciseRecord} from './stats';
import {pushItems, registerCollection, type SyncItem} from './sync';
import type {WorkoutLog} from './workoutLogs';

const RKEY = 'exercise-records';
const KIND = 'exercise-record';

function read(): Record<string, ExerciseRecord> {
  try {
    return JSON.parse(localStorage.getItem(RKEY) || '{}') as Record<string, ExerciseRecord>;
  } catch {
    return {};
  }
}

let records = read();
let recordsArr = Object.values(records);
const listeners = new Set<() => void>();

function commit() {
  recordsArr = Object.values(records);
  try {
    localStorage.setItem(RKEY, JSON.stringify(records));
  } catch {
    /* quota / pas de localStorage (tests) */
  }
  listeners.forEach((l) => l());
}

/** Replie des séances dans les records (avant qu'elles soient purgées) et pousse les exercices touchés en sync. */
export function captureLogs(logs: WorkoutLog[]) {
  if (logs.length === 0) return;
  const at = new Date().toISOString();
  records = foldRecords(records, logs, at);
  commit();
  const touched = new Set<string>();
  for (const l of logs) for (const ex of l.exercises) if (ex.sets.some((s) => s.done)) touched.add(ex.exerciseId);
  const items: SyncItem[] = [...touched]
    .filter((id) => records[id])
    .map((id) => ({kind: KIND, itemId: id, data: records[id], updatedAt: records[id].updatedAt, deleted: false}));
  pushItems(items);
}

function snapshot(): SyncItem[] {
  return Object.values(records).map((r) => ({kind: KIND, itemId: r.exerciseId, data: r, updatedAt: r.updatedAt || r.lastDateIso || '0', deleted: false}));
}

function applyRemote(items: SyncItem[]) {
  let changed = false;
  for (const it of items) {
    if (it.deleted) continue; // un record ne se supprime pas (all-time)
    const incoming = it.data as ExerciseRecord | null;
    if (!incoming || typeof incoming !== 'object' || !incoming.exerciseId) continue;
    const merged = betterRecord(records[it.itemId], incoming);
    if (!records[it.itemId] || JSON.stringify(merged) !== JSON.stringify(records[it.itemId])) {
      records[it.itemId] = merged;
      changed = true;
    }
  }
  if (changed) commit();
}

/** Purge locale (changement de compte). */
function clear() {
  records = {};
  recordsArr = [];
  try {
    localStorage.removeItem(RKEY);
  } catch {
    /* quota / pas de localStorage (tests) */
  }
  listeners.forEach((l) => l());
}

registerCollection(KIND, {snapshot, applyRemote, clear});

export function useRecords(): ExerciseRecord[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => recordsArr,
    () => recordsArr,
  );
}
