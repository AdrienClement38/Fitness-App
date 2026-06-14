import {useSyncExternalStore} from 'react';

function subscribe(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

/** État réseau du navigateur (événements online/offline). PWA offline-first : sert à
 *  distinguer « pas de réseau » de « pas de résultat » et à afficher un bandeau. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
