/**
 * Favoris : stockés en localStorage (app perso, hors-ligne, zéro backend).
 * Store externe réactif partagé par tous les composants via useSyncExternalStore.
 */
import {useSyncExternalStore} from 'react';

const KEY = 'salle-favorites';

function readInitial(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

let favSet = readInitial();
let favArray: string[] = [...favSet]; // snapshot stable pour useSyncExternalStore
const listeners = new Set<() => void>();

function commit() {
  favArray = [...favSet];
  try {
    localStorage.setItem(KEY, JSON.stringify(favArray));
  } catch {
    /* quota / mode privé : on garde l'état en mémoire */
  }
  listeners.forEach((l) => l());
}

export function toggleFavorite(id: string) {
  if (favSet.has(id)) favSet.delete(id);
  else favSet.add(id);
  commit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Liste réactive des favoris (ids), persistée en localStorage. */
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
