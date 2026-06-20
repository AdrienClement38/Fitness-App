import {Info} from 'lucide-react';
import {FRAMING} from '../lib/affiner';

/**
 * Bandeau de cadrage honnête (anti « perte ciblée »), affiché en tête du hub et des
 * pages zone. Variante `compact` pour un rappel discret (ex. liste d'exercices).
 */
export default function FatLossFraming({compact}: {compact?: boolean}) {
  if (compact) {
    return (
      <p className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs leading-relaxed text-sky-200">
        <Info className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
        On ne perd pas le gras d'une zone en l'entraînant — la perte est globale. Le travail ciblé muscle et galbe la zone.
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-sky-200">
        <Info className="h-4 w-4 shrink-0" /> {FRAMING.title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{FRAMING.body}</p>
    </div>
  );
}
