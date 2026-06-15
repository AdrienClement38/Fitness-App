/** Garde anti-adresses jetables (anti-bots / abus du quota d'envoi). */
import {describe, it, expect} from 'vitest';
import {isDisposableEmail} from '../server/disposableEmails';

describe('isDisposableEmail', () => {
  it('repère les domaines jetables connus (insensible à la casse)', () => {
    expect(isDisposableEmail('bot@yopmail.com')).toBe(true);
    expect(isDisposableEmail('x@mailinator.com')).toBe(true);
    expect(isDisposableEmail('Test@GuerrillaMail.com')).toBe(true);
    expect(isDisposableEmail('a@10minutemail.com')).toBe(true);
  });

  it('laisse passer les fournisseurs légitimes', () => {
    expect(isDisposableEmail('adrien@gmail.com')).toBe(false);
    expect(isDisposableEmail('user@outlook.fr')).toBe(false);
    expect(isDisposableEmail('contact@ac-kinetik.app')).toBe(false);
  });

  it('gère les entrées dégénérées sans planter', () => {
    expect(isDisposableEmail('sans-arobase')).toBe(false);
    expect(isDisposableEmail('')).toBe(false);
    // domaine pris après le DERNIER @ (robustesse)
    expect(isDisposableEmail('a@b@yopmail.com')).toBe(true);
  });
});
