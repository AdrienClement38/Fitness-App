import {Component, type ErrorInfo, type ReactNode} from 'react';

/**
 * Garde-fou de rendu : une exception dans l'arbre React (blob de sync malformé,
 * vieux format localStorage, bug ponctuel) afficherait sinon un écran blanc. Ici
 * on intercepte, on log, et on propose de recharger — les données restent en
 * localStorage, donc rien n'est perdu. ~0 dépendance.
 */
interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<{children: ReactNode}, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
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
