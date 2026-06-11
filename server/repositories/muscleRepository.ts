/** Accès données « muscles » & anatomie. */
import {asc, eq} from 'drizzle-orm';
import {alias} from 'drizzle-orm/pg-core';
import {db, schema} from '../db/client';

const {muscles, muscleGroups, exerciseMuscles, exercises, muscleVolumeLandmarks} = schema;

export async function listMuscles() {
  return db
    .select({
      id: muscles.id,
      nameFr: muscles.nameFr,
      nameEn: muscles.nameEn,
      groupId: muscles.groupId,
      groupNameFr: muscleGroups.nameFr,
      region: muscleGroups.region,
      functionFr: muscles.functionFr,
    })
    .from(muscles)
    .innerJoin(muscleGroups, eq(muscleGroups.id, muscles.groupId))
    .orderBy(asc(muscleGroups.nameFr), asc(muscles.nameFr));
}

export async function getMuscleById(id: string) {
  const antagonist = alias(muscles, 'antagonist');
  const [m] = await db
    .select({
      id: muscles.id,
      nameFr: muscles.nameFr,
      nameEn: muscles.nameEn,
      groupId: muscles.groupId,
      groupNameFr: muscleGroups.nameFr,
      functionFr: muscles.functionFr,
      anatomyFr: muscles.anatomyFr,
      aliasesFr: muscles.aliasesFr,
      antagonistId: muscles.antagonistId,
      antagonistNameFr: antagonist.nameFr,
    })
    .from(muscles)
    .innerJoin(muscleGroups, eq(muscleGroups.id, muscles.groupId))
    .leftJoin(antagonist, eq(antagonist.id, muscles.antagonistId))
    .where(eq(muscles.id, id));

  if (!m) return null;

  const [landmark] = await db
    .select()
    .from(muscleVolumeLandmarks)
    .where(eq(muscleVolumeLandmarks.muscleId, id));

  const targeting = await db
    .select({
      id: exercises.id,
      nameFr: exercises.nameFr,
      nameEn: exercises.nameEn,
      level: exercises.level,
      role: exerciseMuscles.role,
    })
    .from(exerciseMuscles)
    .innerJoin(exercises, eq(exercises.id, exerciseMuscles.exerciseId))
    .where(eq(exerciseMuscles.muscleId, id))
    .orderBy(asc(exercises.nameEn));

  return {
    ...m,
    volumeLandmark: landmark ?? null,
    primaryExercises: targeting.filter((e) => e.role === 'primary'),
    secondaryExercises: targeting.filter((e) => e.role === 'secondary'),
  };
}
