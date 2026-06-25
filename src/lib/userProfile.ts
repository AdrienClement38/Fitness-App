/**
 * Profil perso (poids) — stocké en localStorage, synchronisé par compte (même
 * mécanisme que favoris/records : 1 item unique, last-write-wins). Sert au module
 * d'estimation des calories. Volontairement hors table `users` (donnée purement
 * cliente, pas besoin côté serveur) : le serveur ne stocke qu'un blob.
 */
import {useSyncExternalStore} from 'react';
import {pushItems, registerCollection, type SyncItem} from './sync';

const KEY = 'salle-profile';
const KIND = 'user-profile';
const ITEM = 'me'; // item unique de la « collection »
const EPOCH = '1970-01-01T00:00:00.000Z';
const now = () => new Date().toISOString();

export interface Profile {
  weightKg: number | null; // poids saisi (kg) ; null = non renseigné -> défaut par sexe
  updatedAt: string;
}

function read(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Profile>;
      return {weightKg: typeof p.weightKg === 'number' ? p.weightKg : null, updatedAt: p.updatedAt ?? EPOCH};
    }
  } catch {
    /* quota / mode privé */
  }
  return {weightKg: null, updatedAt: EPOCH};
}

let profile = read();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* quota */
  }
}

/** Met à jour le poids (kg) — ou null pour « non renseigné ». Persiste + synchronise. */
export function setWeightKg(weightKg: number | null) {
  profile = {weightKg, updatedAt: now()};
  save();
  emit();
  pushItems([{kind: KIND, itemId: ITEM, data: profile, updatedAt: profile.updatedAt, deleted: false}]);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useProfile(): Profile {
  return useSyncExternalStore(subscribe, () => profile, () => profile);
}

/* ---- Synchronisation (LWW sur l'unique item) --------------------------- */
function snapshot(): SyncItem[] {
  return [{kind: KIND, itemId: ITEM, data: profile, updatedAt: profile.updatedAt, deleted: false}];
}
function applyRemote(items: SyncItem[]) {
  let changed = false;
  for (const it of items) {
    if (it.itemId !== ITEM || it.deleted) continue;
    const incoming = it.data as Partial<Profile> | null;
    if (incoming && it.updatedAt > profile.updatedAt) {
      profile = {weightKg: typeof incoming.weightKg === 'number' ? incoming.weightKg : null, updatedAt: it.updatedAt};
      changed = true;
    }
  }
  if (changed) {
    save();
    emit();
  }
}
/** Purge locale (changement / suppression de compte). */
function clear() {
  profile = {weightKg: null, updatedAt: EPOCH};
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* quota */
  }
  emit();
}

registerCollection(KIND, {snapshot, applyRemote, clear});
