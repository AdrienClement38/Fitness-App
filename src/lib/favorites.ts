/**
 * Favoris : stockés en localStorage, synchronisés entre appareils. Modèle « état
 * plat » : chaque exercice (dé)favorisé garde {deleted, updatedAt} pour permettre
 * le merge last-write-wins (un retrait doit se propager, d'où le flag `deleted`).
 */
import {useSyncExternalStore} from 'react';
import {pushItems, registerCollection, type SyncItem} from './sync';
import {mergeFavorites, type FavState} from './syncMerge';

const KEY = 'salle-favorites';
const KIND = 'favorite';
const now = () => new Date().toISOString();

function readMeta(): Record<string, FavState> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // ancien format (string[]) -> migration vers l'état plat
      const t = now();
      const meta: Record<string, FavState> = {};
      for (const id of parsed as string[]) meta[id] = {deleted: false, updatedAt: t};
      return meta;
    }
    return parsed as Record<string, FavState>;
  } catch {
    return {};
  }
}

function activeIds(m: Record<string, FavState>): string[] {
  return Object.keys(m).filter((id) => !m[id].deleted);
}

let meta = readMeta();
let favArray: string[] = activeIds(meta);
const listeners = new Set<() => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    /* quota / mode privé : on garde l'état en mémoire */
  }
}
function commit() {
  favArray = activeIds(meta);
  save();
  listeners.forEach((l) => l());
}

export function toggleFavorite(id: string) {
  const isFav = !!meta[id] && !meta[id].deleted;
  meta[id] = {deleted: isFav, updatedAt: now()};
  commit();
  pushItems([{kind: KIND, itemId: id, data: null, updatedAt: meta[id].updatedAt, deleted: meta[id].deleted}]);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Liste réactive des favoris (ids), persistée + synchronisée. */
export function useFavorites() {
  const favorites = useSyncExternalStore(
    subscribe,
    () => favArray,
    () => favArray,
  );
  return {
    favorites,
    count: favorites.length,
    isFavorite: (id: string) => favorites.includes(id),
    toggle: toggleFavorite,
  };
}

/* ---- Synchronisation --------------------------------------------------- */
function snapshot(): SyncItem[] {
  return Object.entries(meta).map(([id, m]) => ({kind: KIND, itemId: id, data: null, updatedAt: m.updatedAt, deleted: m.deleted}));
}
function applyRemote(items: SyncItem[]) {
  if (mergeFavorites(meta, items)) commit();
}

/** Purge locale (changement de compte). */
function clear() {
  meta = {};
  favArray = [];
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* quota / mode privé */
  }
  listeners.forEach((l) => l());
}

registerCollection(KIND, {snapshot, applyRemote, clear});
