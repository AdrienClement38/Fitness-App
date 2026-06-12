/** Accès données « sync » : blobs JSONB par utilisateur, merge last-write-wins. */
import {eq, sql} from 'drizzle-orm';
import {db, schema} from '../db/client';
import {encryptData, decryptData} from '../crypto';

const {syncItems} = schema;

export interface SyncItem {
  kind: string;
  itemId: string;
  data: unknown; // null si supprimé
  updatedAt: string; // ISO
  deleted: boolean;
}

/** Upsert last-write-wins : n'écrase une ligne existante que si l'arrivant est plus récent. */
export async function upsertItems(userId: string, items: SyncItem[]) {
  for (const it of items) {
    const at = new Date(it.updatedAt);
    // Chiffré au repos (AES-256-GCM) si une clé serveur est configurée.
    const stored = encryptData(it.data ?? null);
    await db
      .insert(syncItems)
      .values({userId, kind: it.kind, itemId: it.itemId, data: stored, updatedAt: at, deleted: it.deleted})
      .onConflictDoUpdate({
        target: [syncItems.userId, syncItems.kind, syncItems.itemId],
        set: {data: stored, updatedAt: at, deleted: it.deleted},
        setWhere: sql`${syncItems.updatedAt} < ${at}`,
      });
  }
}

/** Tous les items d'un utilisateur (pour la réconciliation à la connexion). */
export async function listItems(userId: string): Promise<SyncItem[]> {
  const rows = await db.select().from(syncItems).where(eq(syncItems.userId, userId));
  return rows.map((r) => ({
    kind: r.kind,
    itemId: r.itemId,
    data: decryptData(r.data),
    updatedAt: r.updatedAt.toISOString(),
    deleted: r.deleted,
  }));
}
