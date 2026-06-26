/**
 * Tests de la surcharge progressive (logique pure). Verrouille la double progression :
 * haut de fourchette -> +charge ; dans la fourchette -> +1 rep ; sous -> vise le bas.
 */
import {describe, expect, it} from 'vitest';
import {overloadHint} from '../src/lib/overload';
import type {MeasureKind} from '../src/lib/api';
import type {LoggedExercise, LoggedSet, WorkoutLog} from '../src/lib/workoutLogs';

const set = (weight: number | null, reps: number | null, done = true): LoggedSet => ({weight, reps, done});
const ex = (id: string, kind: MeasureKind, targetReps: string, sets: LoggedSet[]): LoggedExercise => ({
  exerciseId: id, nameFr: id, nameEn: id, targetReps, kind, restSeconds: null, sets,
});
const log = (id: string, dateIso: string, exercises: LoggedExercise[]): WorkoutLog => ({
  id, startedIso: dateIso, finishedIso: dateIso, programName: null, sessionName: 'S', exercises,
});
const D = '2026-06-11T18:00:00.000Z';

describe('overloadHint — charge (double progression)', () => {
  it('haut de la fourchette atteint -> +2,5 kg, reps au bas', () => {
    const h = overloadHint('load', '8-12', [log('a', D, [ex('bench', 'load', '8-12', [set(50, 12)])])], 'bench');
    expect(h).toEqual({weight: 52.5, reps: 8, lastText: '50 kg × 12', text: '52.5 kg × 8'});
  });
  it('dans la fourchette -> meme charge, +1 rep', () => {
    const h = overloadHint('load', '8-12', [log('a', D, [ex('bench', 'load', '8-12', [set(50, 10)])])], 'bench');
    expect(h).toMatchObject({weight: 50, reps: 11, text: '50 kg × 11'});
  });
  it('sous la fourchette -> meme charge, vise le bas', () => {
    const h = overloadHint('load', '8-12', [log('a', D, [ex('bench', 'load', '8-12', [set(50, 6)])])], 'bench');
    expect(h).toMatchObject({weight: 50, reps: 8, text: '50 kg × 8'});
  });
  it('cible a un seul nombre : reps atteintes -> +charge', () => {
    const h = overloadHint('load', '8', [log('a', D, [ex('bench', 'load', '8', [set(50, 8)])])], 'bench');
    expect(h).toMatchObject({weight: 52.5, reps: 8});
  });
  it('garde la serie la plus lourde de la seance', () => {
    const h = overloadHint('load', '8-12', [log('a', D, [ex('bench', 'load', '8-12', [set(40, 12), set(50, 8), set(45, 10)])])], 'bench');
    expect(h).toMatchObject({lastText: '50 kg × 8', text: '50 kg × 9'}); // 50×8 = la plus lourde
  });
  it('prend la seance la PLUS recente (historique newest-first)', () => {
    const hist = [
      log('new', '2026-06-18T18:00:00.000Z', [ex('bench', 'load', '8-12', [set(60, 8)])]),
      log('old', '2026-06-11T18:00:00.000Z', [ex('bench', 'load', '8-12', [set(50, 12)])]),
    ];
    expect(overloadHint('load', '8-12', hist, 'bench')).toMatchObject({text: '60 kg × 9'});
  });
  it('ignore les series non faites', () => {
    const h = overloadHint('load', '8-12', [log('a', D, [ex('bench', 'load', '8-12', [set(100, 1, false), set(50, 10)])])], 'bench');
    expect(h).toMatchObject({lastText: '50 kg × 10', text: '50 kg × 11'});
  });
});

describe('overloadHint — autres modes & cas vides', () => {
  it('poids du corps -> +1 rep', () => {
    const h = overloadHint('bodyweight', '10-20', [log('a', D, [ex('pushups', 'bodyweight', '10-20', [set(null, 18)])])], 'pushups');
    expect(h).toEqual({weight: null, reps: 19, lastText: '18 reps', text: '19 reps'});
  });
  it('duree -> +5 s', () => {
    const h = overloadHint('duration', '30', [log('a', D, [ex('plank', 'duration', '30', [set(null, 45)])])], 'plank');
    expect(h).toMatchObject({weight: null, reps: 50, text: '50 s'});
  });
  it('aucun historique -> null', () => {
    expect(overloadHint('load', '8', [], 'bench')).toBeNull();
    expect(overloadHint('load', '8', [log('a', D, [ex('squat', 'load', '8', [set(80, 5)])])], 'bench')).toBeNull();
  });
});
