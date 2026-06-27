/**
 * Garde l'écran allumé tant que `active` (Screen Wake Lock API) : sinon, pendant un
 * repos, le téléphone se verrouille, les minuteurs JS sont gelés et l'alerte (flash /
 * bip / vibration) ne part pas à l'heure. Aucune permission/popup. Re-acquiert le
 * verrou au retour sur l'onglet (le système le relâche quand la page passe en fond).
 * Best-effort : no-op silencieux si non supporté (ex. navigateurs anciens).
 */
import {useEffect} from 'react';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const wl = (navigator as unknown as {wakeLock?: {request: (t: 'screen') => Promise<WakeLockSentinelLike>}}).wakeLock;
    if (!wl) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const s = await wl.request('screen');
        if (cancelled) void s.release().catch(() => {});
        else sentinel = s;
      } catch {
        /* refusé (onglet en fond) / non supporté */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelled && !sentinel) void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
