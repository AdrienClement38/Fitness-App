/**
 * Accès données « programmes » (curated). Chaque exercice d'un programme est
 * joint à NOTRE base d'exercices (nom FR, niveau…) pour l'affichage + le lien.
 */
import {asc, eq} from 'drizzle-orm';
import {db, schema} from '../db/client';

const {programs, programSessions, programExercises, exercises} = schema;

export async function listPrograms() {
  return db
    .select({
      id: programs.id,
      nameFr: programs.nameFr,
      theme: programs.theme,
      level: programs.level,
      goal: programs.goal,
      daysPerWeek: programs.daysPerWeek,
      summaryFr: programs.summaryFr,
    })
    .from(programs)
    .orderBy(asc(programs.nameFr));
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
