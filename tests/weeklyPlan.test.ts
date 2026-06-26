/**
 * Tests du planning hebdo (logique pure). « now » injecté ; dates à midi UTC pour
 * rester robustes au fuseau. Index : 0 = lundi ... 6 = dimanche.
 */
import {describe, expect, it} from 'vitest';
import {nextPlanned, plannedCount, weekdayIndex, type PlanSlot, type WeekPlan} from '../src/lib/weeklyPlan';

const NOW = '2026-06-24T12:00:00.000Z'; // mercredi -> weekdayIndex 2
const slot = (name: string): PlanSlot => ({programId: 'p', programMine: false, programName: 'PPL', sessionName: name});
const empty: WeekPlan = [null, null, null, null, null, null, null];
const withAt = (...days: number[]): WeekPlan => {
  const p = empty.slice();
  for (const d of days) p[d] = slot(`S${d}`);
  return p;
};

describe('weekdayIndex (lundi=0..dimanche=6)', () => {
  it('lundi -> 0, mercredi -> 2, dimanche -> 6', () => {
    expect(weekdayIndex('2026-06-22T12:00:00.000Z')).toBe(0); // lundi
    expect(weekdayIndex('2026-06-24T12:00:00.000Z')).toBe(2); // mercredi
    expect(weekdayIndex('2026-06-28T12:00:00.000Z')).toBe(6); // dimanche
  });
});

describe('nextPlanned', () => {
  it('semaine vide -> null', () => {
    expect(nextPlanned(empty, NOW)).toBeNull();
  });

  it("une séance aujourd'hui (mercredi) -> isToday, inDays 0", () => {
    const n = nextPlanned(withAt(2), NOW);
    expect(n).toMatchObject({day: 2, isToday: true, inDays: 0});
  });

  it('une séance plus tard dans la semaine (vendredi) -> inDays 2', () => {
    const n = nextPlanned(withAt(4), NOW);
    expect(n).toMatchObject({day: 4, isToday: false, inDays: 2});
  });

  it('une séance déjà passée (lundi) -> boucle à la semaine suivante (inDays 5)', () => {
    const n = nextPlanned(withAt(0), NOW);
    expect(n).toMatchObject({day: 0, isToday: false, inDays: 5});
  });

  it('prend la plus proche à venir', () => {
    const n = nextPlanned(withAt(0, 3, 5), NOW); // lundi (passé), jeudi, samedi
    expect(n).toMatchObject({day: 3, inDays: 1}); // jeudi = demain
  });
});

describe('plannedCount', () => {
  it('compte les jours planifiés', () => {
    expect(plannedCount(empty)).toBe(0);
    expect(plannedCount(withAt(0, 2, 4))).toBe(3);
  });
});
