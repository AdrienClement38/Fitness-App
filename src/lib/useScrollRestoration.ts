import {useLayoutEffect, useRef} from 'react';
import {useLocation, useNavigationType} from 'react-router-dom';

// Position de scroll mémorisée par entrée d'historique. `location.key` est stable
// quand on revient/avance sur une même entrée (POP), ce qui en fait la bonne clé.
const positions = new Map<string, number>();

// Boucle de restauration au niveau MODULE (et non dans le cycle de vie d'un effet) :
// ainsi une navigation « neutre » qui survient juste après un retour — typiquement
// le REPLACE de synchro d'URL d'une recherche débouncée qui se réécrit à l'identique
// — ne l'interrompt pas en plein vol.
let restoreRAF = 0;
let restoreTarget: number | null = null;

function startRestore(target: number) {
  cancelAnimationFrame(restoreRAF);
  restoreTarget = target;
  const start = performance.now();
  const step = () => {
    if (restoreTarget !== target) return;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.min(target, Math.max(0, maxScroll)));
    // On insiste tant que la cible n'est pas atteinte (liste async pas encore
    // rendue → page trop courte) et que le délai de grâce n'est pas écoulé.
    if (window.scrollY < target - 1 && performance.now() - start < 2000) {
      restoreRAF = requestAnimationFrame(step);
    } else {
      restoreTarget = null;
    }
  };
  restoreRAF = requestAnimationFrame(step);
}

function cancelRestore() {
  cancelAnimationFrame(restoreRAF);
  restoreTarget = null;
}

/**
 * Restauration manuelle de la position de scroll de la fenêtre.
 *
 * - Navigation « avant » avec changement d'URL (PUSH, ou REPLACE de pagination /
 *   filtres) → on remonte en haut de page.
 * - REPLACE sans changement d'URL (synchro recherche/filtres au montage) → on ne
 *   touche à rien (et on n'interrompt pas une restauration en cours).
 * - Retour / avance (POP) avec une position mémorisée → on la restaure, en
 *   réessayant tant que le contenu (chunk lazy + fetch) n'est pas assez haut.
 *
 * Le `history.scrollRestoration` natif échoue ici car il restaure AVANT que la
 * liste async soit re-rendue ; la page est alors trop courte et on tombe en haut.
 */
export function useScrollRestoration() {
  const location = useLocation();
  const navType = useNavigationType();
  const key = location.key;
  const url = location.pathname + location.search;
  const keyRef = useRef(key);
  keyRef.current = key;
  const urlRef = useRef(url);

  // Mémorise en continu la position de l'entrée courante (clé lue à l'instant du
  // scroll). On prend aussi la main sur la restauration native du navigateur.
  useLayoutEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const onScroll = () => positions.set(keyRef.current, window.scrollY);
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // À chaque changement d'entrée d'historique : restaurer (POP) ou remonter.
  useLayoutEffect(() => {
    const prevUrl = urlRef.current;
    urlRef.current = url;
    if (navType === 'POP') {
      cancelRestore();
      const saved = positions.get(key);
      if (saved != null && saved > 0) startRestore(saved);
      return;
    }
    if (url === prevUrl) return; // REPLACE neutre (URL identique) → on ne bouge rien
    cancelRestore();
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
