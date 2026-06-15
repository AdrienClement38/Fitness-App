/**
 * Accès données « paramètres applicatifs » (table `app_settings`) : un simple
 * magasin clé -> valeur JSON, lu/écrit par l'admin (ex. config SMTP). La logique
 * métier (chiffrement du mot de passe, masquage) vit dans les appelants — ici on
 * ne fait que persister/lire la valeur brute.
 */
import {eq} from 'drizzle-orm';
import {db, schema} from '../db/client';

const {appSettings} = schema;

/** Lit un paramètre (valeur JSON brute) ou null si absent. */
export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return (row?.value as T) ?? null;
}

/** Crée ou met à jour un paramètre (upsert). */
export async function setSetting(key: string, value: unknown): Promise<void> {
  await db
    .insert(appSettings)
    .values({key, value, updatedAt: new Date()})
    .onConflictDoUpdate({target: appSettings.key, set: {value, updatedAt: new Date()}});
}

/** Supprime un paramètre (retour au repli env/dev). No-op si absent. */
export async function deleteSetting(key: string): Promise<void> {
  await db.delete(appSettings).where(eq(appSettings.key, key));
}
