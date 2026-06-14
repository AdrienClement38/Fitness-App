/**
 * Règle PURE du mode de saisie (load/bodyweight/duration/cardio).
 *
 * SOURCE DE VÉRITÉ UNIQUE, partagée entre :
 *  - le client (fallback de `measureKind()` dans api.ts, quand la valeur stockée manque) ;
 *  - le seed serveur (`deriveMeasureKind` dans server/db/seed.ts, surchargé ensuite par
 *    data/measure_kind_overrides.json).
 *
 * Zéro import React/DOM/Node -> importable des deux côtés. Le seed tourne via tsx (hors
 * runtime prod), donc cet import n'alourdit pas le serveur. NE PAS redupliquer cette logique.
 */
export type MeasureKind = 'load' | 'bodyweight' | 'duration' | 'cardio';

const FREE_WEIGHT = new Set(['barbell', 'dumbbell', 'kettlebell', 'ez-bar']);
const NO_LOAD_ACCESSORY = new Set(['resistance-band', 'medicine-ball', 'stability-ball', 'other']);

/**
 *  - cardio                              -> cardio (min)
 *  - stretching / isométrie / foam-roll  -> duration (chrono)
 *  - pliométrie (sauts/lancers)          -> reps  (sauf charge libre = load)
 *  - powerlifting / haltérophilie        -> load  (barre chargée)
 *  - sans matériel / poids du corps      -> reps
 *  - accessoire sans charge chiffrable   -> reps  (élastique, swiss/med ball, divers)
 *  - barre/haltères/kettlebell/machine   -> load
 */
export function deriveMeasureKind(category: string | null, force: string | null, equipmentId: string | null): MeasureKind {
  if (category === 'cardio') return 'cardio';
  if (category === 'stretching' || force === 'static' || equipmentId === 'foam-roller') return 'duration';
  if (category === 'plyometrics') return equipmentId && FREE_WEIGHT.has(equipmentId) ? 'load' : 'bodyweight';
  if (category === 'powerlifting' || category === 'olympic_weightlifting') return 'load';
  if (equipmentId === null || equipmentId === 'bodyweight') return 'bodyweight';
  if (NO_LOAD_ACCESSORY.has(equipmentId)) return 'bodyweight';
  return 'load';
}
