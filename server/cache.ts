/**
 * Cache mémoire des réponses « catalogue » (données figées entre deux reseeds).
 * But : sous ressources serrées (free tier 0,25 CPU), éviter de re-requêter la DB +
 * re-sérialiser à chaque appel des données qui ne bougent pas (exos, programmes,
 * muscles, savoir). Mesuré : c'est le plus gros coût CPU des lectures.
 *
 *  - Routes INDÉPENDANTES de l'utilisateur (muscles, savoir, fiches, facettes) :
 *    1 entrée par URL ; un hit = zéro DB, zéro lookup de session.
 *  - Listes PERSONNALISÉES par matériel (exos/programmes) : 1 entrée par URL + signature
 *    matériel ; un hit = 1 lookup de session (indexé) au lieu de la requête catalogue + N+1.
 *
 * Le cache se vide au redémarrage (= à chaque déploiement, qui reseede). Un TTL borne la
 * péremption au cas où un reseed aurait lieu sans restart.
 */
import type {NextFunction, Request, Response} from 'express';
import {getUserFromRequest} from './auth';
import {hasEquipmentPref} from '../src/lib/equipment';

interface Entry {
  body: string;
  expires: number;
}

const store = new Map<string, Entry>();
const MAX_ENTRIES = 1000; // garde-fou mémoire (le catalogue réel tient en quelques dizaines d'entrées)

function remember(key: string, body: string, ttlMs: number) {
  if (store.has(key)) store.delete(key); // réinsère en fin → ordre LRU (Map garde l'ordre d'insertion)
  store.set(key, {body, expires: Date.now() + ttlMs});
  if (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
}

/** Signature stable du matériel de l'utilisateur (« neutre » si non renseigné / anonyme). */
async function equipmentSig(req: Request): Promise<string> {
  const user = await getUserFromRequest(req);
  if (!user || !hasEquipmentPref(user.equipment)) return 'neutre';
  return [...(user.equipment as string[])].sort().join(',') || 'aucun';
}

/**
 * Middleware de cache pour une route GET catalogue.
 * @param ttlMs durée de vie d'une entrée.
 * @param varyByEquipment la réponse dépend du matériel (listes exos/programmes).
 * @param cacheControl en-tête Cache-Control posé (cache navigateur / PWA).
 */
export function cacheRoute(opts: {ttlMs: number; varyByEquipment?: boolean; cacheControl?: string}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sig = opts.varyByEquipment ? await equipmentSig(req) : 'static';
      const key = `${req.originalUrl}|${sig}`;
      const hit = store.get(key);
      if (hit && hit.expires > Date.now()) {
        if (opts.cacheControl) res.setHeader('Cache-Control', opts.cacheControl);
        res.setHeader('X-Cache', 'HIT');
        res.type('application/json').send(hit.body);
        return;
      }
      // Pas (ou plus) en cache : on enveloppe res.json pour mémoriser la réponse 200.
      const orig = res.json.bind(res);
      res.json = ((body: unknown) => {
        if (res.statusCode === 200) {
          remember(key, JSON.stringify(body), opts.ttlMs);
          if (opts.cacheControl) res.setHeader('Cache-Control', opts.cacheControl);
        }
        res.setHeader('X-Cache', 'MISS');
        return orig(body);
      }) as Response['json'];
      next();
    } catch (err) {
      next(err as Error);
    }
  };
}

/** Catalogue indépendant de l'utilisateur (muscles, savoir, fiches, facettes). */
export const cacheStatic = () => cacheRoute({ttlMs: 10 * 60_000, cacheControl: 'public, max-age=600'});

/** Liste personnalisée par matériel (exos / programmes) : varie selon l'équipement. */
export const cacheEquipmentList = () => cacheRoute({ttlMs: 5 * 60_000, varyByEquipment: true, cacheControl: 'private, max-age=60'});
