/**
 * Trophées : paliers CUMULATIFS (à vie) calculés côté client. Positif et sans pression
 * (aucun objectif à tenir, juste du cumul qui ne redescend jamais). Dérivé des séances
 * courantes + du report de purge par séance (cf. lifetimeTotals.ts) — zéro logique serveur.
 */
import type {WorkoutLog} from './workoutLogs';

/** Contribution figée d'une séance purgée (report indexé par id de séance). */
export interface CarryEntry {
  tonnageKg: number;
  cardioMin: number;
}
/** Report de purge : une entrée immuable par id de séance (ensemble additif / OR-Set). */
export type CarryEntries = Record<string, CarryEntry>;

export interface LifetimeTotals {
  tonnageKg: number; // fonte soulevée = somme poids×reps des séries faites (kg)
  cardioMin: number; // temps de cardio (minutes)
  sessions: number; // nombre de séances « réelles » (au moins une série faite)
}

/** Une séance compte si au moins une série a été validée. */
export function isRealSession(log: WorkoutLog): boolean {
  return log.exercises.some((e) => e.sets.some((s) => s.done));
}

/** Fonte soulevée d'une séance (kg) = somme poids×reps des séries faites (clampé ≥ 0). */
export function logTonnageKg(log: WorkoutLog): number {
  let v = 0;
  for (const ex of log.exercises) for (const s of ex.sets) if (s.done && s.weight != null && s.reps != null) v += Math.max(0, s.weight) * Math.max(0, s.reps);
  return v;
}

/** Minutes de cardio d'une séance (temps d'EFFORT ; les séries cardio stockent les minutes dans `reps`). */
export function logCardioMinutes(log: WorkoutLog): number {
  let m = 0;
  for (const ex of log.exercises) {
    if (ex.kind !== 'cardio') continue;
    for (const s of ex.sets) if (s.done && s.reps != null) m += Math.max(0, s.reps);
  }
  return m;
}

/** Contribution cumulée d'un lot de séances (réelles uniquement). */
export function sumContribution(logs: WorkoutLog[]): LifetimeTotals {
  const out: LifetimeTotals = {tonnageKg: 0, cardioMin: 0, sessions: 0};
  for (const l of logs) {
    if (!isRealSession(l)) continue;
    out.tonnageKg += logTonnageKg(l);
    out.cardioMin += logCardioMinutes(l);
    out.sessions += 1;
  }
  return out;
}

/**
 * Totaux à vie = report de purge (par séance) + séances courantes, DÉDUPLIQUÉS par id :
 * une séance déjà dans le report n'est jamais recomptée depuis les logs courants (évite le
 * double-comptage transitoire quand le report arrive avant la suppression de la séance).
 */
export function lifetimeTotals(logs: WorkoutLog[], carry: CarryEntries): LifetimeTotals {
  const ids = new Set(Object.keys(carry));
  let tonnageKg = 0;
  let cardioMin = 0;
  let sessions = 0;
  for (const id of ids) {
    tonnageKg += carry[id].tonnageKg;
    cardioMin += carry[id].cardioMin;
    sessions += 1;
  }
  for (const log of logs) {
    if (!isRealSession(log) || ids.has(log.id)) continue;
    tonnageKg += logTonnageKg(log);
    cardioMin += logCardioMinutes(log);
    sessions += 1;
  }
  return {tonnageKg, cardioMin, sessions};
}

/* ---- Paliers ---------------------------------------------------------- */

const groupThousands = (s: string): string => s.replace(/\B(?=(\d{3})+(?!\d))/g, ' '); // séparateur de milliers (l'UI met whitespace-nowrap)
/** Entier tronqué (jamais surestimé) : 9.9 -> « 9 », 25000 -> « 25 000 ». */
const frInt = (n: number): string => groupThousands(String(Math.max(0, Math.floor(Number.isFinite(n) ? n : 0))));
/** Une décimale, tronquée (jamais surestimé) : 0.5 -> « 0,5 », 9.99 -> « 9,9 », 2340 -> « 2 340 ». */
const frDec1 = (n: number): string => {
  const v = Math.max(0, Math.floor((Number.isFinite(n) ? n : 0) * 10) / 10);
  const whole = Math.floor(v);
  const dec = Math.round((v - whole) * 10);
  return dec > 0 ? `${groupThousands(String(whole))},${dec}` : groupThousands(String(whole));
};

export interface CategoryDef {
  key: 'tonnage' | 'cardio' | 'sessions';
  nameFr: string;
  icon: string; // clé d'icône, mappée en composant lucide côté UI
  tiers: number[]; // valeurs cumulées, unité interne (kg / minutes / nb), croissantes
  format: (v: number) => string; // paliers : entier tronqué
  formatTotal: (v: number) => string; // total courant : plus fin (décimale sous le 1er palier)
}

export const CATEGORIES: CategoryDef[] = [
  {key: 'tonnage', nameFr: 'Fonte soulevée', icon: 'dumbbell', tiers: [10000, 50000, 100000, 500000, 1000000, 5000000, 10000000, 25000000], format: (kg) => `${frInt(kg / 1000)} T`, formatTotal: (kg) => `${frDec1(kg / 1000)} T`},
  {key: 'cardio', nameFr: 'Temps de cardio', icon: 'run', tiers: [60, 300, 600, 1500, 3000, 6000, 15000, 30000], format: (min) => `${frInt(min / 60)} h`, formatTotal: (min) => `${frDec1(min / 60)} h`},
  {key: 'sessions', nameFr: 'Séances', icon: 'calendar', tiers: [5, 10, 25, 50, 100, 250, 500, 1000], format: (n) => frInt(n), formatTotal: (n) => frInt(n)},
];

export interface TierView {
  label: string;
  reached: boolean;
  isNext: boolean;
}
export interface CategoryView {
  key: string;
  nameFr: string;
  icon: string;
  total: number;
  totalLabel: string;
  tiers: TierView[];
  nextLabel: string | null; // null = tous les paliers atteints
  currentLabel: string;
  targetLabel: string;
  pct: number; // progression vers le prochain palier (0..99 tant que non atteint, 100 si tout atteint)
}

function categoryView(def: CategoryDef, total: number): CategoryView {
  const nextIdx = def.tiers.findIndex((t) => total < t);
  const next = nextIdx >= 0 ? def.tiers[nextIdx] : null;
  return {
    key: def.key,
    nameFr: def.nameFr,
    icon: def.icon,
    total,
    totalLabel: def.formatTotal(total),
    tiers: def.tiers.map((t, i) => ({label: def.format(t), reached: total >= t, isNext: i === nextIdx})),
    nextLabel: next != null ? def.format(next) : null,
    currentLabel: def.formatTotal(total),
    targetLabel: def.format(next ?? def.tiers[def.tiers.length - 1]),
    // Barre : jamais 100 % tant que le palier n'est pas atteint (sinon barre pleine sous une tuile verrouillée).
    pct: next != null ? Math.min(99, Math.floor((total / next) * 100)) : 100,
  };
}

/** Vue complète des trophées à partir des totaux à vie. */
export function achievements(totals: LifetimeTotals): CategoryView[] {
  return [
    categoryView(CATEGORIES[0], totals.tonnageKg),
    categoryView(CATEGORIES[1], totals.cardioMin),
    categoryView(CATEGORIES[2], totals.sessions),
  ];
}
