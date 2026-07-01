/**
 * Tests des trophées (logique pure) : contributions par séance, cumul à vie DÉDUPLIQUÉ
 * (report par séance + logs courants), paliers, progression plancher, formats FR.
 */
import {describe, expect, it} from 'vitest';
import {achievements, isRealSession, lifetimeTotals, logCardioMinutes, logTonnageKg, sumContribution, type CarryEntries} from '../src/lib/achievements';
import type {MeasureKind} from '../src/lib/api';
import type {LoggedExercise, LoggedSet, WorkoutLog} from '../src/lib/workoutLogs';

const NB = String.fromCharCode(32); // séparateur de milliers (espace)
const set = (weight: number | null, reps: number | null, done = true): LoggedSet => ({weight, reps, done});
const ex = (kind: MeasureKind, sets: LoggedSet[]): LoggedExercise => ({exerciseId: 'x', nameFr: 'x', nameEn: 'x', targetReps: '', kind, restSeconds: null, sets});
const log = (id: string, exercises: LoggedExercise[]): WorkoutLog => ({id, startedIso: '2026-01-01', finishedIso: '2026-01-01', programName: null, sessionName: 's', exercises});

describe('contributions par séance', () => {
  it('tonnage = somme poids×reps des séries FAITES', () => {
    expect(logTonnageKg(log('l', [ex('load', [set(50, 10), set(50, 8), set(60, 5, false)])]))).toBe(900);
  });

  it('cardio = minutes des séries cardio faites (reps = minutes), autres kinds ignorés', () => {
    expect(logCardioMinutes(log('l', [ex('cardio', [set(null, 20), set(null, 15), set(null, 30, false)]), ex('load', [set(40, 10)])]))).toBe(35);
  });

  it('isRealSession : vrai si au moins une série faite', () => {
    expect(isRealSession(log('l', [ex('load', [set(40, 10)])]))).toBe(true);
    expect(isRealSession(log('l', [ex('load', [set(40, 10, false)])]))).toBe(false);
  });

  it('sumContribution : agrège, saute les séances sans série faite', () => {
    const c = sumContribution([log('a', [ex('load', [set(100, 10)])]), log('b', [ex('cardio', [set(null, 30)])]), log('c', [ex('load', [set(50, 10, false)])])]);
    expect(c).toEqual({tonnageKg: 1000, cardioMin: 30, sessions: 2});
  });
});

describe('lifetimeTotals : report (par séance) + logs courants, dédupliqués par id', () => {
  it('additionne le report et les séances courantes', () => {
    const carry: CarryEntries = {a: {tonnageKg: 1000, cardioMin: 30}, b: {tonnageKg: 500, cardioMin: 0}};
    const totals = lifetimeTotals([log('c', [ex('load', [set(100, 10)])])], carry);
    expect(totals).toEqual({tonnageKg: 2500, cardioMin: 30, sessions: 3});
  });

  it('déduplique : une séance présente dans le report ET en live n’est comptée qu’une fois (report prioritaire)', () => {
    const carry: CarryEntries = {a: {tonnageKg: 900, cardioMin: 0}};
    // La séance 'a' est encore dans les logs courants (report arrivé avant la suppression) : pas de double-comptage.
    const totals = lifetimeTotals([log('a', [ex('load', [set(100, 10)])])], carry);
    expect(totals).toEqual({tonnageKg: 900, cardioMin: 0, sessions: 1});
  });

  it('report vide : totaux = séances courantes', () => {
    expect(lifetimeTotals([log('a', [ex('load', [set(60, 10)])])], {})).toEqual({tonnageKg: 600, cardioMin: 0, sessions: 1});
  });
});

describe('achievements — paliers', () => {
  it('100 T de fonte : paliers ≤ atteints, prochain = 500 T, progression', () => {
    const [fonte] = achievements({tonnageKg: 100_000, cardioMin: 0, sessions: 0});
    expect(fonte.key).toBe('tonnage');
    expect(fonte.totalLabel).toBe('100 T');
    expect(fonte.tiers.map((t) => t.reached)).toEqual([true, true, true, false, false, false, false, false]);
    expect(fonte.tiers[3].isNext).toBe(true); // 500 000 (500 T)
    expect(fonte.nextLabel).toBe('500 T');
    expect(fonte.pct).toBe(20); // 100/500
  });

  it('zéro : rien atteint, premier palier « en cours », 0 %', () => {
    const [fonte] = achievements({tonnageKg: 0, cardioMin: 0, sessions: 0});
    expect(fonte.tiers.some((t) => t.reached)).toBe(false);
    expect(fonte.tiers[0].isNext).toBe(true);
    expect(fonte.nextLabel).toBe('10 T');
    expect(fonte.pct).toBe(0);
  });

  it('tout atteint : plus de prochain palier, 100 %', () => {
    const [fonte] = achievements({tonnageKg: 30_000_000, cardioMin: 0, sessions: 0});
    expect(fonte.tiers.every((t) => t.reached)).toBe(true);
    expect(fonte.nextLabel).toBeNull();
    expect(fonte.pct).toBe(100);
    expect(fonte.targetLabel).toBe(`25${NB}000 T`);
  });

  it('barre : jamais 100 % tant que le palier n’est pas atteint (9 950 kg -> 99 %)', () => {
    const [fonte] = achievements({tonnageKg: 9_950, cardioMin: 0, sessions: 0});
    expect(fonte.pct).toBe(99);
    expect(fonte.tiers[0].reached).toBe(false); // 10 000 (10 T) pas atteint
  });

  it('total tronqué (jamais surestimé) : 500 kg -> « 0,5 T », 9 999 kg -> « 9,9 T » (pas « 10 T »)', () => {
    expect(achievements({tonnageKg: 500, cardioMin: 0, sessions: 0})[0].totalLabel).toBe('0,5 T');
    expect(achievements({tonnageKg: 9_999, cardioMin: 0, sessions: 0})[0].totalLabel).toBe('9,9 T');
  });

  it('formats : heures et grands nombres (espace insécable milliers)', () => {
    const cats = achievements({tonnageKg: 25_000_000, cardioMin: 30_000, sessions: 1000});
    expect(cats[0].totalLabel).toBe(`25${NB}000 T`);
    expect(cats[1].totalLabel).toBe('500 h'); // 30000 min / 60
    expect(cats[2].totalLabel).toBe(`1${NB}000`);
  });
});
