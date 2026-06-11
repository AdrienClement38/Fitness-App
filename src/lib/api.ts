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
};

export const label = (kind: keyof typeof LABELS, value: string | null): string =>
  value ? (LABELS[kind][value] ?? value) : '';

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
  facets: () => get<Facets>('/exercises/facets'),
  muscles: () => get<MuscleListItem[]>('/muscles'),
  muscle: (id: string) => get<MuscleDetail>(`/muscles/${encodeURIComponent(id)}`),
  principles: () => get<Principle[]>('/knowledge/principles'),
  repSchemes: () => get<RepScheme[]>('/knowledge/rep-schemes'),
  volumeLandmarks: () => get<VolumeLandmark[]>('/knowledge/volume-landmarks'),
  splits: () => get<Split[]>('/knowledge/splits'),
  sources: () => get<Source[]>('/knowledge/sources'),
};
