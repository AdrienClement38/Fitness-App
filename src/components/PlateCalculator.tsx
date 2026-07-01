import {useState} from 'react';
import {Minus, Plus, X} from 'lucide-react';
import {useModalDismiss} from '../lib/useModalDismiss';
import {BAR_WEIGHTS, groupPlates, platesForWeight} from '../lib/plates';
import {setBarWeight, useBarWeight} from '../lib/settings';

/** Affichage FR d'un poids : « 2,5 » et non « 2.5 », entiers sans décimale. */
const fr = (n: number) => (Number.isInteger(n) ? String(n) : n.toString().replace('.', ','));
/** Parse une saisie FR/EN (« 82,5 » ou « 82.5 ») en nombre ; 0 si vide/invalide. */
const parse = (raw: string) => {
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * « Disques sur la barre » : à partir d'un poids total visé, dit quels disques mettre de
 * chaque côté d'une barre libre. Le poids de la barre (20/15/10) est mémorisé par appareil.
 * 100% client (calcul pur), n'affiche que ce que la barre + le jeu standard permettent.
 *
 * La saisie est un champ texte (inputMode décimal) piloté par une string brute : indispensable
 * pour taper une décimale (« 82,5 ») ou vider le champ — un <input type=number> contrôlé par un
 * nombre efface l'état intermédiaire « 82, » et interdit le champ vide.
 */
export default function PlateCalculator({initialWeight, onClose}: {initialWeight: number | null; onClose: () => void}) {
  useModalDismiss(onClose); // Échap + verrou du scroll de fond
  const bar = useBarWeight();
  const [raw, setRaw] = useState<string>(initialWeight && initialWeight > 0 ? fr(initialWeight) : fr(bar));

  const target = parse(raw);
  const hasTarget = target > 0;
  const bd = platesForWeight(target, bar);
  const groups = groupPlates(bd.perSide);
  const nudge = (d: number) => setRaw((r) => fr(Math.max(0, Math.round((parse(r) + d) * 100) / 100)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plate-calc-title"
        className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="plate-calc-title" className="font-semibold">Disques sur la barre</h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Poids total visé */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => nudge(-2.5)}
            aria-label="Retirer 2,5 kg"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="text-center">
            <input
              type="text"
              inputMode="decimal"
              value={raw}
              onChange={(e) => setRaw(e.target.value.replace(/[^0-9.,]/g, ''))}
              aria-label="Poids total visé (kg)"
              className="w-24 rounded-lg border border-slate-700 bg-slate-800 py-2 text-center text-2xl font-bold tabular-nums focus:border-emerald-500 focus:outline-none"
            />
            <p className="mt-0.5 text-xs text-slate-500">kg visés</p>
          </div>
          <button
            onClick={() => nudge(2.5)}
            aria-label="Ajouter 2,5 kg"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Poids de la barre */}
        <div className="mt-4">
          <p className="mb-1.5 text-xs text-slate-500">Poids de la barre</p>
          <div className="flex gap-2" role="group" aria-label="Poids de la barre">
            {BAR_WEIGHTS.map((b) => {
              const on = bar === b;
              return (
                <button
                  key={b}
                  onClick={() => setBarWeight(b)}
                  aria-pressed={on}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-sm transition-colors ${
                    on ? 'border-emerald-500 bg-emerald-500/10 font-semibold text-emerald-300' : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {on ? '✓ ' : ''}{b} kg
                </button>
              );
            })}
          </div>
        </div>

        {/* Résultat */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          {!hasTarget ? (
            <p className="text-center text-sm text-slate-400">Entre le poids total que tu veux soulever.</p>
          ) : bd.belowBar ? (
            <p className="text-center text-sm text-amber-300">Plus léger que la barre ({fr(bar)} kg). Prends une barre plus légère ou monte le poids.</p>
          ) : bd.perSide.length === 0 ? (
            <p className="text-center text-sm text-slate-300">Barre seule — {fr(bd.achieved)} kg, aucun disque.</p>
          ) : (
            <>
              <p className="mb-2 text-center text-xs text-slate-500">De chaque côté :</p>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {groups.map((g, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-sm font-semibold text-emerald-200"
                  >
                    {g.count > 1 && <span className="text-emerald-400">{g.count}×</span>}
                    {fr(g.plate)} kg
                  </span>
                ))}
              </div>
              <p className="mt-3 text-center text-sm font-medium">
                = {fr(bd.achieved)} kg <span className="text-slate-500">(barre {fr(bar)} + 2 × {fr((bd.achieved - bar) / 2)})</span>
              </p>
            </>
          )}
          {hasTarget && bd.approx && !bd.belowBar && (
            <p className="mt-2 text-center text-xs text-amber-300/90">
              Pas exact avec des disques standards → au plus proche : {fr(bd.achieved)} kg (visé {fr(bd.requested)}).
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
