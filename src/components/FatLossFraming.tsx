import {AlertTriangle, ChevronDown, Info} from 'lucide-react';
import {FRAMING} from '../lib/affiner';

/**
 * Bandeau de cadrage honnête (anti « perte ciblée »). En tête du hub : repliable
 * (fermé par défaut) — le titre seul porte déjà le message ; le détail + la note de
 * répartition par sexe (`note`) se déplient à la demande. Variante `compact` =
 * rappel discret sur une ligne.
 */
export default function FatLossFraming({note, compact}: {note?: string | null; compact?: boolean}) {
  if (compact) {
    return (
      <p className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-200">
        <Info className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
        On ne perd pas le gras d'une zone en l'entraînant — la perte est globale. Le travail ciblé muscle et galbe la zone.
      </p>
    );
  }
  return (
    <details className="group rounded-2xl border border-sky-500/25 bg-sky-500/10 [&>summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-semibold text-sky-200">
        <Info className="h-4 w-4 shrink-0" />
        <span className="flex-1">{FRAMING.title}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-sky-300/70 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4">
        <p className="text-sm leading-relaxed text-slate-300">{FRAMING.body}</p>
        {/* Avertissement santé sur le déficit (modéré/contrôlé, danger si trop agressif). */}
        <div className="mt-2.5 flex gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-2.5 text-xs leading-relaxed text-amber-200/90">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>{FRAMING.deficitNote}</span>
        </div>
        {note && <p className="mt-2.5 text-sm leading-relaxed text-slate-400">{note}</p>}
      </div>
    </details>
  );
}
