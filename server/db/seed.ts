/**
 * Seed de la bibliothèque d'entraînement.
 *
 * Port TypeScript de l'ancien `etl/build.py` :
 *   1. charge les connaissances FR (`data/*.json`) + l'ossature des 873 exos
 *      (`etl/sources/free-exercise-db.exercises.json`) ;
 *   2. mappe le vocabulaire du dataset (équipement, muscles, niveau, catégorie),
 *      fusionne l'enrichissement FR ;
 *   3. VALIDE l'intégrité (muscles/équipement/patterns/sources existants, énums
 *      légaux, bornes numériques) — échoue bruyamment si donnée aberrante ;
 *   4. insère dans la base (PGlite en local, PostgreSQL en prod via Drizzle).
 *
 * Idempotent : vide puis recharge. Lancement : `npm run db:seed`.
 */
import 'dotenv/config';
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {db, migrateDb, schema} from './client';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA = path.join(ROOT, 'data');
const DATASET = path.join(ROOT, 'etl', 'sources', 'free-exercise-db.exercises.json');
const DATASET_SOURCE_ID = 'free-exercise-db';

/* ---- Mappings dataset -> vocabulaire normalisé ------------------------- */
const EQUIPMENT_MAP: Record<string, string> = {
  barbell: 'barbell', dumbbell: 'dumbbell', kettlebells: 'kettlebell',
  'e-z curl bar': 'ez-bar', machine: 'machine', cable: 'cable',
  'body only': 'bodyweight', bands: 'resistance-band',
  'medicine ball': 'medicine-ball', 'exercise ball': 'stability-ball',
  'foam roll': 'foam-roller', other: 'other',
};
const MUSCLE_MAP: Record<string, string> = {'middle back': 'middle-back', 'lower back': 'lower-back'};
const LEVEL_MAP: Record<string, string> = {beginner: 'beginner', intermediate: 'intermediate', expert: 'advanced'};
const CATEGORY_MAP: Record<string, string> = {'olympic weightlifting': 'olympic_weightlifting'};

const VALID_FORCE = new Set(['push', 'pull', 'static']);
const VALID_MECHANIC = new Set(['compound', 'isolation']);
const VALID_LEVEL = new Set(['beginner', 'intermediate', 'advanced']);
const VALID_CATEGORY = new Set([
  'strength', 'stretching', 'plyometrics', 'powerlifting',
  'olympic_weightlifting', 'strongman', 'cardio',
]);
const VALID_MEASURE_KIND = new Set(['load', 'bodyweight', 'duration', 'cardio']);
const FREE_WEIGHT = new Set(['barbell', 'dumbbell', 'kettlebell', 'ez-bar']);
const NO_LOAD_ACCESSORY = new Set(['resistance-band', 'medicine-ball', 'stability-ball', 'other']);

/**
 * Mode de saisie d'un exercice, deduit de categorie / force / materiel. Regle de
 * base, surchargeable par data/measure_kind_overrides.json (exceptions curees).
 * IMPORTANT : garder synchro avec le fallback client measureKind() (src/lib/api.ts).
 *  - cardio                              -> cardio (min)
 *  - stretching / isometrie / foam-roll  -> duration (chrono : temps)
 *  - pliometrie (sauts/lancers)          -> reps  (sauf charge libre = load)
 *  - powerlifting / halterophilie        -> load  (barre chargee)
 *  - sans materiel / poids du corps      -> reps
 *  - accessoire sans charge chiffrable   -> reps  (elastique, swiss/med ball, divers)
 *  - barre/halteres/kettlebell/machine   -> load
 */
function deriveMeasureKind(category: string, force: string | null, equipmentId: string | null): string {
  if (category === 'cardio') return 'cardio';
  if (category === 'stretching' || force === 'static' || equipmentId === 'foam-roller') return 'duration';
  if (category === 'plyometrics') return equipmentId && FREE_WEIGHT.has(equipmentId) ? 'load' : 'bodyweight';
  if (category === 'powerlifting' || category === 'olympic_weightlifting') return 'load';
  if (equipmentId === null || equipmentId === 'bodyweight') return 'bodyweight';
  if (NO_LOAD_ACCESSORY.has(equipmentId)) return 'bodyweight';
  return 'load';
}

/* ---- Types des fichiers source ---------------------------------------- */
interface RawExercise {
  id: string; name: string; force: string | null; level: string;
  mechanic: string | null; equipment: string | null; category: string;
  primaryMuscles: string[]; secondaryMuscles: string[];
  instructions: string[]; images: string[];
}
interface Enriched {
  id: string; name_fr?: string; aliases_fr?: string[];
  movement_pattern_id?: string | null; tempo?: string;
  instructions_fr?: string[]; common_mistakes_fr?: string[];
  tips_fr?: string[]; contraindications_fr?: string[];
  primary_muscles?: string[]; secondary_muscles?: string[];
}
interface Translation {
  id: string;
  name_fr?: string;
  instructions_fr?: string[];
}
interface ProgramJson {
  id: string;
  name_fr: string;
  theme?: string;
  level?: string;
  goal?: string;
  days_per_week?: number;
  summary_fr?: string;
  description_fr?: string;
  sessions?: {
    day_order: number;
    name_fr: string;
    focus_fr?: string;
    exercises?: {exercise_id: string; sets?: number; reps_min?: number; reps_max?: number; rest_seconds?: number; notes_fr?: string}[];
  }[];
}
type JsonRow = Record<string, unknown>;

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(DATA, name), 'utf-8')) as T;
}
function loadJsonOptional<T>(name: string, fallback: T): T {
  const p = path.join(DATA, name);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf-8')) as T) : fallback;
}
function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function str(v: unknown): string | null {
  return v === undefined || v === null || v === '' ? null : String(v);
}
function num(v: unknown): number | null {
  return v === undefined || v === null || v === '' ? null : Number(v);
}

async function main() {
  /* ---- Chargement --------------------------------------------------- */
  const muscleGroups = loadJson<JsonRow[]>('muscle_groups.json');
  const muscles = loadJson<JsonRow[]>('muscles.json');
  const equipment = loadJson<JsonRow[]>('equipment.json');
  const patterns = loadJson<JsonRow[]>('movement_patterns.json');
  const sources = loadJson<JsonRow[]>('sources.json');
  const principles = loadJson<JsonRow[]>('training_principles.json');
  const repSchemes = loadJson<JsonRow[]>('rep_schemes.json');
  const volumeLandmarks = loadJson<JsonRow[]>('muscle_volume_landmarks.json');
  const splits = loadJson<JsonRow[]>('splits.json');
  const enrichedList = loadJson<Enriched[]>('exercises_enriched.json');
  const translationList = loadJsonOptional<Translation[]>('exercises_translations.json', []);
  const programs = loadJsonOptional<ProgramJson[]>('programs.json', []);
  const categoryOverrides =
    loadJsonOptional<{overrides?: Record<string, string>}>('category_overrides.json', {}).overrides ?? {};
  const measureKindOverrides =
    loadJsonOptional<{overrides?: Record<string, string>}>('measure_kind_overrides.json', {}).overrides ?? {};
  const dataset = JSON.parse(readFileSync(DATASET, 'utf-8')) as RawExercise[];

  const groupIds = new Set(muscleGroups.map((g) => g.id as string));
  const muscleIds = new Set(muscles.map((m) => m.id as string));
  const equipIds = new Set(equipment.map((e) => e.id as string));
  const patternIds = new Set(patterns.map((p) => p.id as string));
  const sourceIds = new Set(sources.map((s) => s.id as string));

  const errors: string[] = [];

  /* ---- Validation des référentiels ---------------------------------- */
  for (const m of muscles) {
    if (!groupIds.has(m.group_id as string)) errors.push(`muscle '${m.id}' -> group_id inconnu '${m.group_id}'`);
    const ant = m.antagonist_id as string | null;
    if (ant && !muscleIds.has(ant)) errors.push(`muscle '${m.id}' -> antagonist_id inconnu '${ant}'`);
  }
  if (!sourceIds.has(DATASET_SOURCE_ID)) {
    errors.push(`data/sources.json doit définir la source '${DATASET_SOURCE_ID}'`);
  }

  /* ---- Exercices : transformation + validation ---------------------- */
  const enriched = new Map(enrichedList.map((e) => [e.id, e]));
  const datasetSlugs = new Set(dataset.map((e) => slugify(e.id)));
  for (const eid of enriched.keys()) {
    if (!datasetSlugs.has(eid)) errors.push(`exercises_enriched.json : id '${eid}' ne correspond à aucun exercice`);
  }

  // Corrections de catégorie (faux étirements upstream), clé = slug d'exercice.
  for (const [oid, cat] of Object.entries(categoryOverrides)) {
    if (!datasetSlugs.has(oid)) errors.push(`category_overrides.json : id '${oid}' ne correspond à aucun exercice`);
    if (!VALID_CATEGORY.has(cat)) errors.push(`category_overrides.json : catégorie illégale '${cat}' (exo '${oid}')`);
  }
  for (const [oid, mk] of Object.entries(measureKindOverrides)) {
    if (!datasetSlugs.has(oid)) errors.push(`measure_kind_overrides.json : id '${oid}' ne correspond à aucun exercice`);
    if (!VALID_MEASURE_KIND.has(mk)) errors.push(`measure_kind_overrides.json : valeur illégale '${mk}' (exo '${oid}')`);
  }

  // Traductions (name_fr + instructions_fr), clé = slug de l'id brut du dataset.
  const translations = new Map(translationList.map((t) => [slugify(t.id), t]));
  for (const t of translationList) {
    if (!datasetSlugs.has(slugify(t.id))) {
      errors.push(`exercises_translations.json : id '${t.id}' ne correspond à aucun exercice`);
    }
  }

  const exerciseRows: (typeof schema.exercises.$inferInsert)[] = [];
  const exerciseMuscleRows: (typeof schema.exerciseMuscles.$inferInsert)[] = [];
  const seen = new Set<string>();
  let nEnriched = 0;

  for (const ex of dataset) {
    const id = slugify(ex.id);
    if (seen.has(id)) { errors.push(`collision d'id exercice : '${id}'`); continue; }
    seen.add(id);
    const enr = enriched.get(id);
    const tr = translations.get(id);

    const force = ex.force;
    if (force && !VALID_FORCE.has(force)) errors.push(`exo '${id}' : force illégale '${force}'`);
    const mechanic = ex.mechanic;
    if (mechanic && !VALID_MECHANIC.has(mechanic)) errors.push(`exo '${id}' : mechanic illégale '${mechanic}'`);
    const level = LEVEL_MAP[ex.level];
    if (!level || !VALID_LEVEL.has(level)) errors.push(`exo '${id}' : level inconnu '${ex.level}'`);
    const category = categoryOverrides[id] ?? CATEGORY_MAP[ex.category] ?? ex.category;
    if (!VALID_CATEGORY.has(category)) errors.push(`exo '${id}' : category inconnue '${ex.category}'`);

    let equipmentId: string | null = null;
    if (ex.equipment !== null) {
      if (!(ex.equipment in EQUIPMENT_MAP)) errors.push(`exo '${id}' : équipement non mappé '${ex.equipment}'`);
      else equipmentId = EQUIPMENT_MAP[ex.equipment];
    }
    if (equipmentId && !equipIds.has(equipmentId)) errors.push(`exo '${id}' : equipment_id '${equipmentId}' absent`);

    const mp = enr?.movement_pattern_id ?? null;
    if (mp && !patternIds.has(mp)) errors.push(`exo '${id}' : movement_pattern_id inconnu '${mp}'`);

    const isEnriched = Boolean(enr?.instructions_fr || enr?.name_fr || tr?.instructions_fr || tr?.name_fr);
    if (isEnriched) nEnriched++;

    const measureKind = measureKindOverrides[id] ?? deriveMeasureKind(category, force ?? null, equipmentId);

    exerciseRows.push({
      id,
      nameEn: ex.name,
      nameFr: enr?.name_fr ?? tr?.name_fr ?? null,
      aliasesFr: enr?.aliases_fr ?? null,
      force: force ?? null,
      level: level ?? 'beginner',
      mechanic: mechanic ?? null,
      category,
      measureKind,
      equipmentId,
      movementPatternId: mp,
      instructionsEn: ex.instructions ?? null,
      instructionsFr: enr?.instructions_fr ?? tr?.instructions_fr ?? null,
      commonMistakesFr: enr?.common_mistakes_fr ?? null,
      tipsFr: enr?.tips_fr ?? null,
      contraindicationsFr: enr?.contraindications_fr ?? null,
      tempo: enr?.tempo ?? null,
      images: ex.images ?? null,
      isEnriched,
      sourceDataset: DATASET_SOURCE_ID,
    });

    const addMuscles = (list: string[] | undefined, role: 'primary' | 'secondary') => {
      for (const rm of list ?? []) {
        const mid = MUSCLE_MAP[rm] ?? rm;
        if (!muscleIds.has(mid)) { errors.push(`exo '${id}' : muscle '${rm}' (->'${mid}') absent`); continue; }
        exerciseMuscleRows.push({exerciseId: id, muscleId: mid, role});
      }
    };
    addMuscles(enr?.primary_muscles ?? ex.primaryMuscles, 'primary');
    addMuscles(enr?.secondary_muscles ?? ex.secondaryMuscles, 'secondary');
  }

  /* ---- Validation savoir -------------------------------------------- */
  for (const r of repSchemes) {
    const rmin = r.reps_min as number, rmax = r.reps_max as number;
    if (rmin <= 0 || rmax < rmin) errors.push(`rep_scheme '${r.id}' : reps incohérentes (${rmin}-${rmax})`);
    for (const k of ['intensity_pct_1rm_min', 'intensity_pct_1rm_max'] as const) {
      const v = r[k] as number | null;
      if (v !== null && v !== undefined && (v < 1 || v > 100)) errors.push(`rep_scheme '${r.id}' : ${k}=${v} hors [1,100]`);
    }
  }
  for (const v of volumeLandmarks) {
    if (!muscleIds.has(v.muscle_id as string)) errors.push(`volume_landmark -> muscle inconnu '${v.muscle_id}'`);
    const mev = v.mev_sets as number | null, mrv = v.mrv_sets as number | null;
    if (mev && mrv && mev > mrv) errors.push(`volume_landmark '${v.muscle_id}' : MEV > MRV`);
  }
  for (const p of principles) {
    for (const sid of (p.sources as string[] | undefined) ?? []) {
      if (!sourceIds.has(sid)) errors.push(`principe '${p.id}' -> source inconnue '${sid}'`);
    }
  }

  /* ---- Programmes : construction + validation (exos référencés) ----- */
  const programRows: (typeof schema.programs.$inferInsert)[] = [];
  const programSessionRows: (typeof schema.programSessions.$inferInsert)[] = [];
  const programExerciseRows: (typeof schema.programExercises.$inferInsert)[] = [];
  for (const p of programs) {
    programRows.push({
      id: p.id, nameFr: p.name_fr, theme: p.theme ?? null, level: p.level ?? null,
      goal: p.goal ?? null, daysPerWeek: p.days_per_week ?? null,
      summaryFr: p.summary_fr ?? null, descriptionFr: p.description_fr ?? null,
    });
    for (const s of p.sessions ?? []) {
      programSessionRows.push({programId: p.id, dayOrder: s.day_order, nameFr: s.name_fr, focusFr: s.focus_fr ?? null});
      let pos = 1;
      for (const ex of s.exercises ?? []) {
        if (!seen.has(ex.exercise_id)) {
          errors.push(`programme '${p.id}' jour ${s.day_order} : exercice inconnu '${ex.exercise_id}'`);
        }
        programExerciseRows.push({
          programId: p.id, dayOrder: s.day_order, position: pos++, exerciseId: ex.exercise_id,
          sets: ex.sets ?? null, repsMin: ex.reps_min ?? null, repsMax: ex.reps_max ?? null,
          restSeconds: ex.rest_seconds ?? null, notesFr: ex.notes_fr ?? null,
        });
      }
    }
  }

  /* ---- Stop si données aberrantes ----------------------------------- */
  if (errors.length) {
    console.error(`VALIDATION ÉCHOUÉE — ${errors.length} anomalie(s) :`);
    for (const e of errors.slice(0, 50)) console.error('  ✗', e);
    process.exit(1);
  }

  /* ---- Insertion ---------------------------------------------------- */
  await migrateDb();

  // Vide (dépendants d'abord) pour une recharge propre.
  await db.delete(schema.programExercises);
  await db.delete(schema.programSessions);
  await db.delete(schema.programs);
  await db.delete(schema.exerciseMuscles);
  await db.delete(schema.muscleVolumeLandmarks);
  await db.delete(schema.principleSources);
  await db.delete(schema.splitDays);
  await db.delete(schema.exercises);
  await db.delete(schema.trainingPrinciples);
  await db.delete(schema.splits);
  await db.delete(schema.repSchemes);
  await db.delete(schema.movementPatterns);
  await db.delete(schema.equipment);
  await db.delete(schema.sources);
  await db.delete(schema.muscles);
  await db.delete(schema.muscleGroups);

  await db.insert(schema.muscleGroups).values(
    muscleGroups.map((g) => ({id: g.id as string, nameFr: g.name_fr as string, region: str(g.region), descriptionFr: str(g.description_fr)})),
  );
  await db.insert(schema.muscles).values(
    muscles.map((m) => ({
      id: m.id as string, nameFr: m.name_fr as string, nameEn: str(m.name_en), groupId: m.group_id as string,
      antagonistId: str(m.antagonist_id), functionFr: str(m.function_fr), anatomyFr: str(m.anatomy_fr),
      aliasesFr: (m.aliases_fr as string[] | undefined) ?? null,
    })),
  );
  await db.insert(schema.equipment).values(
    equipment.map((e) => ({id: e.id as string, nameFr: e.name_fr as string, category: str(e.category), descriptionFr: str(e.description_fr)})),
  );
  await db.insert(schema.movementPatterns).values(
    patterns.map((p) => ({id: p.id as string, nameFr: p.name_fr as string, descriptionFr: str(p.description_fr)})),
  );
  await db.insert(schema.sources).values(
    sources.map((s) => ({
      id: s.id as string, title: s.title as string, authors: str(s.authors), year: num(s.year),
      type: s.type as string, url: str(s.url), license: str(s.license), notesFr: str(s.notes_fr),
    })),
  );

  for (let i = 0; i < exerciseRows.length; i += 400) await db.insert(schema.exercises).values(exerciseRows.slice(i, i + 400));
  for (let i = 0; i < exerciseMuscleRows.length; i += 400) await db.insert(schema.exerciseMuscles).values(exerciseMuscleRows.slice(i, i + 400));

  if (programRows.length) await db.insert(schema.programs).values(programRows);
  if (programSessionRows.length) await db.insert(schema.programSessions).values(programSessionRows);
  if (programExerciseRows.length) await db.insert(schema.programExercises).values(programExerciseRows);

  await db.insert(schema.trainingPrinciples).values(
    principles.map((p) => ({
      id: p.id as string, titleFr: p.title_fr as string, category: p.category as string, summaryFr: p.summary_fr as string,
      detailFr: str(p.detail_fr), evidence: str(p.evidence), practicalFr: (p.practical_fr as string[] | undefined) ?? null,
    })),
  );
  const principleSourceRows = principles.flatMap((p) =>
    ((p.sources as string[] | undefined) ?? []).map((sid) => ({principleId: p.id as string, sourceId: sid})),
  );
  if (principleSourceRows.length) await db.insert(schema.principleSources).values(principleSourceRows);

  await db.insert(schema.repSchemes).values(
    repSchemes.map((r) => ({
      id: r.id as string, goal: r.goal as string, labelFr: r.label_fr as string,
      repsMin: r.reps_min as number, repsMax: r.reps_max as number, setsMin: num(r.sets_min), setsMax: num(r.sets_max),
      intensityPct1rmMin: num(r.intensity_pct_1rm_min), intensityPct1rmMax: num(r.intensity_pct_1rm_max),
      restSecondsMin: num(r.rest_seconds_min), restSecondsMax: num(r.rest_seconds_max),
      rirMin: num(r.rir_min), rirMax: num(r.rir_max), notesFr: str(r.notes_fr),
    })),
  );
  await db.insert(schema.muscleVolumeLandmarks).values(
    volumeLandmarks.map((v) => ({
      muscleId: v.muscle_id as string, mvSets: num(v.mv_sets), mevSets: num(v.mev_sets),
      mavSetsMin: num(v.mav_sets_min), mavSetsMax: num(v.mav_sets_max), mrvSets: num(v.mrv_sets), notesFr: str(v.notes_fr),
    })),
  );
  await db.insert(schema.splits).values(
    splits.map((s) => ({
      id: s.id as string, nameFr: s.name_fr as string, daysPerWeekMin: num(s.days_per_week_min), daysPerWeekMax: num(s.days_per_week_max),
      level: str(s.level), goal: str(s.goal), summaryFr: str(s.summary_fr),
      prosFr: (s.pros_fr as string[] | undefined) ?? null, consFr: (s.cons_fr as string[] | undefined) ?? null,
    })),
  );
  const splitDayRows = splits.flatMap((s) =>
    ((s.days as JsonRow[] | undefined) ?? []).map((d) => ({
      splitId: s.id as string, dayOrder: d.day_order as number, nameFr: d.name_fr as string, focusFr: str(d.focus_fr),
    })),
  );
  if (splitDayRows.length) await db.insert(schema.splitDays).values(splitDayRows);

  /* ---- Rapport ------------------------------------------------------ */
  const kindCounts = exerciseRows.reduce<Record<string, number>>((m, r) => {
    const k = (r.measureKind as string) ?? '?';
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});
  console.log('SEED OK');
  console.log(`  exercices        : ${exerciseRows.length}  (enrichis FR : ${nEnriched}, catégories corrigées : ${Object.keys(categoryOverrides).length})`);
  console.log(`  modes de saisie  : ${JSON.stringify(kindCounts)}  (overrides : ${Object.keys(measureKindOverrides).length})`);
  console.log(`  liens ex-muscle  : ${exerciseMuscleRows.length}`);
  console.log(`  muscles ${muscles.length} | groupes ${muscleGroups.length} | équipement ${equipment.length} | patterns ${patterns.length}`);
  console.log(`  sources ${sources.length} | principes ${principles.length} | rep_schemes ${repSchemes.length} | volumes ${volumeLandmarks.length} | splits ${splits.length}`);
  console.log(`  programmes ${programRows.length} | séances ${programSessionRows.length} | exos programmés ${programExerciseRows.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] échec :', err);
  process.exit(1);
});
