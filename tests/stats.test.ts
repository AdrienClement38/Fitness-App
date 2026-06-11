/**
 * Tests du module de stats (logique pure, sans DB ni localStorage). Verrouille
 * 1RM estimé, agrégation des records, progression et volume hebdomadaire.
 */
import {describe, expect, it} from 'vitest';
import {epley1RM, exerciseStats, progression, summary, weeklyVolume} from '../src/lib/stats';
import type {WorkoutLog} from '../src/lib/workoutLogs';

const set = (weight: number | null, reps: number | null, done = true) => ({weight, reps, done});
const bench = (sets: ReturnType<typeof set>[]) => ({
  exerciseId: 'bench', nameFr: 'Développé', nameEn: 'Bench', targetReps: '8', isTimed: false, sets,
});
const plank = (sets: ReturnType<typeof set>[]) => ({
  exerciseId: 'plank', nameFr: 'Gainage', nameEn: 'Plank', targetReps: '30', isTimed: true, sets,
});
const log = (id: string, dateIso: string, exercises: WorkoutLog['exercises']): WorkoutLog => ({
  id, startedIso: dateIso, finishedIso: dateIso, programName: 'P', sessionName: 'S', exercises,
});

// Historique newest-first, comme le store. 3 jeudis consécutifs = 3 semaines.
const history: WorkoutLog[] = [
  log('w3', '2026-06-11T18:00:00.000Z', [bench([set(70, 8), set(70, 6)]), plank([set(null, 45)])]),
  log('w2', '2026-06-04T18:00:00.000Z', [bench([set(65, 8)])]),
  log('w1', '2026-05-28T18:00:00.000Z', [bench([set(60, 8)]), plank([set(null, 30)])]),
];

describe('epley1RM', () => {
  it('vaut le poids pour 0 rep et applique la formule', () => {
    expect(epley1RM(100, 0)).toBe(100);
    expect(epley1RM(60, 10)).toBeCloseTo(80, 5);
  });
});

describe('exerciseStats', () => {
  const stats = exerciseStats(history);

  it('trie par nombre de séances décroissant', () => {
    expect(stats.map((s) => s.exerciseId)).toEqual(['bench', 'plank']);
    expect(stats[0].sessions).toBe(3);
    expect(stats[1].sessions).toBe(2);
  });

  it('record charge = série la plus lourde', () => {
    expect(stats[0].heaviest).toEqual({weight: 70, reps: 8});
    expect(stats[0].best1RM).toBeCloseTo(88.7, 1);
  });

  it('exo chronométré = record durée, pas de poids', () => {
    expect(stats[1].isTimed).toBe(true);
    expect(stats[1].bestDuration).toBe(45);
    expect(stats[1].heaviest).toBeNull();
  });

  it('ignore les séries non faites', () => {
    const partial = exerciseStats([log('x', '2026-06-11T18:00:00.000Z', [bench([set(200, 1, false)])])]);
    expect(partial).toHaveLength(0);
  });
});

describe('progression', () => {
  it('un point par séance, du plus ancien au plus récent (1RM estimé)', () => {
    const {points, timed} = progression(history, 'bench');
    expect(timed).toBe(false);
    expect(points.map((p) => p.value)).toEqual([76, 82.3, 88.7]);
  });

  it('exo chronométré : meilleure durée par séance', () => {
    const {points, timed} = progression(history, 'plank');
    expect(timed).toBe(true);
    expect(points.map((p) => p.value)).toEqual([30, 45]);
  });
});

describe('weeklyVolume & summary', () => {
  it('agrège le volume par semaine, du plus ancien au plus récent', () => {
    const wv = weeklyVolume(history);
    expect(wv).toHaveLength(3);
    expect(wv.map((w) => w.volume)).toEqual([480, 520, 980]);
  });

  it('résume séances et volume total', () => {
    const s = summary(history);
    expect(s.sessions).toBe(3);
    expect(s.totalVolume).toBe(1980);
  });
});
