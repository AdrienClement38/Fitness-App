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

/* ---- Mode explication (info-bulles « ? » des termes techniques) -------- */
const EXPLAIN_KEY = 'pref-explanations';

function readExplain(): boolean {
  try {
    const v = localStorage.getItem(EXPLAIN_KEY);
    return v === null ? true : v === '1'; // activé par défaut (utile aux débutants)
  } catch {
    return true;
  }
}

let explainValue = readExplain();
const explainListeners = new Set<() => void>();

export function setExplanations(on: boolean) {
  explainValue = on;
  try {
    localStorage.setItem(EXPLAIN_KEY, on ? '1' : '0');
  } catch {
    /* quota / mode privé */
  }
  explainListeners.forEach((l) => l());
}

/** Réactif : les info-bulles « ? » ne s'affichent que si le mode explication est ON. */
export function useExplanations(): boolean {
  return useSyncExternalStore(
    (cb) => {
      explainListeners.add(cb);
      return () => explainListeners.delete(cb);
    },
    () => explainValue,
    () => true,
  );
}

/* ---- Bip sonore de fin de repos (par appareil) ----------------------- */
const SOUND_KEY = 'pref-rest-sound';

function readSound(): boolean {
  try {
    const v = localStorage.getItem(SOUND_KEY);
    return v === null ? true : v === '1'; // activé par défaut
  } catch {
    return true;
  }
}

let soundValue = readSound();
const soundListeners = new Set<() => void>();

export function setRestSound(on: boolean) {
  soundValue = on;
  try {
    localStorage.setItem(SOUND_KEY, on ? '1' : '0');
  } catch {
    /* quota / mode privé */
  }
  soundListeners.forEach((l) => l());
}

/** Lecture non réactive (au moment où le repos se termine). */
export function restSoundEnabled(): boolean {
  return soundValue;
}

export function useRestSound(): boolean {
  return useSyncExternalStore(
    (cb) => {
      soundListeners.add(cb);
      return () => soundListeners.delete(cb);
    },
    () => soundValue,
    () => true,
  );
}
