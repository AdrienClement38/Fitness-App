import {Component, type ErrorInfo, type ReactNode} from 'react';

/**
 * Garde-fou de rendu : une exception dans l'arbre React afficherait sinon un écran
 * blanc. On intercepte, on log, et on propose de recharger — les données restent en
 * localStorage, donc rien n'est perdu.
 *
 * CAS FRÉQUENT après un déploiement : un onglet déjà ouvert tente de charger un chunk
 * (page chargée en `lazy(() => import(...))`) dont le hash a changé / qui a été supprimé
 * du serveur -> l'import dynamique échoue. On le DÉTECTE et on RECHARGE automatiquement
 * (la page récupère la version à jour), avec une garde anti-boucle. L'utilisateur ne voit
 * alors qu'un bref « Mise à jour… » au lieu de l'écran d'erreur.
 */

// Messages d'échec d'import dynamique / chunk périmé selon les navigateurs (Chrome,
// Firefox, Safari) et Vite.
const CHUNK_LOAD_ERROR =
  /dynamically imported module|importing a module script failed|loading chunk|failed to fetch dynamically|module script failed|unable to preload|error loading dynamically imported/i;
const RELOAD_AT_KEY = 'chunk-reload-at';

function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return CHUNK_LOAD_ERROR.test(msg);
}

interface State {
  error: Error | null;
  chunk: boolean; // erreur de chunk périmé -> rechargement auto
}

export default class ErrorBoundary extends Component<{children: ReactNode}, State> {
  state: State = {error: null, chunk: false};

  static getDerivedStateFromError(error: Error): State {
    return {error, chunk: isChunkLoadError(error)};
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error)) {
      // Chunk périmé (déploiement) -> on recharge pour prendre la version à jour. Garde
      // anti-boucle : un seul rechargement auto par fenêtre de 10 s. Si le problème
      // persiste au-delà, on laisse l'écran d'erreur s'afficher plutôt que de boucler.
      let last = 0;
      try {
        last = Number(sessionStorage.getItem(RELOAD_AT_KEY)) || 0;
      } catch {
        /* sessionStorage indispo (mode privé) */
      }
      if (Date.now() - last > 10000) {
        try {
          sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
        window.location.reload();
        return;
      }
    }
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    // Chunk périmé : message neutre, le rechargement auto est déjà déclenché.
    if (this.state.chunk) {
      return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <p className="text-sm text-slate-400">Mise à jour de l'application…</p>
        </div>
      );
    }

    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold">Oups, un souci d'affichage</h1>
        <p className="text-sm text-slate-400">
          Une erreur a interrompu l'affichage. Tes données sont conservées sur l'appareil — recharge la page
          pour reprendre.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400"
        >
          Recharger
        </button>
      </div>
    );
  }
}
