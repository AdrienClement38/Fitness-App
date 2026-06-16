/**
 * Client de synchronisation temps réel (WebSocket). Le client fait tout le
 * merge : chaque « collection » (séances, programmes, favoris) s'enregistre en
 * fournissant un snapshot (pour réconcilier) et un applyRemote (merge entrant).
 * Offline-first : si la socket est fermée, on ne bloque rien ; la réconciliation
 * au prochain `open` (push du snapshot complet) rattrape les modifs hors-ligne.
 */
import {useSyncExternalStore} from 'react';

// Contrat de fil client<->serveur. À garder IDENTIQUE à SyncItem de
// server/repositories/syncRepository.ts (validé au runtime par le schéma Zod de server/sync.ts).
export interface SyncItem {
  kind: string;
  itemId: string;
  data: unknown; // null si supprimé
  updatedAt: string; // ISO
  deleted: boolean;
}

interface Collection {
  snapshot: () => SyncItem[]; // état local courant (réconciliation)
  applyRemote: (items: SyncItem[]) => void; // merge des items entrants
  clear?: () => void; // purge locale (localStorage + état mémoire) au changement de compte
}

const collections = new Map<string, Collection>();
export function registerCollection(kind: string, c: Collection) {
  collections.set(kind, c);
}

/**
 * Purge les données locales de TOUTES les collections (séances, programmes, favoris,
 * records). Appelée quand le « propriétaire » des données locales change : connexion
 * sur un AUTRE compte, ou suppression de compte. Les données d'un compte ne doivent
 * jamais réapparaître ni être re-synchronisées sous un autre compte sur le même appareil.
 * S'appuie sur l'enregistrement de toutes les collections au démarrage (cf. syncCollections.ts).
 */
export function clearLocalData() {
  for (const c of collections.values()) c.clear?.();
}

let ws: WebSocket | null = null;
let connected = false;
let want = false; // on souhaite être connecté (utilisateur loggé)
let reconnectTimer: number | null = null;

const statusListeners = new Set<() => void>();
function notify() {
  statusListeners.forEach((l) => l());
}

function route(items: SyncItem[]) {
  const byKind = new Map<string, SyncItem[]>();
  for (const it of items) {
    const list = byKind.get(it.kind);
    if (list) list.push(it);
    else byKind.set(it.kind, [it]);
  }
  for (const [kind, list] of byKind) collections.get(kind)?.applyRemote(list);
}

function open() {
  if (ws || !want) return;
  const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  const sock = new WebSocket(url);
  ws = sock;

  sock.onopen = () => {
    connected = true;
    notify();
    sock.send(JSON.stringify({type: 'pull'}));
    // Réconciliation : on pousse tout notre état local (le serveur garde le plus récent).
    const all: SyncItem[] = [];
    for (const c of collections.values()) all.push(...c.snapshot());
    if (all.length) sock.send(JSON.stringify({type: 'push', items: all}));
  };
  sock.onmessage = (e) => {
    let msg: {type?: string; items?: SyncItem[]};
    try {
      msg = JSON.parse(e.data);
    } catch {
      return;
    }
    if (msg.type === 'items' && Array.isArray(msg.items)) route(msg.items);
  };
  sock.onclose = () => {
    connected = false;
    ws = null;
    notify();
    if (want) scheduleReconnect();
  };
  sock.onerror = () => {
    try {
      sock.close();
    } catch {
      /* ignore */
    }
  };
}

function scheduleReconnect() {
  if (reconnectTimer != null) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    open();
  }, 3000);
}

export function connect() {
  want = true;
  open();
}
export function disconnect() {
  want = false;
  if (reconnectTimer != null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
    ws = null;
  }
  connected = false;
  notify();
}

/** Pousse des items modifiés (temps réel). Hors-ligne : la réconciliation au prochain open rattrape. */
export function pushItems(items: SyncItem[]) {
  if (ws && connected && items.length) ws.send(JSON.stringify({type: 'push', items}));
}

export function useSyncConnected(): boolean {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
    () => connected,
    () => false,
  );
}
