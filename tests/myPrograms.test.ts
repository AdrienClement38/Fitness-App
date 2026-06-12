/**
 * addExerciseToSession : ajoute un exercice à une séance d'un programme perso,
 * avec les défauts de prescription selon le mode de saisie. Le store tourne
 * en mémoire dans les tests (localStorage absent → try/catch silencieux).
 */
import {describe, it, expect} from 'vitest';
import {addExerciseToSession, createEmptyProgram, getMyProgram, type AddableExercise} from '../src/lib/myPrograms';

const BENCH: AddableExercise = {
  id: 'bench-press',
  nameFr: 'Développé couché',
  nameEn: 'Bench Press',
  force: 'push',
  category: 'strength',
  equipmentId: 'barbell',
};

describe('addExerciseToSession', () => {
  it('ajoute en fin de séance avec les défauts « load »', () => {
    const id = createEmptyProgram('Test load');
    const sessionName = addExerciseToSession(id, 0, BENCH);
    expect(sessionName).toBe('Séance 1');

    const sess = getMyProgram(id)!.sessions[0];
    expect(sess.exercises).toHaveLength(1);
    const e = sess.exercises[0];
    expect(e.exerciseId).toBe('bench-press');
    expect(e.nameFr).toBe('Développé couché');
    expect(e.nameEn).toBe('Bench Press');
    expect(e).toMatchObject({sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90, notesFr: null});
  });

  it('applique les défauts « cardio » (sets 1, repos 0)', () => {
    const id = createEmptyProgram('Test cardio');
    addExerciseToSession(id, 0, {...BENCH, id: 'run', category: 'cardio', equipmentId: null});
    const e = getMyProgram(id)!.sessions[0].exercises[0];
    expect(e).toMatchObject({sets: 1, repsMin: 15, repsMax: 20, restSeconds: 0});
  });

  it('applique les défauts « bodyweight »', () => {
    const id = createEmptyProgram('Test pdc');
    addExerciseToSession(id, 0, {...BENCH, id: 'pushup', force: null, equipmentId: 'bodyweight'});
    const e = getMyProgram(id)!.sessions[0].exercises[0];
    expect(e).toMatchObject({sets: 3, repsMin: 10, repsMax: 15, restSeconds: 60});
  });

  it('ajoute à la suite sans écraser (ordre = ordre du tableau)', () => {
    const id = createEmptyProgram('Test ordre');
    addExerciseToSession(id, 0, BENCH);
    addExerciseToSession(id, 0, {...BENCH, id: 'squat', nameFr: 'Squat'});
    const ids = getMyProgram(id)!.sessions[0].exercises.map((e) => e.exerciseId);
    expect(ids).toEqual(['bench-press', 'squat']);
  });

  it('retourne null si le programme ou l’index de séance est introuvable', () => {
    expect(addExerciseToSession('inconnu', 0, BENCH)).toBeNull();
    const id = createEmptyProgram('Test borne');
    expect(addExerciseToSession(id, 5, BENCH)).toBeNull(); // hors borne
    expect(getMyProgram(id)!.sessions[0].exercises).toHaveLength(0); // rien ajouté
  });
});
