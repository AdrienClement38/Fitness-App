import type {ReactNode} from 'react';

type Tone = 'slate' | 'emerald' | 'indigo' | 'amber';

const TONES: Record<Tone, string> = {
  slate: 'bg-slate-800 text-slate-300',
  emerald: 'bg-emerald-500/15 text-emerald-300',
  indigo: 'bg-indigo-500/15 text-indigo-300',
  amber: 'bg-amber-500/15 text-amber-300',
};

export function Badge({children, tone = 'slate'}: {children: ReactNode; tone?: Tone}) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function Loading({label = 'Chargement…'}: {label?: string}) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400" />
      {label}
    </div>
  );
}

export function ErrorState({message}: {message: string}) {
  return (
    <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
      Erreur : {message}
    </div>
  );
}

export function Empty({label}: {label: string}) {
  return <div className="py-16 text-center text-slate-500">{label}</div>;
}

export function SectionTitle({children}: {children: ReactNode}) {
  return <h2 className="mb-2 mt-6 font-heading text-lg uppercase tracking-wider text-slate-300">{children}</h2>;
}

/** Petit carré de stat (valeur en avant + légende). Utilisé sur Accueil et Suivi. */
export function StatCard({label, value, title}: {label: string; value: string | number; title?: string}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center" title={title}>
      <div className="truncate text-lg font-bold tabular-nums text-emerald-300">{value}</div>
      <div className="mt-0.5 truncate text-xs text-slate-500">{label}</div>
    </div>
  );
}

/** Interrupteur (on/off) — toute la ligne est cliquable. Réglage par appareil. */
export function ToggleSwitch({checked, onChange, label, srLabel}: {checked: boolean; onChange: (v: boolean) => void; label: ReactNode; srLabel?: string}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={srLabel}
      onClick={() => onChange(!checked)}
      className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-left transition-colors hover:border-slate-700"
    >
      <span className="min-w-0 flex-1 text-sm text-slate-300">{label}</span>
      <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${checked ? 'bg-emerald-500' : 'bg-slate-600'}`}>
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}
