/**
 * Planning hebdo RÉCURRENT : pour chaque jour (lun..dim) une séance planifiée
 * (référence programme + nom de séance) ou rien (repos). La même grille chaque
 * semaine. Stocké en localStorage, synchronisé par compte (1 item unique, LWW),
 * comme le profil. On garde une RÉFÉRENCE (pas une copie) -> affichage + lien.
 */
import {useSyncExternalStore} from 'react';
import {pushItems, registerCollection, type SyncItem} from './sync';

export interface PlanSlot {
  programId: string;
  programMine: boolean; // true = "mes programmes" (/mes-programmes/:id) ; false = catalogue (/programmes/:id)
  programName: string;
  sessionName: string;
}
/** Grille de 7 jours, index 0 = lundi ... 6 = dimanche. */
export type WeekPlan = (PlanSlot | null)[];

export const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const DAY_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const KEY = 'salle-weekly-plan';
const KIND = 'weekly-plan';
const ITEM = 'me';
const EPOCH = '1970-01-01T00:00:00.000Z';
const now = () => new Date().toISOString();

interface Stored {
  days: WeekPlan;
  updatedAt: string;
}

const empty = (): WeekPlan => [null, null, null, null, null, null, null];

/** Reconstruit une grille saine de 7 jours depuis des données quelconques (tolérant). */
function normalize(days: unknown): WeekPlan {
  const src = Array.isArray(days) ? days : [];
  const out = empty();
  for (let i = 0; i < 7; i += 1) {
    const d = src[i] as Partial<PlanSlot> | null | undefined;
    out[i] =
      d && typeof d === 'object' && typeof d.programId === 'string'
        ? {programId: d.programId, programMine: !!d.programMine, programName: String(d.programName ?? ''), sessionName: String(d.sessionName ?? '')}
        : null;
  }
  return out;
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Stored>;
      return {days: normalize(s.days), updatedAt: s.updatedAt ?? EPOCH};
    }
  } catch {
    /* quota / mode privé */
  }
  return {days: empty(), updatedAt: EPOCH};
}

let store = read();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}
function commit(days: WeekPlan) {
  store = {days, updatedAt: now()};
  save();
  emit();
  pushItems([{kind: KIND, itemId: ITEM, data: store, updatedAt: store.updatedAt, deleted: false}]);
}

/** Planifie (slot) ou efface (null) la séance du jour `day` (0=lundi..6=dimanche). */
export function setPlanSlot(day: number, slot: PlanSlot | null) {
  if (day < 0 || day > 6) return;
  const days = store.days.slice();
  days[day] = slot;
  commit(days);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
export function useWeeklyPlan(): WeekPlan {
  return useSyncExternalStore(subscribe, () => store.days, () => store.days);
}

/** Jour de la semaine façon « lundi=0..dimanche=6 » depuis une date ISO. */
export function weekdayIndex(iso: string): number {
  return (new Date(iso).getDay() + 6) % 7;
}

export interface NextPlanned {
  day: number; // 0..6
  slot: PlanSlot;
  isToday: boolean;
  inDays: number; // 0 = aujourd'hui, 1 = demain...
}
/** Prochaine séance planifiée à partir d'aujourd'hui (inclus), en bouclant sur la semaine. */
export function nextPlanned(days: WeekPlan, nowIso: string = new Date().toISOString()): NextPlanned | null {
  const today = weekdayIndex(nowIso);
  for (let offset = 0; offset < 7; offset += 1) {
    const day = (today + offset) % 7;
    const slot = days[day];
    if (slot) return {day, slot, isToday: offset === 0, inDays: offset};
  }
  return null;
}

/** Nombre de jours planifiés dans la semaine. */
export function plannedCount(days: WeekPlan): number {
  return days.filter(Boolean).length;
}

/* ---- Synchronisation (LWW sur l'unique item) --------------------------- */
function snapshot(): SyncItem[] {
  return [{kind: KIND, itemId: ITEM, data: store, updatedAt: store.updatedAt, deleted: false}];
}
function applyRemote(items: SyncItem[]) {
  let changed = false;
  for (const it of items) {
    if (it.itemId !== ITEM || it.deleted) continue;
    const incoming = it.data as Partial<Stored> | null;
    if (incoming && it.updatedAt > store.updatedAt) {
      store = {days: normalize(incoming.days), updatedAt: it.updatedAt};
      changed = true;
    }
  }
  if (changed) {
    save();
    emit();
  }
}
/** Purge locale (changement / suppression de compte). */
function clear() {
  store = {days: empty(), updatedAt: EPOCH};
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* quota */
  }
  emit();
}

registerCollection(KIND, {snapshot, applyRemote, clear});
