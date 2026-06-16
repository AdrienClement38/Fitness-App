/** Client API typé. Same-origin : l'app et l'API sont servies par le même Express. */
import {deriveMeasureKind, type MeasureKind} from './measureKindRule';

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
  audience: 'female' | 'male' | 'all' | null; // public cible (mise en avant)
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
  goal: {strength: 'Force', hypertrophy: 'Prise de muscle', endurance: 'Endurance', power: 'Puissance'} as Record<string, string>,
  evidence: {strong: 'Preuve forte', moderate: 'Preuve modérée', limited: 'Preuve limitée', consensus: 'Consensus'} as Record<string, string>,
  sourceType: {
    scientific: 'Étude scientifique', guideline: 'Recommandation officielle',
    coach: 'Coach', dataset: 'Jeu de données', book: 'Ouvrage',
  } as Record<string, string>,
  theme: {
    'full-body': 'Full Body', 'upper-lower': 'Haut / Bas', ppl: 'Poussé / Tiré / Jambes',
    strength: 'Force', glutes: 'Fessiers', 'upper-body': 'Haut du corps',
    'fat-loss': 'Perte de gras', split: 'Par muscle', cardio: 'Cardio',
  } as Record<string, string>,
};

export const label = (kind: keyof typeof LABELS, value: string | null): string =>
  value ? (LABELS[kind][value] ?? value) : '';

/** Mode de saisie d'un exercice (type réexporté depuis la règle partagée). */
export type {MeasureKind};

/**
 * Mode de saisie d'un exercice. Valeur STOCKÉE en base prioritaire (curée au seed
 * via measure_kind_overrides.json) ; à défaut (données pré-migration), fallback sur
 * la règle PARTAGÉE deriveMeasureKind (src/lib/measureKindRule.ts) — une seule source.
 */
export function measureKind(ex: {
  category?: string | null;
  force?: string | null;
  equipmentId?: string | null;
  measureKind?: string | null;
}): MeasureKind {
  if (ex.measureKind) return ex.measureKind as MeasureKind;
  return deriveMeasureKind(ex.category ?? null, ex.force ?? null, ex.equipmentId ?? null);
}

/** Entrée minimale d'un exercice pour démarrer/ajouter une séance (liste OU fiche détail). */
export interface ExerciseSeedInput {
  id: string;
  nameFr: string | null;
  nameEn: string;
  force: string | null;
  category: string | null;
  measureKind?: string | null;
  equipmentId: string | null;
}

/** Défauts de prescription (séries · reps/durée · repos) selon le mode de saisie. */
export const PRESCRIPTION_DEFAULTS: Record<MeasureKind, {sets: number; min: number; max: number; rest: number}> = {
  load: {sets: 3, min: 8, max: 12, rest: 90},
  bodyweight: {sets: 3, min: 10, max: 15, rest: 60},
  duration: {sets: 3, min: 30, max: 45, rest: 60},
  cardio: {sets: 1, min: 15, max: 20, rest: 0},
};

/** Unité de la « valeur » d'une série selon le mode (vide = reps). */
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

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, {method: 'DELETE'});
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
  appStatus: () => get<PublicAppStatus>('/app-status'),
};

/** État applicatif public : bandeau d'annonce (si actif) + mode maintenance. */
export interface PublicAppStatus {
  announcement: {message: string; tone: 'info' | 'warn'} | null;
  maintenance: {active: boolean; message: string};
}

export type Gender = 'male' | 'female';

export interface AuthUser {
  id: string;
  email: string;
  role?: string; // 'user' | 'admin' (optionnel : compatible cache pré-migration)
  emailVerified?: boolean;
  gender?: Gender | null; // null/absent = préfère ne pas dire
}

export const authApi = {
  me: () => get<AuthUser>('/auth/me'),
  // `gender` optionnel ; `website` = honeypot anti-bot (champ caché ; vide pour un humain).
  register: (email: string, password: string, gender: Gender | null = null, website = '') =>
    post<AuthUser>('/auth/register', {email, password, gender, website}),
  login: (email: string, password: string) => post<AuthUser>('/auth/login', {email, password}),
  logout: () => post<{ok: boolean}>('/auth/logout', {}),
  changePassword: (currentPassword: string, newPassword: string) =>
    post<{ok: boolean}>('/auth/change-password', {currentPassword, newPassword}),
  deleteAccount: (password: string) => post<{ok: boolean}>('/auth/delete-account', {password}),
  verifyEmail: (token: string) => post<{ok: boolean}>('/auth/verify-email', {token}),
  resendVerification: () => post<{ok: boolean; alreadyVerified?: boolean}>('/auth/resend-verification', {}),
  forgotPassword: (email: string) => post<{ok: boolean}>('/auth/forgot-password', {email}),
  resetPassword: (token: string, newPassword: string) => post<{ok: boolean}>('/auth/reset-password', {token, newPassword}),
  setGender: (gender: Gender | null) => post<{ok: boolean; gender: Gender | null}>('/auth/gender', {gender}),
};

/** Administration : un compte de la liste (infos de compte uniquement). */
export interface AdminUser {
  id: string;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  workoutLogs: number;
  myPrograms: number;
}

/** État de la config SMTP côté admin (jamais le mot de passe en clair). */
export interface SmtpStatus {
  host: string;
  port: number;
  user: string;
  from: string;
  hasPass: boolean; // un mot de passe est stocké
  source: 'db' | 'env' | 'none'; // d'où vient la config réellement utilisée
  envFallback: boolean; // des variables d'env SMTP existent (repli)
}

/** Champs éditables de la config SMTP. `pass` vide = conserver le mot de passe stocké. */
export interface SmtpInput {
  host: string;
  port: number;
  user: string;
  from?: string;
  pass?: string;
}

/** Statistiques d'usage du tableau de bord admin. */
export interface AdminStats {
  users: {total: number; verified: number; unverified: number; admins: number; last7: number; last30: number};
  content: {workoutLogs: number; myPrograms: number; favorites: number};
  recentSignups: {email: string; createdAt: string; emailVerified: boolean; role: string}[];
}

export const adminApi = {
  stats: () => get<AdminStats>('/admin/stats'),
  users: () => get<AdminUser[]>('/admin/users'),
  deleteUser: (id: string) => del<{ok: boolean}>(`/admin/users/${encodeURIComponent(id)}`),
  setRole: (id: string, role: 'user' | 'admin') =>
    post<{ok: boolean; role: string}>(`/admin/users/${encodeURIComponent(id)}/role`, {role}),
  resetPassword: (id: string) => post<{tempPassword: string}>(`/admin/users/${encodeURIComponent(id)}/reset-password`, {}),
  smtp: () => get<SmtpStatus>('/admin/settings/smtp'),
  saveSmtp: (input: SmtpInput) => post<SmtpStatus>('/admin/settings/smtp', input),
  deleteSmtp: () => del<SmtpStatus>('/admin/settings/smtp'),
  testEmail: (input: Partial<SmtpInput> & {to?: string}) =>
    post<{ok: boolean; to: string}>('/admin/settings/test-email', input),
  appStatus: () => get<AdminAppStatus>('/admin/settings/app'),
  setAnnouncement: (a: AdminAppStatus['announcement']) => post<AdminAppStatus>('/admin/settings/announcement', a),
  setMaintenance: (m: AdminAppStatus['maintenance']) => post<AdminAppStatus>('/admin/settings/maintenance', m),
};

/** Vue admin de l'état applicatif (config complète et éditable). */
export interface AdminAppStatus {
  announcement: {message: string; tone: 'info' | 'warn'; active: boolean};
  maintenance: {active: boolean; message: string};
}
