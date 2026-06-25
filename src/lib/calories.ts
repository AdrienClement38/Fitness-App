/**
 * Estimation des calories dépensées en séance — modèle METs (sourcé : Compendium of
 * Physical Activities 2024 ; anthropométrie de référence ESTEBAN / Santé publique France).
 *
 *   kcal ≈ MET(catégorie) × poids(kg) × durée(h)
 *
 * C'est une ESTIMATION MOYENNE (~±25 %), à présenter comme indicative — jamais un chiffre
 * exact. Elle ignore : l'intensité réelle (charge/tempo/RIR), la composition corporelle,
 * la TAILLE (non pertinente : le MET est déjà normalisé par kg) et l'afterburn (EPOC).
 * En muscu la durée inclut les temps de repos. Le sexe n'est pas un facteur direct : il
 * n'intervient que via le poids par défaut.
 */
import type {Gender, MeasureKind} from './api';
import type {WorkoutLog} from './workoutLogs';
import {durationMinutes} from './stats';

// MET par mode de saisie (le log ne conserve pas la catégorie fine). Valeurs vérifiées :
// renforcement (load / poids du corps) = 5 ; cardio = 7 ; tenue/isométrie (duration) ≈ 2.5.
const MET_BY_KIND: Record<MeasureKind, number> = {load: 5, bodyweight: 5, cardio: 7, duration: 2.5};

// Poids de référence réalistes (ESTEBAN, adultes France) quand l'utilisateur ne renseigne pas.
const REF_WEIGHT = {male: 80, female: 67, unknown: 75} as const;
export function defaultWeightKg(gender: Gender | null | undefined): number {
  return gender === 'female' ? REF_WEIGHT.female : gender === 'male' ? REF_WEIGHT.male : REF_WEIGHT.unknown;
}

const SECONDS_PER_REP = 3; // tempo moyen d'une répétition (concentrique + excentrique)
const DEFAULT_REST = 60; // repos par défaut si non prescrit (hors cardio continu)
const logDate = (l: WorkoutLog) => l.finishedIso ?? l.startedIso ?? '';

/** Durée d'une séance en minutes : chrono si disponible, sinon estimée depuis les séries faites. */
export function sessionMinutes(log: WorkoutLog): number {
  const chrono = durationMinutes(log);
  if (chrono != null && chrono > 0) return chrono;
  let sec = 0;
  for (const ex of log.exercises) {
    const rest = ex.kind === 'cardio' ? (ex.restSeconds ?? 0) : (ex.restSeconds ?? DEFAULT_REST);
    for (const s of ex.sets) {
      if (!s.done) continue;
      const work =
        ex.kind === 'cardio'
          ? (s.reps ?? 5) * 60 // reps = minutes
          : ex.kind === 'duration'
            ? (s.reps ?? 30) // reps = secondes tenues
            : (s.reps ?? 10) * SECONDS_PER_REP; // load / bodyweight
      sec += work + rest;
    }
  }
  return Math.round(sec / 60);
}

/** MET moyen d'une séance, pondéré par le nombre de séries faites de chaque exercice. */
function sessionMet(log: WorkoutLog): number {
  let sets = 0;
  let weighted = 0;
  for (const ex of log.exercises) {
    const done = ex.sets.filter((s) => s.done).length;
    if (!done) continue;
    weighted += MET_BY_KIND[ex.kind] * done;
    sets += done;
  }
  return sets ? weighted / sets : MET_BY_KIND.load;
}

/** Calories estimées d'une séance (kcal entiers). 0 si aucune série faite / durée nulle. */
export function sessionKcal(log: WorkoutLog, weightKg: number): number {
  const hours = sessionMinutes(log) / 60;
  if (hours <= 0) return 0;
  return Math.round(sessionMet(log) * weightKg * hours);
}

/** Somme des calories estimées sur les séances dont la date est >= `sinceIso`. */
export function kcalSince(logs: WorkoutLog[], sinceIso: string, weightKg: number): number {
  return logs.reduce((a, l) => (logDate(l) >= sinceIso ? a + sessionKcal(l, weightKg) : a), 0);
}

/** Début (lundi 00:00, heure locale) de la semaine courante, en ISO. */
export function startOfWeekIso(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Début (1er du mois 00:00, heure locale) du mois courant, en ISO. */
export function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
