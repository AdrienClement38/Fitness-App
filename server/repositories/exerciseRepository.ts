/**
 * Accès données « exercices ». Tout le SQL (Drizzle) vit ici : les routes et le
 * reste de l'app n'écrivent jamais de requête.
 */
import {and, asc, count, eq, ilike, inArray, or, sql} from 'drizzle-orm';
import {db, schema} from '../db/client';

const {exercises, equipment, exerciseMuscles, muscles, movementPatterns} = schema;

export interface ExerciseFilters {
  search?: string;
  muscle?: string;
  equipment?: string;
  level?: string;
  category?: string;
  force?: string;
  page?: number;
  pageSize?: number;
}

const orderByName = asc(sql`coalesce(${exercises.nameFr}, ${exercises.nameEn})`);

function buildWhere(f: ExerciseFilters) {
  const conds = [];
  if (f.search?.trim()) {
    const q = `%${f.search.trim()}%`;
    conds.push(or(ilike(exercises.nameFr, q), ilike(exercises.nameEn, q)));
  }
  if (f.level) conds.push(eq(exercises.level, f.level));
  if (f.category) conds.push(eq(exercises.category, f.category));
  if (f.force) conds.push(eq(exercises.force, f.force));
  if (f.equipment) conds.push(eq(exercises.equipmentId, f.equipment));
  if (f.muscle) {
    conds.push(
      inArray(
        exercises.id,
        db
          .select({id: exerciseMuscles.exerciseId})
          .from(exerciseMuscles)
          .where(eq(exerciseMuscles.muscleId, f.muscle)),
      ),
    );
  }
  return conds.length ? and(...conds) : undefined;
}

/** Charge les muscles primaires (id + nom FR) pour un lot d'exercices. */
async function primaryMusclesFor(ids: string[]) {
  const byExercise = new Map<string, {id: string; nameFr: string}[]>();
  if (ids.length === 0) return byExercise;
  const rows = await db
    .select({exerciseId: exerciseMuscles.exerciseId, id: muscles.id, nameFr: muscles.nameFr})
    .from(exerciseMuscles)
    .innerJoin(muscles, eq(muscles.id, exerciseMuscles.muscleId))
    .where(and(inArray(exerciseMuscles.exerciseId, ids), eq(exerciseMuscles.role, 'primary')));
  for (const r of rows) {
    const arr = byExercise.get(r.exerciseId);
    if (arr) arr.push({id: r.id, nameFr: r.nameFr});
    else byExercise.set(r.exerciseId, [{id: r.id, nameFr: r.nameFr}]);
  }
  return byExercise;
}

export async function listExercises(f: ExerciseFilters) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, f.pageSize ?? 24));
  const where = buildWhere(f);

  const [{value: total}] = await db.select({value: count()}).from(exercises).where(where);

  const rows = await db
    .select({
      id: exercises.id,
      nameFr: exercises.nameFr,
      nameEn: exercises.nameEn,
      level: exercises.level,
      category: exercises.category,
      force: exercises.force,
      mechanic: exercises.mechanic,
      isEnriched: exercises.isEnriched,
      equipmentId: exercises.equipmentId,
      equipmentNameFr: equipment.nameFr,
    })
    .from(exercises)
    .leftJoin(equipment, eq(equipment.id, exercises.equipmentId))
    .where(where)
    .orderBy(orderByName)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const byExercise = await primaryMusclesFor(rows.map((r) => r.id));
  const items = rows.map((r) => ({...r, primaryMuscles: byExercise.get(r.id) ?? []}));

  return {items, total, page, pageSize, pageCount: Math.ceil(total / pageSize)};
}

export async function getExerciseById(id: string) {
  const [ex] = await db
    .select({
      id: exercises.id,
      nameFr: exercises.nameFr,
      nameEn: exercises.nameEn,
      aliasesFr: exercises.aliasesFr,
      force: exercises.force,
      level: exercises.level,
      mechanic: exercises.mechanic,
      category: exercises.category,
      equipmentId: exercises.equipmentId,
      equipmentNameFr: equipment.nameFr,
      movementPatternId: exercises.movementPatternId,
      movementPatternNameFr: movementPatterns.nameFr,
      instructionsEn: exercises.instructionsEn,
      instructionsFr: exercises.instructionsFr,
      commonMistakesFr: exercises.commonMistakesFr,
      tipsFr: exercises.tipsFr,
      contraindicationsFr: exercises.contraindicationsFr,
      tempo: exercises.tempo,
      images: exercises.images,
      isEnriched: exercises.isEnriched,
    })
    .from(exercises)
    .leftJoin(equipment, eq(equipment.id, exercises.equipmentId))
    .leftJoin(movementPatterns, eq(movementPatterns.id, exercises.movementPatternId))
    .where(eq(exercises.id, id));

  if (!ex) return null;

  const mus = await db
    .select({id: muscles.id, nameFr: muscles.nameFr, role: exerciseMuscles.role})
    .from(exerciseMuscles)
    .innerJoin(muscles, eq(muscles.id, exerciseMuscles.muscleId))
    .where(eq(exerciseMuscles.exerciseId, id));

  return {
    ...ex,
    primaryMuscles: mus.filter((m) => m.role === 'primary').map((m) => ({id: m.id, nameFr: m.nameFr})),
    secondaryMuscles: mus.filter((m) => m.role === 'secondary').map((m) => ({id: m.id, nameFr: m.nameFr})),
  };
}

/** Valeurs disponibles pour les filtres (muscles & matériel depuis la base). */
export async function getFacets() {
  const [muscleList, equipmentList] = await Promise.all([
    db.select({id: muscles.id, nameFr: muscles.nameFr, groupId: muscles.groupId}).from(muscles).orderBy(asc(muscles.nameFr)),
    db.select({id: equipment.id, nameFr: equipment.nameFr}).from(equipment).orderBy(asc(equipment.nameFr)),
  ]);
  return {
    muscles: muscleList,
    equipment: equipmentList,
    levels: ['beginner', 'intermediate', 'advanced'],
    forces: ['push', 'pull', 'static'],
    categories: ['strength', 'stretching', 'plyometrics', 'powerlifting', 'olympic_weightlifting', 'strongman', 'cardio'],
  };
}
