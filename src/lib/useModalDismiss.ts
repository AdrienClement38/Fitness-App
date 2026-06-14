import {useEffect} from 'react';

/**
 * Comportement commun des overlays/modales plein écran : ferme à la touche Échap
 * et verrouille le scroll du body tant que la modale est montée (restauré au
 * démontage). Mutualise ce que la lightbox faisait déjà à la main.
 */
export function useModalDismiss(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);
}
