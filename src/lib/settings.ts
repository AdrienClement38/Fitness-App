/** Préférences locales (par appareil). */
import {useSyncExternalStore} from 'react';

const KEY = 'pref-stretch-suggestions';

function read(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? true : v === '1'; // activé par défaut
  } catch {
    return true;
  }
}

let value = read();
const listeners = new Set<() => void>();

export function setStretchSuggestions(on: boolean) {
  value = on;
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    /* quota / mode privé */
  }
  listeners.forEach((l) => l());
}

/** Lecture non réactive (pour décider au moment de terminer la séance). */
export function stretchSuggestionsEnabled(): boolean {
  return value;
}

export function useStretchSuggestions(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => value,
    () => true,
  );
}
