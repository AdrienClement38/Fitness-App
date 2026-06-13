/**
 * Records persistants + purge (logique pure, sans DB ni localStorage). Verrouille
 * les deux propriétés critiques : (1) la purge ne supprime QUE les séances trop
 * vieilles (jamais les non datées) ; (2) un record est all-time et ne baisse
 * jamais — il survit à la purge de la séance qui l'a établi.
 */
import {describe, expect, it} from 'vitest';
import {betterRecord, combineRecords, exerciseStats, foldRecords, partitionLogsByAge, type ExerciseRecord} from '../src/lib/stats';
import type {LoggedSet, WorkoutLog} from '../src/lib/workoutLogs';

const set = (weight: number | null, reps: number | null, done = true): LoggedSet => ({weight, reps, done});
const bench = (sets: LoggedSet[]) => ({
  exerciseId: 'bench', nameFr: 'Développé', nameEn: 'Bench', targetReps: '8', kind: 'load' as const, restSeconds: null, sets,
});
const log = (id: string, dateIso: string, exercises: WorkoutLog['exercises']): WorkoutLog => ({
  id, startedIso: dateIso, finishedIso: dateIso, programName: 'P', sessionName: 'S', exercises,
});

describe('partitionLogsByAge', () => {
  it('purge les séances avant le cutoff, garde les récentes et les non datées', () => {
    const logs: WorkoutLog[] = [
      log('recent', '2026-06-10T00:00:00.000Z', [bench([set(80, 5)])]),
      log('vieux', '2026-01-01T00:00:00.000Z', [bench([set(60, 5)])]),
      {...log('sansdate', '', [bench([set(50, 5)])]), startedIso: null, finishedIso: null},
    ];
    const {fresh, expired} = partitionLogsByAge(logs, '2026-03-15T00:00:00.000Z');
    expect(expired.map((l) => l.id)).toEqual(['vieux']);
    expect(fresh.map((l) => l.id).sort()).toEqual(['recent', 'sansdate']);
  });

  it('ne purge rien si tout est récent', () => {
    const logs = [log('a', '2026-06-10T00:00:00.000Z', [bench([set(80, 5)])])];
    expect(partitionLogsByAge(logs, '2026-03-15T00:00:00.000Z').expired).toHaveLength(0);
  });
});

describe('foldRecords (all-time, monotone)', () => {
  it('retient le meilleur même quand la séance qui l’a établi est purgée', () => {
    const pr = log('pr', '2026-01-01T00:00:00.000Z', [bench([set(100, 5)])]); // grosse perf, vieille -> sera purgée
    const recent = log('r', '2026-06-10T00:00:00.000Z', [bench([set(80, 5)])]); // reste dans l'historique
    const store = foldRecords({}, [pr], '2026-03-15T00:00:00.000Z'); // capturé au moment de la purge
    expect(store.bench.heaviest).toEqual({weight: 100, reps: 5});
    // L'affichage combine l'historique courant (récent only) + le store : le record reste 100, pas 80.
    const display = combineRecords(exerciseStats([recent]), Object.values(store));
    expect(display[0].heaviest).toEqual({weight: 100, reps: 5});
  });

  it('ne baisse jamais : replier une perf inférieure ne change pas le record', () => {
    const base = foldRecords({}, [log('a', '2026-01-01T00:00:00.000Z', [bench([set(100, 5)])])], 't1');
    const after = foldRecords(base, [log('b', '2026-02-01T00:00:00.000Z', [bench([set(70, 5)])])], 't2');
    expect(after.bench.heaviest).toEqual({weight: 100, reps: 5});
    expect(after.bench.best1RM).toBe(base.bench.best1RM);
  });

  it('idempotent sur les valeurs : replier deux fois la même séance ne change rien', () => {
    const once = foldRecords({}, [log('a', '2026-01-01T00:00:00.000Z', [bench([set(90, 6)])])], 't1');
    const twice = foldRecords(once, [log('a', '2026-01-01T00:00:00.000Z', [bench([set(90, 6)])])], 't2');
    expect(twice.bench.heaviest).toEqual(once.bench.heaviest);
    expect(twice.bench.best1RM).toBe(once.bench.best1RM);
  });

  it('ne capture pas une copie partagée de base (immuabilité)', () => {
    const base = foldRecords({}, [log('a', '2026-01-01T00:00:00.000Z', [bench([set(50, 5)])])], 't1');
    foldRecords(base, [log('b', '2026-02-01T00:00:00.000Z', [bench([set(120, 5)])])], 't2');
    expect(base.bench.heaviest).toEqual({weight: 50, reps: 5}); // base inchangé
  });
});

describe('betterRecord (fusion entre appareils)', () => {
  it('garde le plus lourd, le meilleur 1RM et la date la plus récente', () => {
    const a: ExerciseRecord = {exerciseId: 'x', name: 'X', kind: 'load', heaviest: {weight: 100, reps: 3}, best1RM: 110, bestValue: null, lastDateIso: '2026-05-01', updatedAt: 't1'};
    const b: ExerciseRecord = {exerciseId: 'x', name: 'X', kind: 'load', heaviest: {weight: 90, reps: 8}, best1RM: 113, bestValue: null, lastDateIso: '2026-06-01', updatedAt: 't2'};
    const m = betterRecord(a, b);
    expect(m.heaviest).toEqual({weight: 100, reps: 3});
    expect(m.best1RM).toBe(113);
    expect(m.lastDateIso).toBe('2026-06-01');
  });
});

describe('combineRecords', () => {
  it('trie par fréquence puis prend le meilleur record', () => {
    const stats = exerciseStats([
      log('1', '2026-06-01T00:00:00.000Z', [bench([set(80, 5)])]),
      log('2', '2026-06-02T00:00:00.000Z', [bench([set(82, 5)])]),
    ]);
    const display = combineRecords(stats, []);
    expect(display[0].exerciseId).toBe('bench');
    expect(display[0].sessions).toBe(2);
    expect(display[0].heaviest).toEqual({weight: 82, reps: 5});
  });
});
