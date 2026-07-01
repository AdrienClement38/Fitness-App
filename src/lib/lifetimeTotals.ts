/**
 * Report de purge des cumuls à vie (trophées), indexé PAR SÉANCE. Les séances sont purgées à
 * ~3 mois (cf. pruneOldLogs) ; AVANT suppression, la contribution de chaque séance est figée ICI
 * sous une entrée immuable clé = id de la séance.
 *
 * Ensemble additif (OR-Set) synchronisé par compte : chaque appareil ajoute ses entrées, l'union
 * converge sans perte même si deux appareils purgent des séances DIFFÉRENTES hors-ligne (on ne
 * fusionne PAS des sommes en max, ce qui perdrait un delta). Total à vie = somme des entrées du
 * report + séances courantes, dédupliquées par id (cf. lifetimeTotals dans achievements.ts).
 */
import {useSyncExternalStore} from 'react';
import {pushItems, registerCollection, type SyncItem} from './sync';
import {isRealSession, logCardioMinutes, logTonnageKg, type CarryEntries, type CarryEntry} from './achievements';
import type {WorkoutLog} from './workoutLogs';

const KEY = 'lifetime-carry';
const KIND = 'lifetime-carry';

interface StoredEntry extends CarryEntry {
  updatedAt: string; // métadonnée de sync (l'entrée elle-même est immuable)
}

function read(): Record<string, StoredEntry> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const out: Record<string, StoredEntry> = {};
      for (const [id, e] of Object.entries(v as Record<string, unknown>)) {
        if (e && typeof e === 'object') {
          const o = e as Record<string, unknown>;
          out[id] = {tonnageKg: Number(o.tonnageKg) || 0, cardioMin: Number(o.cardioMin) || 0, updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : ''};
        }
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}

let entries = read();
let carrySnap: CarryEntries = pruneMeta(entries);
const listeners = new Set<() => void>();

/** Vue sans métadonnée de sync (stable tant que `entries` ne change pas). */
function pruneMeta(e: Record<string, StoredEntry>): CarryEntries {
  const out: CarryEntries = {};
  for (const id in e) out[id] = {tonnageKg: e[id].tonnageKg, cardioMin: e[id].cardioMin};
  return out;
}

function commit() {
  carrySnap = pruneMeta(entries);
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* quota / pas de localStorage (tests) */
  }
  listeners.forEach((l) => l());
}

/** Fige la contribution des séances (avant leur purge) : une entrée par id, idempotent. */
export function addPrunedContribution(logs: WorkoutLog[]) {
  const at = new Date().toISOString();
  const push: SyncItem[] = [];
  const next: Record<string, StoredEntry> = {...entries};
  let changed = false;
  for (const log of logs) {
    if (!isRealSession(log) || next[log.id]) continue; // déjà couverte -> idempotent
    const e: StoredEntry = {tonnageKg: logTonnageKg(log), cardioMin: logCardioMinutes(log), updatedAt: at};
    next[log.id] = e;
    push.push({kind: KIND, itemId: log.id, data: e, updatedAt: at, deleted: false});
    changed = true;
  }
  if (changed) {
    entries = next;
    commit();
    pushItems(push);
  }
}

function snapshot(): SyncItem[] {
  return Object.entries(entries).map(([id, e]) => ({kind: KIND, itemId: id, data: e, updatedAt: e.updatedAt || '0', deleted: false}));
}

/** OR-Set : chaque entrée (par séance) est immuable ; on ajoute/garde, jamais on ne soustrait. */
function applyRemote(items: SyncItem[]) {
  const next: Record<string, StoredEntry> = {...entries};
  let changed = false;
  for (const it of items) {
    if (it.deleted) continue; // une contribution ne se supprime pas
    const inc = it.data as Partial<StoredEntry> | null;
    if (!inc || typeof inc !== 'object') continue;
    const cur = next[it.itemId];
    const e: StoredEntry = {tonnageKg: Number(inc.tonnageKg) || 0, cardioMin: Number(inc.cardioMin) || 0, updatedAt: typeof inc.updatedAt === 'string' ? inc.updatedAt : ''};
    if (!cur || e.updatedAt > cur.updatedAt) {
      next[it.itemId] = e;
      changed = true;
    }
  }
  if (changed) {
    entries = next;
    commit();
  }
}

/** Purge locale (changement / suppression de compte). */
function clear() {
  entries = {};
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* quota / pas de localStorage */
  }
  commit();
}

registerCollection(KIND, {snapshot, applyRemote, clear});

export function useCarryEntries(): CarryEntries {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => carrySnap,
    () => carrySnap,
  );
}
