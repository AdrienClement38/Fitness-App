/**
 * Collections d'exercices CURÉES (presets), affichables via /exercices?preset=<clé>.
 *
 * Le module « M'affiner » s'en sert pour « Gros mouvements dépensiers » : une liste
 * courte et triée de VRAIS gros mouvements poly-articulaires. On ne peut pas la générer
 * par filtre — le champ mechanic=compound du dataset est trop bruité (il étiquette
 * « compound » des isolations d'abdos/bras → 300+ résultats). On cure donc à la main,
 * comme pour les programmes. IDs vérifiés présents au catalogue (slugs free-exercise-db).
 *
 * Une fois sur /exercices, les filtres normaux (matériel, niveau, muscle) s'appliquent
 * EN PLUS du preset → on peut affiner la liste curée à son matériel.
 */
export interface ExercisePreset {
  label: string;
  /** Phrase d'intro affichée en tête de la liste filtrée. */
  intro: string;
  ids: string[];
}

export const EXERCISE_PRESETS: Record<string, ExercisePreset> = {
  'gros-mouvements': {
    label: 'Gros mouvements dépensiers',
    intro: 'Les mouvements poly-articulaires qui brûlent le plus et préservent le muscle. Filtre par matériel pour ne garder que les tiens.',
    // Couvre tous les patterns (squat, charnière, fente, poussée H/V, tirage H/V, dips,
    // fessiers) avec un mix barre / machine / câble / haltères / kettlebell / poids du corps.
    ids: [
      'barbell-squat',
      'goblet-squat',
      'leg-press',
      'barbell-deadlift',
      'romanian-deadlift',
      'trap-bar-deadlift',
      'barbell-hip-thrust',
      'barbell-walking-lunge',
      'barbell-bench-press-medium-grip',
      'dumbbell-bench-press',
      'standing-military-press',
      'parallel-bar-dip',
      'bent-over-barbell-row',
      'one-arm-dumbbell-row',
      'pullups',
      'wide-grip-lat-pulldown',
    ],
  },
};

export const getPreset = (key: string | null | undefined): ExercisePreset | undefined =>
  key ? EXERCISE_PRESETS[key] : undefined;
