/**
 * Tests du module de stats (logique pure, sans DB ni localStorage). Verrouille
 * 1RM estimé, agrégation des records, progression et volume hebdomadaire.
 */
import {describe, expect, it} from 'vitest';
import {avgRestSeconds, durationMinutes, epley1RM, exerciseStats, progression, summary, weeklyVolume} from '../src/lib/stats';
import type {LoggedSet, WorkoutLog} from '../src/lib/workoutLogs';

const set = (weight: number | null, reps: number | null, done = true): LoggedSet => ({weight, reps, done});
const bench = (sets: LoggedSet[]) => ({
  exerciseId: 'bench', nameFr: 'Développé', nameEn: 'Bench', targetReps: '8', kind: 'load' as const, restSeconds: null, sets,
});
const plank = (sets: LoggedSet[]) => ({
  exerciseId: 'plank', nameFr: 'Gainage', nameEn: 'Plank', targetReps: '30', kind: 'duration' as const, restSeconds: null, sets,
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
    expect(stats[1].kind).toBe('duration');
    expect(stats[1].bestValue).toBe(45);
    expect(stats[1].heaviest).toBeNull();
  });

  it('ignore les séries non faites', () => {
    const partial = exerciseStats([log('x', '2026-06-11T18:00:00.000Z', [bench([set(200, 1, false)])])]);
    expect(partial).toHaveLength(0);
  });
});

describe('progression', () => {
  it('un point par séance, du plus ancien au plus récent (1RM estimé)', () => {
    const {points, kind} = progression(history, 'bench');
    expect(kind).toBe('load');
    expect(points.map((p) => p.value)).toEqual([76, 82.3, 88.7]);
  });

  it('exo chronométré : meilleure durée par séance', () => {
    const {points, kind} = progression(history, 'plank');
    expect(kind).toBe('duration');
    expect(points.map((p) => p.value)).toEqual([30, 45]);
  });
});

describe('mode poids du corps (bodyweight)', () => {
  const bw = (sets: LoggedSet[]) => ({
    exerciseId: 'pushups', nameFr: 'Pompes', nameEn: 'Pushups', targetReps: '10', kind: 'bodyweight' as const, restSeconds: null, sets,
  });
  const h: WorkoutLog[] = [
    log('p2', '2026-06-11T18:00:00.000Z', [bw([set(null, 20), set(null, 18)])]),
    log('p1', '2026-06-04T18:00:00.000Z', [bw([set(null, 15)])]),
  ];

  it('record = meilleur nombre de reps, sans poids ni 1RM', () => {
    const st = exerciseStats(h)[0];
    expect(st.kind).toBe('bodyweight');
    expect(st.bestValue).toBe(20);
    expect(st.heaviest).toBeNull();
    expect(st.best1RM).toBeNull();
  });

  it('progression = max reps par séance', () => {
    const {points, kind} = progression(h, 'pushups');
    expect(kind).toBe('bodyweight');
    expect(points.map((p) => p.value)).toEqual([15, 20]);
  });
});

describe('durée de séance & repos mesuré', () => {
  it('durée en minutes (arrondie) et repos moyen pris', () => {
    const l: WorkoutLog = {
      id: 'd1',
      startedIso: '2026-06-11T18:00:00.000Z',
      finishedIso: '2026-06-11T18:40:30.000Z',
      programName: null,
      sessionName: 'S',
      exercises: [bench([{...set(60, 8), restTakenSeconds: 60}, {...set(60, 8), restTakenSeconds: 90}, set(60, 8)])],
    };
    expect(durationMinutes(l)).toBe(41); // 40 min 30 s arrondi
    expect(avgRestSeconds(l)).toBe(75); // (60+90)/2, la série sans mesure est ignorée
  });

  it('null si durée nulle ou repos jamais mesuré', () => {
    const l = log('d2', '2026-06-11T18:00:00.000Z', [bench([set(60, 8)])]);
    expect(durationMinutes(l)).toBe(null); // started === finished
    expect(avgRestSeconds(l)).toBe(null);
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
