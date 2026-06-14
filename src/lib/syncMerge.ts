/**
 * Logique de merge de synchronisation — PURE (aucun accès navigateur / localStorage),
 * pour être testable en Vitest. Last-write-wins par `updatedAt` (chaînes ISO,
 * comparables lexicographiquement).
 */
import type {SyncItem} from './sync';

/**
 * Merge d'une collection {id -> item} + tombstones {id -> updatedAt} contre des
 * items entrants. Mute les Maps passées. Pour les stores dont l'item EST le blob
 * synchronisé (séances, programmes).
 */
export function mergeCollection<T>(
  items: Map<string, T>,
  tombstones: Map<string, string>,
  incoming: SyncItem[],
  getUpdatedAt: (item: T) => string,
  tombstoneFloor?: string, // ISO : on n'accumule pas les tombstones plus vieux que ça (cf. workoutLogs)
): {itemsChanged: boolean; tombstonesChanged: boolean} {
  let itemsChanged = false;
  let tombstonesChanged = false;
  for (const it of incoming) {
    const local = items.get(it.itemId);
    const localAt = local ? getUpdatedAt(local) : tombstones.get(it.itemId);
    if (localAt && localAt >= it.updatedAt) continue; // le nôtre est aussi récent ou plus
    if (it.deleted) {
      // Suppression très ancienne ET déjà absente localement : on ne recrée pas un
      // tombstone éternel (l'item a disparu partout) -> borne la croissance du blob de sync.
      if (!local && tombstoneFloor && it.updatedAt < tombstoneFloor) continue;
      if (local) {
        items.delete(it.itemId);
        itemsChanged = true;
      }
      tombstones.set(it.itemId, it.updatedAt);
      tombstonesChanged = true;
    } else {
      items.set(it.itemId, it.data as T);
      itemsChanged = true;
      if (tombstones.delete(it.itemId)) tombstonesChanged = true;
    }
  }
  return {itemsChanged, tombstonesChanged};
}

export interface FavState {
  deleted: boolean; // true = retiré des favoris
  updatedAt: string;
}

/** Merge des favoris (état plat {id -> {deleted, updatedAt}}). Mute `meta`. */
export function mergeFavorites(meta: Record<string, FavState>, incoming: SyncItem[]): boolean {
  let changed = false;
  for (const it of incoming) {
    const local = meta[it.itemId];
    if (local && local.updatedAt >= it.updatedAt) continue;
    meta[it.itemId] = {deleted: it.deleted, updatedAt: it.updatedAt};
    changed = true;
  }
  return changed;
}
