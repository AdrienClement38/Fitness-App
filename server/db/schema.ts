/**
 * Schéma de base de données (Drizzle, dialecte PostgreSQL).
 *
 * Un seul dialecte partout : PostgreSQL en production (AlwaysData) et PGlite
 * (Postgres embarqué) en local — aucune divergence SQLite/Postgres.
 *
 * Conventions :
 *  - identifiants et énumérations en ANGLAIS (slugs stables), contenu en FR.
 *  - les énums restent des `text` (valeurs contrôlées à la frontière par Zod au
 *    seed) pour rester souples ; les listes (instructions, conseils…) sont des
 *    colonnes `jsonb` typées `string[]`.
 */
import {
  pgTable,
  text,
  integer,
  boolean,
  jsonb,
  primaryKey,
  index,
  timestamp,
} from 'drizzle-orm/pg-core';

/* ------------------------------------------------------------------ */
/*  Référentiels : anatomie                                           */
/* ------------------------------------------------------------------ */

export const muscleGroups = pgTable('muscle_groups', {
  id: text('id').primaryKey(), // slug EN, ex: 'back'
  nameFr: text('name_fr').notNull(),
  region: text('region'), // 'upper' | 'lower' | 'core'
  descriptionFr: text('description_fr'),
});

export const muscles = pgTable(
  'muscles',
  {
    id: text('id').primaryKey(), // slug EN aligné sur le dataset, ex: 'lats'
    nameFr: text('name_fr').notNull(),
    nameEn: text('name_en'),
    groupId: text('group_id')
      .notNull()
      .references(() => muscleGroups.id),
    // Antagoniste : référence un autre muscle. Colonne simple (pas de FK Drizzle
    // pour éviter l'auto-référence circulaire) — l'intégrité est validée au seed.
    antagonistId: text('antagonist_id'),
    functionFr: text('function_fr'),
    anatomyFr: text('anatomy_fr'),
    aliasesFr: jsonb('aliases_fr').$type<string[]>(),
  },
  (t) => [index('muscles_group_idx').on(t.groupId)],
);

/* ------------------------------------------------------------------ */
/*  Référentiels : matériel & mouvement                               */
/* ------------------------------------------------------------------ */

export const equipment = pgTable('equipment', {
  id: text('id').primaryKey(), // slug EN, ex: 'barbell'
  nameFr: text('name_fr').notNull(),
  category: text('category'), // 'free-weight'|'machine'|'bodyweight'|'accessory'|'cardio'
  descriptionFr: text('description_fr'),
});

export const movementPatterns = pgTable('movement_patterns', {
  id: text('id').primaryKey(), // ex: 'horizontal-push'
  nameFr: text('name_fr').notNull(),
  descriptionFr: text('description_fr'),
});

/* ------------------------------------------------------------------ */
/*  Provenance / sources                                              */
/* ------------------------------------------------------------------ */

export const sources = pgTable('sources', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  authors: text('authors'),
  year: integer('year'),
  type: text('type').notNull(), // 'scientific'|'guideline'|'coach'|'dataset'|'book'
  url: text('url'),
  license: text('license'),
  notesFr: text('notes_fr'),
});

/* ------------------------------------------------------------------ */
/*  Exercices                                                         */
/* ------------------------------------------------------------------ */

export const exercises = pgTable(
  'exercises',
  {
    id: text('id').primaryKey(), // slug EN normalisé, ex: 'barbell-bench-press-medium-grip'
    nameEn: text('name_en').notNull(),
    nameFr: text('name_fr'), // null = pas encore traduit (ossature)
    aliasesFr: jsonb('aliases_fr').$type<string[]>(),
    force: text('force'), // 'push'|'pull'|'static'|null
    level: text('level').notNull(), // 'beginner'|'intermediate'|'advanced'
    mechanic: text('mechanic'), // 'compound'|'isolation'|null
    category: text('category').notNull(),
    // Mode de saisie : 'load' (kg x reps) | 'bodyweight' (reps) | 'duration' (chrono) | 'cardio' (min).
    // Calcule au seed (deriveMeasureKind + data/measure_kind_overrides.json). Nullable : le client
    // retombe sur l'heuristique si absent (donnees pre-migration).
    measureKind: text('measure_kind'),
    equipmentId: text('equipment_id').references(() => equipment.id),
    movementPatternId: text('movement_pattern_id').references(() => movementPatterns.id),
    instructionsEn: jsonb('instructions_en').$type<string[]>(),
    instructionsFr: jsonb('instructions_fr').$type<string[]>(),
    commonMistakesFr: jsonb('common_mistakes_fr').$type<string[]>(),
    tipsFr: jsonb('tips_fr').$type<string[]>(),
    contraindicationsFr: jsonb('contraindications_fr').$type<string[]>(),
    tempo: text('tempo'),
    images: jsonb('images').$type<string[]>(),
    isEnriched: boolean('is_enriched').notNull().default(false),
    sourceDataset: text('source_dataset').references(() => sources.id),
  },
  (t) => [
    index('exercises_category_idx').on(t.category),
    index('exercises_equipment_idx').on(t.equipmentId),
    index('exercises_level_idx').on(t.level),
    index('exercises_enriched_idx').on(t.isEnriched),
  ],
);

// Lien exercice <-> muscle (many-to-many). Garantit que tout muscle cité existe.
export const exerciseMuscles = pgTable(
  'exercise_muscles',
  {
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, {onDelete: 'cascade'}),
    muscleId: text('muscle_id')
      .notNull()
      .references(() => muscles.id),
    role: text('role').notNull(), // 'primary' | 'secondary'
  },
  (t) => [
    primaryKey({columns: [t.exerciseId, t.muscleId, t.role]}),
    index('exercise_muscles_muscle_idx').on(t.muscleId),
    index('exercise_muscles_role_idx').on(t.role),
  ],
);

/* ------------------------------------------------------------------ */
/*  Savoir : principes, schémas de reps, volumes, splits              */
/* ------------------------------------------------------------------ */

export const trainingPrinciples = pgTable(
  'training_principles',
  {
    id: text('id').primaryKey(),
    titleFr: text('title_fr').notNull(),
    category: text('category').notNull(),
    summaryFr: text('summary_fr').notNull(),
    detailFr: text('detail_fr'),
    evidence: text('evidence'), // 'strong'|'moderate'|'limited'|'consensus'
    practicalFr: jsonb('practical_fr').$type<string[]>(),
  },
  (t) => [index('training_principles_category_idx').on(t.category)],
);

export const principleSources = pgTable(
  'principle_sources',
  {
    principleId: text('principle_id')
      .notNull()
      .references(() => trainingPrinciples.id, {onDelete: 'cascade'}),
    sourceId: text('source_id')
      .notNull()
      .references(() => sources.id),
  },
  (t) => [primaryKey({columns: [t.principleId, t.sourceId]})],
);

export const repSchemes = pgTable('rep_schemes', {
  id: text('id').primaryKey(),
  goal: text('goal').notNull(), // 'strength'|'hypertrophy'|'endurance'|'power'
  labelFr: text('label_fr').notNull(),
  repsMin: integer('reps_min').notNull(),
  repsMax: integer('reps_max').notNull(),
  setsMin: integer('sets_min'),
  setsMax: integer('sets_max'),
  intensityPct1rmMin: integer('intensity_pct_1rm_min'),
  intensityPct1rmMax: integer('intensity_pct_1rm_max'),
  restSecondsMin: integer('rest_seconds_min'),
  restSecondsMax: integer('rest_seconds_max'),
  rirMin: integer('rir_min'),
  rirMax: integer('rir_max'),
  notesFr: text('notes_fr'),
});

export const muscleVolumeLandmarks = pgTable('muscle_volume_landmarks', {
  muscleId: text('muscle_id')
    .primaryKey()
    .references(() => muscles.id),
  mvSets: integer('mv_sets'),
  mevSets: integer('mev_sets'),
  mavSetsMin: integer('mav_sets_min'),
  mavSetsMax: integer('mav_sets_max'),
  mrvSets: integer('mrv_sets'),
  notesFr: text('notes_fr'),
});

export const splits = pgTable('splits', {
  id: text('id').primaryKey(),
  nameFr: text('name_fr').notNull(),
  daysPerWeekMin: integer('days_per_week_min'),
  daysPerWeekMax: integer('days_per_week_max'),
  level: text('level'),
  goal: text('goal'),
  summaryFr: text('summary_fr'),
  prosFr: jsonb('pros_fr').$type<string[]>(),
  consFr: jsonb('cons_fr').$type<string[]>(),
});

export const splitDays = pgTable(
  'split_days',
  {
    splitId: text('split_id')
      .notNull()
      .references(() => splits.id, {onDelete: 'cascade'}),
    dayOrder: integer('day_order').notNull(),
    nameFr: text('name_fr').notNull(),
    focusFr: text('focus_fr'),
  },
  (t) => [primaryKey({columns: [t.splitId, t.dayOrder]})],
);

/* ------------------------------------------------------------------ */
/*  Programmes d'entraînement (curated, seedés)                       */
/* ------------------------------------------------------------------ */

export const programs = pgTable(
  'programs',
  {
    id: text('id').primaryKey(),
    nameFr: text('name_fr').notNull(),
    theme: text('theme'), // 'full-body'|'upper-lower'|'ppl'|'strength'|'glutes'|'upper-body'|'cardio'…
    level: text('level'), // 'beginner'|'intermediate'|'advanced'
    goal: text('goal'), // 'strength'|'hypertrophy'|'endurance'|'power'
    daysPerWeek: integer('days_per_week'),
    // Public cible (mise en avant) : 'female' | 'male' | 'all'. Soft default, tout reste accessible.
    audience: text('audience'),
    summaryFr: text('summary_fr'),
    descriptionFr: text('description_fr'),
  },
  (t) => [index('programs_theme_idx').on(t.theme), index('programs_level_idx').on(t.level)],
);

export const programSessions = pgTable(
  'program_sessions',
  {
    programId: text('program_id')
      .notNull()
      .references(() => programs.id, {onDelete: 'cascade'}),
    dayOrder: integer('day_order').notNull(),
    nameFr: text('name_fr').notNull(), // ex: 'Jour A', 'Push'
    focusFr: text('focus_fr'),
  },
  (t) => [primaryKey({columns: [t.programId, t.dayOrder]})],
);

// Un exercice dans une séance d'un programme. Lié à NOTRE base d'exercices.
export const programExercises = pgTable(
  'program_exercises',
  {
    programId: text('program_id')
      .notNull()
      .references(() => programs.id, {onDelete: 'cascade'}),
    dayOrder: integer('day_order').notNull(), // séance (programId + dayOrder)
    position: integer('position').notNull(), // ordre dans la séance
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id),
    sets: integer('sets'),
    repsMin: integer('reps_min'),
    repsMax: integer('reps_max'),
    restSeconds: integer('rest_seconds'),
    notesFr: text('notes_fr'),
  },
  (t) => [
    primaryKey({columns: [t.programId, t.dayOrder, t.position]}),
    index('program_exercises_exercise_idx').on(t.exerciseId),
  ],
);

/* ------------------------------------------------------------------ */
/*  Comptes utilisateurs (auth + sync)                                */
/* ------------------------------------------------------------------ */

export const users = pgTable('users', {
  id: text('id').primaryKey(), // 'u-<uuid>'
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(), // scrypt : 'saltHex:hashHex'
  role: text('role').notNull().default('user'), // 'user' | 'admin'
  // Sexe (optionnel) : 'male' | 'female' | null (préfère ne pas dire / non renseigné).
  // Sert à mettre en avant des programmes et à ajuster les valeurs par défaut.
  gender: text('gender'),
  // Matériel auquel l'utilisateur a accès (salle + équipements maison) : liste de jetons
  // (cf. src/lib/equipment.ts). Sert à mettre en avant les exercices faisables. null =
  // non renseigné (mise en avant inactive) ; [] = renseigné « rien » (poids du corps seul).
  equipment: jsonb('equipment').$type<string[]>(),
  emailVerified: boolean('email_verified').notNull().default(false),
  verifyToken: text('verify_token'), // jeton de confirmation d'email (null une fois vérifié)
  verifyExpires: timestamp('verify_expires', {withTimezone: true}),
  resetToken: text('reset_token'), // jeton de réinitialisation de mot de passe (single-use, 1 h)
  resetExpires: timestamp('reset_expires', {withTimezone: true}),
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
});

// Sessions serveur : un jeton = un cookie httpOnly. Révocable (logout / expiration).
export const sessions = pgTable(
  'sessions',
  {
    token: text('token').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    expiresAt: timestamp('expires_at', {withTimezone: true}).notNull(),
    createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
);

// Paramètres applicatifs (clé -> valeur JSON). Configuration éditable par l'admin
// sans redéploiement : ex. SMTP. Le mot de passe SMTP y est chiffré au repos
// (enveloppe AES-256-GCM, cf. crypto.ts) et n'est JAMAIS renvoyé au client.
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value'),
  updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});

// Stockage de synchronisation : données utilisateur en blobs JSONB, mergées côté client.
export const syncItems = pgTable(
  'sync_items',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, {onDelete: 'cascade'}),
    kind: text('kind').notNull(), // 'workout-log' | 'my-program' | 'favorite'
    itemId: text('item_id').notNull(),
    data: jsonb('data'), // blob de l'entité (null si supprimée)
    updatedAt: timestamp('updated_at', {withTimezone: true}).notNull(),
    deleted: boolean('deleted').notNull().default(false),
  },
  (t) => [primaryKey({columns: [t.userId, t.kind, t.itemId]})],
);
