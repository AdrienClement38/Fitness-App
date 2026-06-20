/**
 * Accès données « exercices ». Tout le SQL (Drizzle) vit ici : les routes et le
 * reste de l'app n'écrivent jamais de requête.
 */
import {and, asc, count, eq, ilike, inArray, or, sql} from 'drizzle-orm';
import {db, schema} from '../db/client';
import {canDoExercise, sanitizeEquipment} from '../../src/lib/equipment';

const {exercises, equipment, exerciseMuscles, muscles, movementPatterns} = schema;

export interface ExerciseFilters {
  search?: string;
  muscle?: string;
  equipment?: string;
  level?: string;
  category?: string;
  force?: string;
  mechanic?: string;
  // Restreindre le filtre `muscle` au rôle PRIMAIRE (exercices qui CIBLENT le muscle, pas
  // seulement le sollicitent en secondaire). Utilisé par les pages « zone » (M'affiner).
  musclePrimary?: boolean;
  ids?: string[];
  page?: number;
  pageSize?: number;
  // Matériel possédé (jetons) : si défini, on remonte les exercices faisables en premier
  // et on renvoie un drapeau `canDo` par item. Undefined = pas de préférence (liste neutre).
  owned?: string[];
}

const orderByName = asc(sql`coalesce(${exercises.nameFr}, ${exercises.nameEn})`);

function buildWhere(f: ExerciseFilters) {
  const conds = [];
  if (f.ids && f.ids.length) conds.push(inArray(exercises.id, f.ids));
  if (f.search?.trim()) {
    const q = `%${f.search.trim()}%`;
    conds.push(or(ilike(exercises.nameFr, q), ilike(exercises.nameEn, q)));
  }
  if (f.level) conds.push(eq(exercises.level, f.level));
  if (f.category) conds.push(eq(exercises.category, f.category));
  if (f.force) conds.push(eq(exercises.force, f.force));
  if (f.mechanic) conds.push(eq(exercises.mechanic, f.mechanic));
  if (f.equipment) conds.push(eq(exercises.equipmentId, f.equipment));
  if (f.muscle) {
    // `muscle` accepte un id OU une liste séparée par des virgules (une zone = plusieurs
    // muscles, ex. bras = biceps,triceps,forearms) : on prend l'union (OR).
    const muscleIds = f.muscle.split(',').map((s) => s.trim()).filter(Boolean);
    if (muscleIds.length) {
      const muscleWhere = f.musclePrimary
        ? and(inArray(exerciseMuscles.muscleId, muscleIds), eq(exerciseMuscles.role, 'primary'))
        : inArray(exerciseMuscles.muscleId, muscleIds);
      conds.push(
        inArray(
          exercises.id,
          db.select({id: exerciseMuscles.exerciseId}).from(exerciseMuscles).where(muscleWhere),
        ),
      );
    }
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

// Colonnes renvoyées pour une ligne de liste (réutilisé par les deux chemins de pagination).
const listColumns = {
  id: exercises.id,
  nameFr: exercises.nameFr,
  nameEn: exercises.nameEn,
  level: exercises.level,
  category: exercises.category,
  measureKind: exercises.measureKind,
  force: exercises.force,
  mechanic: exercises.mechanic,
  isEnriched: exercises.isEnriched,
  equipmentId: exercises.equipmentId,
  equipmentNameFr: equipment.nameFr,
  images: exercises.images,
};

export async function listExercises(f: ExerciseFilters) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = Math.min(60, Math.max(1, f.pageSize ?? 24));
  const where = buildWhere(f);

  // Mise en avant « faisable » : matériel renseigné -> on charge TOUT le catalogue filtré
  // (≤ 873 lignes), on remonte les faisables en premier (tri STABLE : l'ordre alpha SQL est
  // conservé dans chaque groupe), puis on pagine en mémoire. La logique reste partagée
  // (canDoExercise) — aucun SQL dédié à maintenir.
  if (f.owned) {
    // Re-validation défensive : on ne fait jamais confiance à des jetons stockés (legacy /
    // écriture future contournant sanitizeEquipment) au moment du calcul `canDo`.
    const owned = new Set(sanitizeEquipment(f.owned) ?? []);
    const all = await db
      .select(listColumns)
      .from(exercises)
      .leftJoin(equipment, eq(equipment.id, exercises.equipmentId))
      .where(where)
      .orderBy(orderByName);
    const ranked = all
      .map((r) => ({...r, canDo: canDoExercise({id: r.id, category: r.category, equipmentId: r.equipmentId}, owned)}))
      .sort((a, b) => Number(b.canDo) - Number(a.canDo));
    const total = ranked.length;
    const pageRows = ranked.slice((page - 1) * pageSize, page * pageSize);
    const byExercise = await primaryMusclesFor(pageRows.map((r) => r.id));
    const items = pageRows.map((r) => ({...r, primaryMuscles: byExercise.get(r.id) ?? []}));
    return {items, total, page, pageSize, pageCount: Math.ceil(total / pageSize)};
  }

  const [{value: total}] = await db.select({value: count()}).from(exercises).where(where);

  const rows = await db
    .select(listColumns)
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
      measureKind: exercises.measureKind,
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

/**
 * Étirements suggérés en fin de séance : on cible les muscles travaillés par les
 * exercices effectués, puis on classe les étirements (category = 'stretching') par
 * nombre de muscles couverts. Léger : 3 requêtes bornées, appelé 1× par séance finie.
 */
export async function stretchSuggestionsFor(exerciseIds: string[], limit = 6) {
  if (exerciseIds.length === 0) return [];
  // 1) muscles travaillés (tous rôles) par la séance
  const worked = await db
    .select({muscleId: exerciseMuscles.muscleId})
    .from(exerciseMuscles)
    .where(inArray(exerciseMuscles.exerciseId, exerciseIds));
  const workedMuscles = [...new Set(worked.map((r) => r.muscleId))];
  if (workedMuscles.length === 0) return [];

  // 2) étirements classés par nombre de muscles travaillés couverts
  const ranked = await db
    .select({id: exerciseMuscles.exerciseId})
    .from(exerciseMuscles)
    .innerJoin(exercises, eq(exercises.id, exerciseMuscles.exerciseId))
    .where(and(eq(exercises.category, 'stretching'), inArray(exerciseMuscles.muscleId, workedMuscles)))
    .groupBy(exerciseMuscles.exerciseId)
    .orderBy(sql`count(distinct ${exerciseMuscles.muscleId}) desc`)
    .limit(limit + exerciseIds.length);
  const stretchIds = ranked.map((r) => r.id).filter((id) => !exerciseIds.includes(id)).slice(0, limit);
  if (stretchIds.length === 0) return [];

  // 3) données complètes (réordonnées par pertinence)
  const rows = await db
    .select({
      id: exercises.id,
      nameFr: exercises.nameFr,
      nameEn: exercises.nameEn,
      level: exercises.level,
      category: exercises.category,
      measureKind: exercises.measureKind,
      force: exercises.force,
      mechanic: exercises.mechanic,
      isEnriched: exercises.isEnriched,
      equipmentId: exercises.equipmentId,
      equipmentNameFr: equipment.nameFr,
      images: exercises.images,
    })
    .from(exercises)
    .leftJoin(equipment, eq(equipment.id, exercises.equipmentId))
    .where(inArray(exercises.id, stretchIds));
  const byExercise = await primaryMusclesFor(stretchIds);
  const byId = new Map(rows.map((r) => [r.id, {...r, primaryMuscles: byExercise.get(r.id) ?? []}]));
  return stretchIds.map((id) => byId.get(id)).filter((x): x is NonNullable<typeof x> => Boolean(x));
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

/**
 * Facettes CONTEXTUELLES (filtres « intelligents »). Pour chaque dimension de filtre
 * (type/categorie, materiel, muscle), renvoie uniquement les valeurs qui ont >= 1 resultat
 * compte tenu des AUTRES filtres actifs — on exclut le filtre de la dimension elle-meme
 * pour qu'on puisse encore y changer de valeur. Resultat : un select ne propose jamais une
 * option menant a 0 ; on ne peut naviguer que dans des combinaisons valides. Sans aucun
 * filtre -> catalogue complet (meme sortie que getFacets).
 */
export async function getContextualFacets(f: ExerciseFilters) {
  const build = (exclude: 'category' | 'equipment' | 'muscle') => {
    const c = [];
    if (f.ids && f.ids.length) c.push(inArray(exercises.id, f.ids)); // mode favoris
    if (f.search?.trim()) {
      const qq = `%${f.search.trim()}%`;
      c.push(or(ilike(exercises.nameFr, qq), ilike(exercises.nameEn, qq)));
    }
    if (f.level) c.push(eq(exercises.level, f.level));
    if (f.force) c.push(eq(exercises.force, f.force));
    if (f.mechanic) c.push(eq(exercises.mechanic, f.mechanic));
    if (exclude !== 'category' && f.category) c.push(eq(exercises.category, f.category));
    if (exclude !== 'equipment' && f.equipment) c.push(eq(exercises.equipmentId, f.equipment));
    if (exclude !== 'muscle' && f.muscle) {
      const ids = f.muscle.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length) {
        const w = f.musclePrimary
          ? and(inArray(exerciseMuscles.muscleId, ids), eq(exerciseMuscles.role, 'primary'))
          : inArray(exerciseMuscles.muscleId, ids);
        c.push(inArray(exercises.id, db.select({id: exerciseMuscles.exerciseId}).from(exerciseMuscles).where(w)));
      }
    }
    return c.length ? and(...c) : undefined;
  };

  const [cats, equipRows, muscleRows] = await Promise.all([
    db.selectDistinct({v: exercises.category}).from(exercises).where(build('category')),
    db.selectDistinct({v: exercises.equipmentId}).from(exercises).where(build('equipment')),
    db
      .selectDistinct({v: exerciseMuscles.muscleId})
      .from(exerciseMuscles)
      .innerJoin(exercises, eq(exercises.id, exerciseMuscles.exerciseId))
      .where(build('muscle')),
  ]);

  const equipIds = equipRows.map((r) => r.v).filter((x): x is string => !!x);
  const muscleIds = muscleRows.map((r) => r.v);
  const equipmentList = equipIds.length
    ? await db.select({id: equipment.id, nameFr: equipment.nameFr}).from(equipment).where(inArray(equipment.id, equipIds)).orderBy(asc(equipment.nameFr))
    : [];
  const muscleList = muscleIds.length
    ? await db.select({id: muscles.id, nameFr: muscles.nameFr, groupId: muscles.groupId}).from(muscles).where(inArray(muscles.id, muscleIds)).orderBy(asc(muscles.nameFr))
    : [];

  return {
    muscles: muscleList,
    equipment: equipmentList,
    levels: ['beginner', 'intermediate', 'advanced'],
    forces: ['push', 'pull', 'static'],
    categories: cats.map((r) => r.v).filter((x): x is string => !!x).sort(),
  };
}
