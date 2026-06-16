/**
 * Isolation des données entre comptes (même appareil) : clearLocalData() doit purger
 * les collections synchronisées (séances, programmes perso, favoris, records) pour
 * qu'un compte supprimé/quitté ne laisse jamais ses données réapparaître sous un autre.
 * En test (env node), localStorage est absent -> les stores tournent en mémoire, ce qui
 * suffit pour valider le mécanisme de purge.
 */
import {describe, it, expect} from 'vitest';
import '../src/lib/syncCollections'; // enregistre TOUTES les collections (purge complète)
import {clearLocalData} from '../src/lib/sync';
import {createEmptyProgram, getMyProgram} from '../src/lib/myPrograms';
import {finishActive, lastWeight, startQuickSession, updateActive, type QuickExercise} from '../src/lib/workoutLogs';

const SQUAT: QuickExercise = {id: 'squat', nameFr: 'Squat', nameEn: 'Squat', force: 'push', category: 'strength', equipmentId: 'barbell'};

describe('clearLocalData — isolation des données entre comptes', () => {
  it('purge les programmes perso', () => {
    const id = createEmptyProgram('Mon prog');
    expect(getMyProgram(id)).toBeDefined();

    clearLocalData();

    expect(getMyProgram(id)).toBeUndefined();
  });

  it("purge l'historique des séances (et le pré-remplissage de poids)", () => {
    startQuickSession(SQUAT);
    updateActive((d) => {
      d.exercises[0].sets[0].weight = 100;
      d.exercises[0].sets[0].done = true;
    });
    finishActive();
    expect(lastWeight('squat')).toBe(100);

    clearLocalData();

    expect(lastWeight('squat')).toBeNull();
  });
});
