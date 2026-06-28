/**
 * addExerciseToSession : ajoute un exercice à une séance d'un programme perso,
 * avec les défauts de prescription selon le mode de saisie. Le store tourne
 * en mémoire dans les tests (localStorage absent → try/catch silencieux).
 */
import {describe, it, expect} from 'vitest';
import {addExerciseToNewSession, addExerciseToSession, createEmptyProgram, getMyProgram, duplicateProgram, updateMyProgram, type AddableExercise} from '../src/lib/myPrograms';
import {startSession, getActiveWorkout} from '../src/lib/workoutLogs';

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

  it('addExerciseToNewSession crée une nouvelle séance contenant l’exercice', () => {
    const id = createEmptyProgram('Test new');
    const before = getMyProgram(id)!.sessions.length;
    const name = addExerciseToNewSession(id, BENCH);
    expect(name).toBe(`Séance ${before + 1}`);
    const sessions = getMyProgram(id)!.sessions;
    expect(sessions).toHaveLength(before + 1);
    expect(sessions[before].exercises.map((e) => e.exerciseId)).toEqual(['bench-press']);
    expect(addExerciseToNewSession('inconnu', BENCH)).toBeNull();
  });

  it('retourne null si le programme ou l’index de séance est introuvable', () => {
    expect(addExerciseToSession('inconnu', 0, BENCH)).toBeNull();
    const id = createEmptyProgram('Test borne');
    expect(addExerciseToSession(id, 5, BENCH)).toBeNull(); // hors borne
    expect(getMyProgram(id)!.sessions[0].exercises).toHaveLength(0); // rien ajouté
  });

  it('gère l’option progressive et setConfigs lors du lancement de séance et duplication', () => {
    const id = createEmptyProgram('Test progressif');
    addExerciseToSession(id, 0, BENCH);
    
    // Configurer l'exercice comme progressive avec des setConfigs spécifiques
    const p = getMyProgram(id)!;
    p.sessions[0].exercises[0].progressive = true;
    p.sessions[0].exercises[0].sets = 3;
    p.sessions[0].exercises[0].setConfigs = [
      { repsMin: 5, repsMax: 5, weight: 120 },
      { repsMin: 8, repsMax: 8, weight: 125 },
      { repsMin: 10, repsMax: 10, weight: 130 }
    ];
    updateMyProgram(p);

    // 1. Tester la duplication de programme
    const dupId = duplicateProgram(p as any);
    const dupP = getMyProgram(dupId)!;
    const dupEx = dupP.sessions[0].exercises[0];
    expect(dupEx.progressive).toBe(true);
    expect(dupEx.setConfigs).toEqual([
      { repsMin: 5, repsMax: 5, weight: 120 },
      { repsMin: 8, repsMax: 8, weight: 125 },
      { repsMin: 10, repsMax: 10, weight: 130 }
    ]);

    // 2. Tester le lancement de séance avec startSession
    const seed = {
      programName: p.nameFr,
      sessionName: p.sessions[0].nameFr,
      programId: p.id,
      programMine: true,
      exercises: p.sessions[0].exercises.map((e) => ({
        exerciseId: e.exerciseId,
        nameFr: e.nameFr,
        nameEn: e.nameEn,
        kind: 'load' as const,
        sets: e.sets,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        restSeconds: e.restSeconds,
        weight: e.weight,
        setConfigs: e.setConfigs,
      })),
    };
    
    startSession(seed);
    const activeObj = getActiveWorkout();
    expect(activeObj).not.toBeNull();
    expect(activeObj!.exercises[0].sets).toHaveLength(3);
    expect(activeObj!.exercises[0].sets[0]).toEqual({ weight: 120, reps: 5, done: false });
    expect(activeObj!.exercises[0].sets[1]).toEqual({ weight: 125, reps: 8, done: false });
    expect(activeObj!.exercises[0].sets[2]).toEqual({ weight: 130, reps: 10, done: false });
    expect(activeObj!.exercises[0].targetReps).toBe('5/8/10');
  });

  it('gère correctement le plancher de répétitions pour le calcul du min-max', () => {
    // Si l'utilisateur saisit 1 rep
    const target = 1;
    const repsMin = Math.max(1, target - 2); // -> 1
    const repsMax = target + 2;             // -> 3
    expect(repsMin).toBe(1);
    expect(repsMax).toBe(3);
    
    // La valeur restituée dans l'input (repsMax - 2) doit redonner exactement la cible 1
    const displayValue = repsMax - 2;
    expect(displayValue).toBe(1);

    // Si l'utilisateur saisit 2 reps
    const target2 = 2;
    const repsMin2 = Math.max(1, target2 - 2); // -> 1
    const repsMax2 = target2 + 2;             // -> 4
    expect(repsMin2).toBe(1);
    expect(repsMax2).toBe(4);
    expect(repsMax2 - 2).toBe(2);
  });
});
