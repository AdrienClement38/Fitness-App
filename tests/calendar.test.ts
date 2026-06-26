/**
 * Tests du calendrier (logique pure). Les dates « jour » sont construites en LOCAL
 * (midi) pour rester robustes au fuseau : dayKey lit les composantes locales du même
 * instant, donc l'aller-retour est stable où que tourne le test.
 */
import {describe, expect, it} from 'vitest';
import {addMonths, dayKey, groupByDay, keyOf, monthGrid} from '../src/lib/calendar';
import type {WorkoutLog} from '../src/lib/workoutLogs';

const isoLocal = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0).toISOString();
const log = (id: string, finishedIso: string | null, startedIso: string | null = finishedIso): WorkoutLog => ({
  id, startedIso, finishedIso, programName: null, sessionName: 'S', exercises: [],
});

describe('dayKey / keyOf', () => {
  it('clé jour locale stable (aller-retour)', () => {
    expect(dayKey(isoLocal(2026, 6, 24))).toBe('2026-06-24');
    expect(dayKey(isoLocal(2026, 1, 3))).toBe('2026-01-03'); // zéro-padding
  });
  it('keyOf zéro-pad mois et jour', () => {
    expect(keyOf(2026, 0, 9)).toBe('2026-01-09'); // mois 0 = janvier
  });
});

describe('monthGrid', () => {
  it('juin 2026 (commence un lundi) : 5 semaines, 30 jours dans le mois', () => {
    const weeks = monthGrid(2026, 5); // mois 5 = juin
    expect(weeks.length).toBe(5);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0]).toMatchObject({year: 2026, month: 5, day: 1, inMonth: true});
    expect(weeks.flat().filter((c) => c.inMonth).length).toBe(30);
    expect(weeks[4][6]).toMatchObject({inMonth: false}); // débordement sur juillet
  });

  it('août 2026 (commence un samedi, 31 j) : 6 semaines', () => {
    const weeks = monthGrid(2026, 7);
    expect(weeks.length).toBe(6);
    expect(weeks.flat().filter((c) => c.inMonth).length).toBe(31);
  });
});

describe('addMonths', () => {
  it('avance / recule en bouclant l\'année', () => {
    expect(addMonths({year: 2026, month: 11}, 1)).toEqual({year: 2027, month: 0});
    expect(addMonths({year: 2026, month: 0}, -1)).toEqual({year: 2025, month: 11});
  });
});

describe('groupByDay', () => {
  it('regroupe plusieurs séances du même jour', () => {
    const m = groupByDay([log('a', isoLocal(2026, 6, 24, 9)), log('b', isoLocal(2026, 6, 24, 19))]);
    expect(m.size).toBe(1);
    expect(m.get('2026-06-24')?.length).toBe(2);
  });
  it('sépare des jours différents', () => {
    const m = groupByDay([log('a', isoLocal(2026, 6, 24)), log('b', isoLocal(2026, 6, 25))]);
    expect(m.size).toBe(2);
  });
  it('retombe sur startedIso si pas de finishedIso, ignore les séances sans date', () => {
    const m = groupByDay([log('a', null, isoLocal(2026, 6, 24)), log('b', null, null)]);
    expect(m.get('2026-06-24')?.length).toBe(1);
    expect(m.size).toBe(1);
  });
});
