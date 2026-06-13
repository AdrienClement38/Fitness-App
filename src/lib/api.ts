/** Client API typé. Same-origin : l'app et l'API sont servies par le même Express. */

export interface MuscleRef {
  id: string;
  nameFr: string;
}

export interface ExerciseListItem {
  id: string;
  nameFr: string | null;
  nameEn: string;
  level: string;
  category: string;
  measureKind: MeasureKind | null;
  force: string | null;
  mechanic: string | null;
  isEnriched: boolean;
  equipmentId: string | null;
  equipmentNameFr: string | null;
  images: string[] | null;
  primaryMuscles: MuscleRef[];
}

export interface ExercisesResponse {
  items: ExerciseListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ExerciseDetail {
  id: string;
  nameFr: string | null;
  nameEn: string;
  aliasesFr: string[] | null;
  force: string | null;
  level: string;
  mechanic: string | null;
  category: string;
  measureKind: MeasureKind | null;
  equipmentId: string | null;
  equipmentNameFr: string | null;
  movementPatternId: string | null;
  movementPatternNameFr: string | null;
  instructionsEn: string[] | null;
  instructionsFr: string[] | null;
  commonMistakesFr: string[] | null;
  tipsFr: string[] | null;
  contraindicationsFr: string[] | null;
  tempo: string | null;
  images: string[] | null;
  isEnriched: boolean;
  primaryMuscles: MuscleRef[];
  secondaryMuscles: MuscleRef[];
}

export interface Facets {
  muscles: {id: string; nameFr: string; groupId: string}[];
  equipment: {id: string; nameFr: string}[];
  levels: string[];
  forces: string[];
  categories: string[];
}

export interface MuscleListItem {
  id: string;
  nameFr: string;
  nameEn: string | null;
  groupId: string;
  groupNameFr: string;
  region: string | null;
  functionFr: string | null;
}

export interface VolumeLandmark {
  muscleId: string;
  muscleNameFr?: string;
  mvSets: number | null;
  mevSets: number | null;
  mavSetsMin: number | null;
  mavSetsMax: number | null;
  mrvSets: number | null;
  notesFr: string | null;
}

export interface ExerciseRef {
  id: string;
  nameFr: string | null;
  nameEn: string;
  level: string;
}

export interface MuscleDetail {
  id: string;
  nameFr: string;
  nameEn: string | null;
  groupId: string;
  groupNameFr: string;
  functionFr: string | null;
  anatomyFr: string | null;
  aliasesFr: string[] | null;
  antagonistId: string | null;
  antagonistNameFr: string | null;
  volumeLandmark: VolumeLandmark | null;
  primaryExercises: ExerciseRef[];
  secondaryExercises: ExerciseRef[];
}

export interface SourceRef {
  id: string;
  title: string;
  authors: string | null;
  year: number | null;
  url: string | null;
}

/** Source complète (onglet Savoir > Sources). */
export interface Source {
  id: string;
  title: string;
  authors: string | null;
  year: number | null;
  type: string;
  url: string | null;
  license: string | null;
  notesFr: string | null;
}

export interface Principle {
  id: string;
  titleFr: string;
  category: string;
  summaryFr: string;
  detailFr: string | null;
  evidence: string | null;
  practicalFr: string[] | null;
  sources: SourceRef[];
}

export interface RepScheme {
  id: string;
  goal: string;
  labelFr: string;
  repsMin: number;
  repsMax: number;
  setsMin: number | null;
  setsMax: number | null;
  intensityPct1rmMin: number | null;
  intensityPct1rmMax: number | null;
  restSecondsMin: number | null;
  restSecondsMax: number | null;
  rirMin: number | null;
  rirMax: number | null;
  notesFr: string | null;
}

export interface SplitDay {
  splitId: string;
  dayOrder: number;
  nameFr: string;
  focusFr: string | null;
}

export interface Split {
  id: string;
  nameFr: string;
  daysPerWeekMin: number | null;
  daysPerWeekMax: number | null;
  level: string | null;
  goal: string | null;
  summaryFr: string | null;
  prosFr: string[] | null;
  consFr: string[] | null;
  days: SplitDay[];
}

export interface ProgramListItem {
  id: string;
  nameFr: string;
  theme: string | null;
  level: string | null;
  goal: string | null;
  daysPerWeek: number | null;
  summaryFr: string | null;
}

export interface ProgramExerciseItem {
  dayOrder: number;
  position: number;
  exerciseId: string;
  nameFr: string | null;
  nameEn: string;
  level: string;
  force: string | null;
  category: string | null;
  measureKind: MeasureKind | null;
  equipmentId: string | null;
  sets: number | null;
  repsMin: number | null;
  repsMax: number | null;
  restSeconds: number | null;
  notesFr: string | null;
}

export interface ProgramSession {
  programId: string;
  dayOrder: number;
  nameFr: string;
  focusFr: string | null;
  exercises: ProgramExerciseItem[];
}

export interface ProgramDetail extends ProgramListItem {
  descriptionFr: string | null;
  sessions: ProgramSession[];
}

/* ---- Libellés FR des énumérations (affichage) ------------------------- */
export const LABELS = {
  level: {beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé'} as Record<string, string>,
  force: {push: 'Poussée', pull: 'Tirage', static: 'Statique'} as Record<string, string>,
  mechanic: {compound: 'Polyarticulaire', isolation: 'Isolation'} as Record<string, string>,
  category: {
    strength: 'Renforcement', stretching: 'Étirement', plyometrics: 'Pliométrie',
    powerlifting: 'Force athlétique', olympic_weightlifting: 'Haltérophilie',
    strongman: 'Strongman', cardio: 'Cardio',
  } as Record<string, string>,
  goal: {strength: 'Force', hypertrophy: 'Hypertrophie', endurance: 'Endurance', power: 'Puissance'} as Record<string, string>,
  evidence: {strong: 'Preuve forte', moderate: 'Preuve modérée', limited: 'Preuve limitée', consensus: 'Consensus'} as Record<string, string>,
  sourceType: {
    scientific: 'Étude scientifique', guideline: 'Recommandation officielle',
    coach: 'Coach', dataset: 'Jeu de données', book: 'Ouvrage',
  } as Record<string, string>,
  theme: {
    'full-body': 'Full Body', 'upper-lower': 'Haut / Bas', ppl: 'Push Pull Legs',
    strength: 'Force', glutes: 'Fessiers', 'upper-body': 'Haut du corps',
    'fat-loss': 'Perte de gras', split: 'Split par muscle',
  } as Record<string, string>,
};

export const label = (kind: keyof typeof LABELS, value: string | null): string =>
  value ? (LABELS[kind][value] ?? value) : '';

/** Mode de saisie d'un exercice. */
export type MeasureKind = 'load' | 'bodyweight' | 'duration' | 'cardio';

const FREE_WEIGHT = new Set(['barbell', 'dumbbell', 'kettlebell', 'ez-bar']);
const NO_LOAD_ACCESSORY = new Set(['resistance-band', 'medicine-ball', 'stability-ball', 'other']);

/**
 * Mode de saisie :
 *  - cardio    : tapis, vélo… → durée (min)
 *  - duration  : gainage, isométrie, étirements, portés/traînés → durée (chrono)
 *  - bodyweight: poids du corps / accessoire sans charge chiffrable → reps seules
 *  - load      : charge externe → poids × reps
 *
 * On utilise EN PRIORITÉ la valeur stockée en base (`measureKind`, curée au seed
 * via deriveMeasureKind + data/measure_kind_overrides.json). À défaut (données
 * pré-migration), on retombe sur la même règle heuristique — GARDER SYNCHRO avec
 * deriveMeasureKind() de server/db/seed.ts.
 */
export function measureKind(ex: {
  category?: string | null;
  force?: string | null;
  equipmentId?: string | null;
  measureKind?: string | null;
}): MeasureKind {
  if (ex.measureKind) return ex.measureKind as MeasureKind;
  const cat = ex.category;
  const equip = ex.equipmentId ?? null;
  if (cat === 'cardio') return 'cardio';
  if (cat === 'stretching' || ex.force === 'static' || equip === 'foam-roller') return 'duration';
  if (cat === 'plyometrics') return equip && FREE_WEIGHT.has(equip) ? 'load' : 'bodyweight';
  if (cat === 'powerlifting' || cat === 'olympic_weightlifting') return 'load';
  if (equip === null || equip === 'bodyweight') return 'bodyweight';
  if (NO_LOAD_ACCESSORY.has(equip)) return 'bodyweight';
  return 'load';
}

/** Unité de la « valeur » d'une série selon le mode (vide = reps). */
export const KIND_UNIT: Record<MeasureKind, string> = {load: '', bodyweight: '', duration: 's', cardio: 'min'};

/** Images d'exécution (free-exercise-db, domaine public) servies depuis l'upstream. */
export const EXERCISE_IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
export const exerciseImageUrl = (path: string) => `${EXERCISE_IMAGE_BASE}${path}`;

/* ---- Accès HTTP ------------------------------------------------------- */
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return (await res.json()) as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || `Erreur ${res.status}`);
  return data as T;
}

export interface ExerciseQuery {
  search?: string;
  muscle?: string;
  equipment?: string;
  level?: string;
  category?: string;
  force?: string;
  ids?: string; // liste d'ids séparés par des virgules (favoris)
  page?: number;
}

export const api = {
  exercises: (query: ExerciseQuery = {}) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
    }
    const qs = params.toString();
    return get<ExercisesResponse>(`/exercises${qs ? `?${qs}` : ''}`);
  },
  exercise: (id: string) => get<ExerciseDetail>(`/exercises/${encodeURIComponent(id)}`),
  stretchSuggestions: (ids: string[]) =>
    get<{items: ExerciseListItem[]}>(`/exercises/stretch-suggestions?ids=${encodeURIComponent(ids.join(','))}`),
  facets: () => get<Facets>('/exercises/facets'),
  muscles: () => get<MuscleListItem[]>('/muscles'),
  muscle: (id: string) => get<MuscleDetail>(`/muscles/${encodeURIComponent(id)}`),
  principles: () => get<Principle[]>('/knowledge/principles'),
  repSchemes: () => get<RepScheme[]>('/knowledge/rep-schemes'),
  volumeLandmarks: () => get<VolumeLandmark[]>('/knowledge/volume-landmarks'),
  splits: () => get<Split[]>('/knowledge/splits'),
  sources: () => get<Source[]>('/knowledge/sources'),
  programs: () => get<ProgramListItem[]>('/programs'),
  program: (id: string) => get<ProgramDetail>(`/programs/${encodeURIComponent(id)}`),
};

export interface AuthUser {
  id: string;
  email: string;
}

export const authApi = {
  me: () => get<AuthUser>('/auth/me'),
  register: (email: string, password: string) => post<AuthUser>('/auth/register', {email, password}),
  login: (email: string, password: string) => post<AuthUser>('/auth/login', {email, password}),
  logout: () => post<{ok: boolean}>('/auth/logout', {}),
  changePassword: (currentPassword: string, newPassword: string) =>
    post<{ok: boolean}>('/auth/change-password', {currentPassword, newPassword}),
  deleteAccount: (password: string) => post<{ok: boolean}>('/auth/delete-account', {password}),
};
