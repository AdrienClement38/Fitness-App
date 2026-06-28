/**
 * « Annonce fermée » : la version d'annonce que l'utilisateur a fermée (croix). Stockée
 * et SYNCHRONISÉE PAR COMPTE (même mécanisme que le profil : 1 item unique, last-write-wins)
 * -> une fois fermée sur un appareil, le bandeau ne réapparaît plus sur les autres. Quand
 * l'admin (re)publie une annonce, sa version change côté serveur : elle ne correspond plus à
 * la version fermée -> le bandeau réapparaît. Données purement clientes, le serveur ne stocke
 * qu'un blob (cf. [[server-light-client-heavy]]).
 */
import {useSyncExternalStore} from 'react';
import {pushItems, registerCollection, type SyncItem} from './sync';

const KEY = 'salle-announcement-seen';
const KIND = 'announcement-seen';
const ITEM = 'me';
const EPOCH = '1970-01-01T00:00:00.000Z';
const now = () => new Date().toISOString();

interface Stored {
  version: string; // version d'annonce fermée ('' = aucune fermée)
  updatedAt: string;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Stored>;
      return {version: str(s.version), updatedAt: s.updatedAt ?? EPOCH};
    }
  } catch {
    /* quota / mode privé */
  }
  return {version: '', updatedAt: EPOCH};
}

let store = read();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

/** Ferme l'annonce de la version donnée (persiste + synchronise sur tous les appareils). */
export function dismissAnnouncement(version: string) {
  if (!version || store.version === version) return;
  store = {version, updatedAt: now()};
  save();
  emit();
  pushItems([{kind: KIND, itemId: ITEM, data: store, updatedAt: store.updatedAt, deleted: false}]);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
/** Version d'annonce déjà fermée par l'utilisateur ('' si aucune). */
export function useDismissedAnnouncement(): string {
  return useSyncExternalStore(subscribe, () => store.version, () => store.version);
}

/* ---- Synchronisation (LWW sur l'unique item) --------------------------- */
function snapshot(): SyncItem[] {
  return [{kind: KIND, itemId: ITEM, data: store, updatedAt: store.updatedAt, deleted: false}];
}
function applyRemote(items: SyncItem[]) {
  let changed = false;
  for (const it of items) {
    if (it.itemId !== ITEM || it.deleted) continue;
    const incoming = it.data as Partial<Stored> | null;
    if (incoming && it.updatedAt > store.updatedAt) {
      store = {version: str(incoming.version), updatedAt: it.updatedAt};
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
  store = {version: '', updatedAt: EPOCH};
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* quota */
  }
  emit();
}

registerCollection(KIND, {snapshot, applyRemote, clear});
