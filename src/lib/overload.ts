/**
 * Surcharge progressive (double progression) : à partir de ta meilleure série de la
 * DERNIÈRE séance et de la fourchette de reps prescrite, suggère l'objectif suivant.
 *  - Haut de la fourchette atteint  -> on monte la charge (+2,5 kg), reps au bas.
 *  - Dans la fourchette             -> même charge, +1 rep.
 *  - Sous la fourchette             -> même charge, vise le bas de la fourchette.
 * Poids du corps / durée / cardio : bats simplement ta dernière valeur. Logique pure
 * (testable), zéro effet de bord. Référence : progression linéaire / double progression.
 */
import type {MeasureKind} from './api';
import type {WorkoutLog} from './workoutLogs';

export interface OverloadHint {
  weight: number | null; // charge suggérée (load) ; null pour les autres modes
  reps: number; // reps / secondes / minutes suggérées
  lastText: string; // ce que tu as fait la dernière fois (ex. « 50 kg × 8 »)
  text: string; // l'objectif suggéré (ex. « 52.5 kg × 8 »)
}

const LOAD_INCREMENT = 2.5; // kg : saut raisonnable par défaut

/** Parse une cible de reps : « 8 » -> {8,8} ; « 8-12 » -> {8,12}. */
function parseRange(targetReps: string): {min: number; max: number} | null {
  const m = targetReps.match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
  if (!m) return null;
  const min = Number(m[1]);
  return {min, max: m[2] ? Number(m[2]) : min};
}

/** Meilleure série FAITE pour cet exercice dans la séance terminée la plus récente. */
function lastBest(history: WorkoutLog[], exerciseId: string): {weight: number | null; reps: number} | null {
  for (const log of history) {
    const ex = log.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const done = ex.sets.filter((s) => s.done && s.reps != null);
    if (done.length === 0) continue;
    let best = done[0];
    for (const s of done) {
      if (ex.kind === 'load') {
        const w = s.weight ?? 0;
        const bw = best.weight ?? 0;
        if (w > bw || (w === bw && (s.reps ?? 0) > (best.reps ?? 0))) best = s;
      } else if ((s.reps ?? 0) > (best.reps ?? 0)) {
        best = s;
      }
    }
    return {weight: best.weight, reps: best.reps as number};
  }
  return null;
}

/** Suggestion de surcharge progressive pour un exercice, ou null si pas d'historique. */
export function overloadHint(
  kind: MeasureKind,
  targetReps: string,
  history: WorkoutLog[],
  exerciseId: string,
): OverloadHint | null {
  const last = lastBest(history, exerciseId);
  if (!last) return null;

  if (kind === 'load') {
    if (last.weight == null) return null;
    const range = parseRange(targetReps) ?? {min: last.reps, max: last.reps};
    let weight = last.weight;
    let reps = last.reps;
    if (last.reps >= range.max) {
      weight = last.weight + LOAD_INCREMENT;
      reps = range.min;
    } else if (last.reps >= range.min) {
      reps = last.reps + 1;
    } else {
      reps = range.min;
    }
    return {weight, reps, lastText: `${last.weight} kg × ${last.reps}`, text: `${weight} kg × ${reps}`};
  }

  // Poids du corps / durée / cardio : on vise un peu mieux que la dernière fois.
  const unit = kind === 'duration' ? ' s' : kind === 'cardio' ? ' min' : ' reps';
  const reps = last.reps + (kind === 'duration' ? 5 : 1);
  return {weight: null, reps, lastText: `${last.reps}${unit}`, text: `${reps}${unit}`};
}
