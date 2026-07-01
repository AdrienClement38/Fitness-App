/**
 * Tests de la calculette de disques (logique pure). Verrouille le glouton, le poids
 * réellement atteint, et les cas limites (barre seule, plus léger que la barre, non exact).
 */
import {describe, expect, it} from 'vitest';
import {groupPlates, platesForWeight, STANDARD_PLATES, usesPlateLoadedBar} from '../src/lib/plates';

describe('platesForWeight — décomposition standard (barre 20)', () => {
  it('80 kg → 25 + 5 par côté, atteint 80', () => {
    const b = platesForWeight(80, 20);
    expect(b.perSide).toEqual([25, 5]);
    expect(b.achieved).toBe(80);
    expect(b.approx).toBe(false);
    expect(b.belowBar).toBe(false);
  });

  it('100 kg → 25 + 15 par côté (glouton : le plus lourd d’abord)', () => {
    expect(platesForWeight(100, 20).perSide).toEqual([25, 15]);
  });

  it('60 kg → 20 par côté', () => {
    expect(platesForWeight(60, 20).perSide).toEqual([20]);
  });

  it('140 kg → 25 + 25 + 10 par côté', () => {
    const b = platesForWeight(140, 20);
    expect(b.perSide).toEqual([25, 25, 10]);
    expect(b.achieved).toBe(140);
  });

  it('utilise les fractions 2,5 et 1,25 (82,5 exact)', () => {
    const b = platesForWeight(82.5, 20);
    expect(b.perSide).toEqual([25, 5, 1.25]);
    expect(b.achieved).toBe(82.5);
    expect(b.approx).toBe(false);
  });
});

describe('platesForWeight — cas limites', () => {
  it('poids = barre → barre seule, pas de disque, exact', () => {
    const b = platesForWeight(20, 20);
    expect(b.perSide).toEqual([]);
    expect(b.achieved).toBe(20);
    expect(b.approx).toBe(false);
    expect(b.belowBar).toBe(false);
  });

  it('poids < barre → belowBar, atteint = barre', () => {
    const b = platesForWeight(15, 20);
    expect(b.belowBar).toBe(true);
    expect(b.perSide).toEqual([]);
    expect(b.achieved).toBe(20);
  });

  it('poids non atteignable → au plus proche en dessous + approx', () => {
    // 81 kg → 30,5/côté → 25 + 5 = 30 → 80 atteint (0,5 non chargeable)
    const b = platesForWeight(81, 20);
    expect(b.perSide).toEqual([25, 5]);
    expect(b.achieved).toBe(80);
    expect(b.approx).toBe(true);
    expect(b.requested).toBe(81);
  });

  it('juste au-dessus de la barre, aucun disque ne rentre → barre seule + approx', () => {
    const b = platesForWeight(21, 20);
    expect(b.perSide).toEqual([]);
    expect(b.achieved).toBe(20);
    expect(b.approx).toBe(true);
  });
});

describe('platesForWeight — robustesse (entrées aberrantes, jamais de crash)', () => {
  it('poids négatif → belowBar sans approx (pas d’incohérence)', () => {
    const b = platesForWeight(-50, 20);
    expect(b).toMatchObject({perSide: [], achieved: 20, belowBar: true, approx: false});
  });

  it('0 → belowBar sans approx', () => {
    expect(platesForWeight(0, 20)).toMatchObject({perSide: [], belowBar: true, approx: false});
  });

  it('Infinity → résultat sûr, aucune boucle infinie', () => {
    expect(() => platesForWeight(Infinity, 20)).not.toThrow();
    expect(platesForWeight(Infinity, 20)).toMatchObject({perSide: [], belowBar: true});
  });

  it('NaN → résultat sûr', () => {
    expect(() => platesForWeight(NaN, 20)).not.toThrow();
    expect(platesForWeight(NaN, 20).belowBar).toBe(true);
  });

  it('poids gigantesque fini (1e308) → borné, atteint fini, aucun crash', () => {
    expect(() => platesForWeight(1e308, 20)).not.toThrow();
    const b = platesForWeight(1e308, 20);
    expect(Number.isFinite(b.achieved)).toBe(true);
    expect(b.perSide.length).toBeGreaterThan(0);
  });
});

describe('usesPlateLoadedBar — barre libre chargée de disques', () => {
  it('barre droite → oui', () => {
    expect(usesPlateLoadedBar({equipmentId: 'barbell', nameEn: 'Barbell Squat'})).toBe(true);
  });
  it('barre EZ → oui (barre libre non guidée)', () => {
    expect(usesPlateLoadedBar({equipmentId: 'ez-bar', nameEn: 'EZ-Bar Curl'})).toBe(true);
  });
  it('Smith machine taguée barbell → NON (guidée)', () => {
    expect(usesPlateLoadedBar({equipmentId: 'barbell', nameEn: 'Smith Incline Shoulder Raise'})).toBe(false);
  });
  it('machine / haltère / poulie / non renseigné → non', () => {
    expect(usesPlateLoadedBar({equipmentId: 'machine', nameEn: 'Leg Press'})).toBe(false);
    expect(usesPlateLoadedBar({equipmentId: 'dumbbell', nameEn: 'Dumbbell Curl'})).toBe(false);
    expect(usesPlateLoadedBar({equipmentId: 'cable', nameEn: 'Cable Row'})).toBe(false);
    expect(usesPlateLoadedBar({equipmentId: null, nameEn: 'Push-up'})).toBe(false);
    expect(usesPlateLoadedBar({})).toBe(false);
  });
});

describe('platesForWeight — autres barres', () => {
  it('barre 15 : 55 kg → 20 par côté', () => {
    const b = platesForWeight(55, 15);
    expect(b.perSide).toEqual([20]);
    expect(b.achieved).toBe(55);
  });

  it('barre 10 : 40 kg → 15 par côté', () => {
    const b = platesForWeight(40, 10);
    expect(b.perSide).toEqual([15]);
    expect(b.achieved).toBe(40);
  });
});

describe('groupPlates', () => {
  it('regroupe les disques consécutifs identiques', () => {
    expect(groupPlates([25, 25, 10, 5])).toEqual([
      {plate: 25, count: 2},
      {plate: 10, count: 1},
      {plate: 5, count: 1},
    ]);
  });

  it('liste vide → aucun groupe', () => {
    expect(groupPlates([])).toEqual([]);
  });
});

describe('STANDARD_PLATES', () => {
  it('est trié du plus lourd au plus léger (invariant du glouton)', () => {
    const sorted = [...STANDARD_PLATES].sort((a, b) => b - a);
    expect([...STANDARD_PLATES]).toEqual(sorted);
  });
});
