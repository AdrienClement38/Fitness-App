/**
 * État applicatif public (bandeau d'annonce + mode maintenance), récupéré du
 * serveur au chargement et à chaque retour d'onglet (pour voir une bascule
 * maintenance sans recharger). Léger : un seul GET, partagé via un store réactif.
 */
import {useSyncExternalStore} from 'react';
import {api, type PublicAppStatus} from './api';

const EMPTY: PublicAppStatus = {announcement: null, maintenance: {active: false, message: ''}};

let state: PublicAppStatus = EMPTY;
const listeners = new Set<() => void>();

export async function refreshAppStatus() {
  try {
    const next = await api.appStatus();
    state = next;
    listeners.forEach((l) => l());
  } catch {
    /* réseau : on conserve l'état courant */
  }
}

// Fetch initial au chargement du module.
void refreshAppStatus();

// Re-vérifie quand l'onglet redevient visible (capte une bascule maintenance/annonce).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshAppStatus();
  });
}

export function useAppStatus(): PublicAppStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}
