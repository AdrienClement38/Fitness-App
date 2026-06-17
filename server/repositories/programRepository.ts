/**
 * Accès données « programmes » (curated). Chaque exercice d'un programme est
 * joint à NOTRE base d'exercices (nom FR, niveau…) pour l'affichage + le lien.
 */
import {asc, eq} from 'drizzle-orm';
import {db, schema} from '../db/client';
import {canDoExercise, sanitizeEquipment} from '../../src/lib/equipment';

const {programs, programSessions, programExercises, exercises} = schema;

/**
 * Liste des programmes. Si `owned` (matériel possédé) est fourni, on calcule par programme
 * le nombre d'exercices faisables (`doableCount` / `exerciseCount`) + `canDo` (= tous
 * faisables). Sert à mettre en avant (PAS à cacher) : on remonte le plus faisable d'abord,
 * badge « Faisable » à 100 %, sinon « X/Y faisables ». La proportion évite l'écueil du
 * tout-ou-rien (un setup maison a rarement un programme 100 % faisable, mais souvent des
 * programmes largement faisables).
 */
export async function listPrograms(owned?: string[]) {
  const rows = await db
    .select({
      id: programs.id,
      nameFr: programs.nameFr,
      theme: programs.theme,
      level: programs.level,
      goal: programs.goal,
      daysPerWeek: programs.daysPerWeek,
      audience: programs.audience,
      summaryFr: programs.summaryFr,
    })
    .from(programs)
    .orderBy(asc(programs.nameFr));

  if (!owned) return rows;

  const owns = new Set(sanitizeEquipment(owned) ?? []);
  // (category, equipmentId) de tous les exercices de tous les programmes, en une requête.
  const exRows = await db
    .select({
      programId: programExercises.programId,
      exerciseId: programExercises.exerciseId,
      category: exercises.category,
      equipmentId: exercises.equipmentId,
    })
    .from(programExercises)
    .innerJoin(exercises, eq(exercises.id, programExercises.exerciseId));
  const total = new Map<string, number>();
  const doable = new Map<string, number>();
  for (const r of exRows) {
    total.set(r.programId, (total.get(r.programId) ?? 0) + 1);
    if (canDoExercise({id: r.exerciseId, category: r.category, equipmentId: r.equipmentId}, owns)) {
      doable.set(r.programId, (doable.get(r.programId) ?? 0) + 1);
    }
  }
  return rows.map((p) => {
    const exerciseCount = total.get(p.id) ?? 0;
    const doableCount = doable.get(p.id) ?? 0;
    return {...p, exerciseCount, doableCount, canDo: exerciseCount > 0 && doableCount === exerciseCount};
  });
}

export async function getProgramById(id: string) {
  const [program] = await db.select().from(programs).where(eq(programs.id, id));
  if (!program) return null;

  const sessions = await db
    .select()
    .from(programSessions)
    .where(eq(programSessions.programId, id))
    .orderBy(asc(programSessions.dayOrder));

  const exRows = await db
    .select({
      dayOrder: programExercises.dayOrder,
      position: programExercises.position,
      exerciseId: programExercises.exerciseId,
      nameFr: exercises.nameFr,
      nameEn: exercises.nameEn,
      level: exercises.level,
      force: exercises.force,
      category: exercises.category,
      measureKind: exercises.measureKind,
      equipmentId: exercises.equipmentId,
      sets: programExercises.sets,
      repsMin: programExercises.repsMin,
      repsMax: programExercises.repsMax,
      restSeconds: programExercises.restSeconds,
      notesFr: programExercises.notesFr,
    })
    .from(programExercises)
    .innerJoin(exercises, eq(exercises.id, programExercises.exerciseId))
    .where(eq(programExercises.programId, id))
    .orderBy(asc(programExercises.dayOrder), asc(programExercises.position));

  return {
    ...program,
    sessions: sessions.map((s) => ({
      ...s,
      exercises: exRows.filter((e) => e.dayOrder === s.dayOrder),
    })),
  };
}
