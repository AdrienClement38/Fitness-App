/**
 * Tests du module calories (logique pure, sans DB ni localStorage) : metrique
 * dominante, duree (chrono OU estimee depuis les series), formule kcal, agregats.
 */
import {describe, expect, it} from 'vitest';
import {
  defaultWeightKg,
  dominantMetric,
  kcalSince,
  sessionKcal,
  sessionMinutes,
  totalMinutes,
  weeklyMinutes,
  sessionSeconds,
} from '../src/lib/calories';
import type {LoggedExercise, LoggedSet, WorkoutLog} from '../src/lib/workoutLogs';

const set = (weight: number | null, reps: number | null, done = true): LoggedSet => ({weight, reps, done});

const loadEx = (sets: LoggedSet[], restSeconds: number | null = null): LoggedExercise => ({
  exerciseId: 'bench', nameFr: 'Développé', nameEn: 'Bench', targetReps: '8', kind: 'load', restSeconds, sets,
});
const cardioEx = (minutes: number, restSeconds: number | null = null): LoggedExercise => ({
  exerciseId: 'bike', nameFr: 'Vélo', nameEn: 'Bike', targetReps: '20', kind: 'cardio', restSeconds, sets: [set(null, minutes)],
});
const bwEx = (reps: number): LoggedExercise => ({
  exerciseId: 'pushups', nameFr: 'Pompes', nameEn: 'Pushups', targetReps: '10', kind: 'bodyweight', restSeconds: null, sets: [set(null, reps)],
});

// started === finished -> durationMinutes() = null -> on force le chemin ESTIMATION.
const logEst = (id: string, dateIso: string, exercises: LoggedExercise[]): WorkoutLog => ({
  id, startedIso: dateIso, finishedIso: dateIso, programName: null, sessionName: 'S', exercises,
});
// started != finished -> chrono utilise.
const logChrono = (id: string, startIso: string, endIso: string, exercises: LoggedExercise[]): WorkoutLog => ({
  id, startedIso: startIso, finishedIso: endIso, programName: null, sessionName: 'S', exercises,
});

describe('defaultWeightKg', () => {
  it('poids de reference par sexe (refs ESTEBAN)', () => {
    expect(defaultWeightKg('male')).toBe(80);
    expect(defaultWeightKg('female')).toBe(67);
    expect(defaultWeightKg(null)).toBe(75);
    expect(defaultWeightKg(undefined)).toBe(75);
  });
});

describe('dominantMetric', () => {
  it('charge dominante -> volume', () => {
    expect(dominantMetric([logEst('a', '2026-06-11T18:00:00.000Z', [loadEx([set(60, 8), set(60, 8)])])])).toBe('volume');
  });
  it('chrono dominant -> time', () => {
    expect(dominantMetric([logEst('a', '2026-06-11T18:00:00.000Z', [cardioEx(20), cardioEx(15)])])).toBe('time');
  });
  it('mixte avec plus de chrono que de charge -> time', () => {
    expect(dominantMetric([logEst('a', '2026-06-11T18:00:00.000Z', [loadEx([set(60, 8)]), cardioEx(20), cardioEx(20)])])).toBe('time');
  });
  it('poids du corps (ni chrono ni charge) ne tranche pas -> defaut volume', () => {
    expect(dominantMetric([logEst('a', '2026-06-11T18:00:00.000Z', [bwEx(20), bwEx(15)])])).toBe('volume');
  });
  it('historique vide -> volume', () => {
    expect(dominantMetric([])).toBe('volume');
  });
});

describe('sessionMinutes', () => {
  it('utilise le chrono quand il est disponible (ignore l\'estimation)', () => {
    const l = logChrono('c', '2026-06-11T18:00:00.000Z', '2026-06-11T18:45:00.000Z', [loadEx([set(60, 8)])]);
    expect(sessionMinutes(l)).toBe(45);
  });
  it('estime le cardio depuis les minutes loggees (reps = minutes)', () => {
    // pas de chrono -> 20 min d\'effort + 0 repos (cardio continu) = 20 min
    expect(sessionMinutes(logEst('e', '2026-06-11T18:00:00.000Z', [cardioEx(20)]))).toBe(20);
  });
  it('estime la muscu depuis les series (effort 3 s/rep + repos prescrit)', () => {
    // 2 series x (8 reps x 3 s + 60 s repos) = 2 x 84 s = 168 s ~ 3 min
    expect(sessionMinutes(logEst('m', '2026-06-11T18:00:00.000Z', [loadEx([set(60, 8), set(60, 8)], 60)]))).toBe(3);
  });
  it('0 si aucune serie faite', () => {
    expect(sessionMinutes(logEst('z', '2026-06-11T18:00:00.000Z', [loadEx([set(60, 8, false)], 60)]))).toBe(0);
  });
});

describe('sessionKcal', () => {
  it('formule MET x poids x duree : 1 h de muscu (MET 5) a 80 kg = 400 kcal', () => {
    const l = logChrono('k', '2026-06-11T18:00:00.000Z', '2026-06-11T19:00:00.000Z', [loadEx([set(60, 8)])]);
    expect(sessionKcal(l, 80)).toBe(400);
  });
  it('cardio estime 20 min (MET 7) a 60 kg = 140 kcal', () => {
    // 7 x 60 x (20/60) = 140
    expect(sessionKcal(logEst('k2', '2026-06-11T18:00:00.000Z', [cardioEx(20)]), 60)).toBe(140);
  });
  it('0 kcal si aucune serie faite', () => {
    expect(sessionKcal(logEst('k3', '2026-06-11T18:00:00.000Z', [loadEx([set(60, 8, false)])]), 80)).toBe(0);
  });
});

describe('totalMinutes & weeklyMinutes & kcalSince', () => {
  // 2 seances meme semaine (20 + 20) + 1 la semaine d'avant (30). Cardio -> minutes exactes.
  const history: WorkoutLog[] = [
    logEst('w3', '2026-06-11T18:00:00.000Z', [cardioEx(20)]),
    logEst('w2', '2026-06-09T18:00:00.000Z', [cardioEx(20)]),
    logEst('w1', '2026-06-04T18:00:00.000Z', [cardioEx(30)]),
  ];

  it('totalMinutes = somme des durees', () => {
    expect(totalMinutes(history)).toBe(70);
  });
  it('weeklyMinutes agrege par semaine, du plus ancien au plus recent', () => {
    expect(weeklyMinutes(history).map((w) => w.minutes)).toEqual([30, 40]);
  });
  it('kcalSince ne compte que les seances >= date donnee', () => {
    // a 60 kg : seances du 09 et 11 (cardio 20 min, MET 7) = 140 + 140 = 280 kcal
    expect(kcalSince(history, '2026-06-08T00:00:00.000Z', 60)).toBe(280);
  });
});

describe('sessionSeconds & short duration calculations', () => {
  it('calcule la duree exacte en secondes quand le chrono est de quelques secondes', () => {
    // Séance de 5 secondes
    const l = logChrono('short', '2026-06-11T18:00:00.000Z', '2026-06-11T18:00:05.000Z', [loadEx([set(70, 10)])]);
    expect(sessionSeconds(l)).toBe(5);
    // Les minutes renvoient 0 (Math.round(5/60))
    expect(sessionMinutes(l)).toBe(0);
    // Calories : 5 MET * 80 kg * (5 / 3600 heures) = 0.55 kcal, arrondi à 1 kcal
    expect(sessionKcal(l, 80)).toBe(1);
  });
});

