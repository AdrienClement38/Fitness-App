/**
 * Géométrie de la courbe de progression. Verrouille le comportement « scroll
 * horizontal » : pleine largeur tant qu'il y a peu de points, puis canevas qui
 * s'élargit (et devient scrollable) pour pouvoir remonter dans le temps.
 */
import {describe, expect, it} from 'vitest';
import {lineLayout} from '../src/components/Charts';

describe('lineLayout', () => {
  it('reste en pleine largeur responsive sous ~8 points (pas de scroll)', () => {
    expect(lineLayout(2).scroll).toBe(false);
    expect(lineLayout(7).scroll).toBe(false);
    expect(lineLayout(7).W).toBe(320); // viewBox historique conservé
  });

  it('passe en mode scroll et élargit le canevas dès qu’il y a assez de points', () => {
    expect(lineLayout(8).scroll).toBe(true);
    expect(lineLayout(8).W).toBeGreaterThan(320);
  });

  it('la largeur croît avec le nombre de points (= profondeur d’historique navigable)', () => {
    expect(lineLayout(20).W).toBeGreaterThan(lineLayout(12).W);
    expect(lineLayout(40).innerW).toBe(39 * 48);
  });
});
