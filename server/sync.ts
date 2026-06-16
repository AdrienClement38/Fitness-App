/**
 * Synchronisation temps réel par WebSocket. Le serveur reste léger : il
 * authentifie via le cookie de session, regroupe les connexions d'un même
 * utilisateur dans un « salon », persiste les blobs (last-write-wins) et
 * rediffuse aux autres appareils. Tout le merge se fait côté client.
 */
import type {IncomingMessage, Server} from 'node:http';
import {WebSocket, WebSocketServer} from 'ws';
import {z} from 'zod';
import {getAuthUserByCookie} from './auth';
import {listItems, upsertItems, type SyncItem} from './repositories/syncRepository';

// userId -> connexions ouvertes (un salon par utilisateur).
const rooms = new Map<string, Set<WebSocket>>();

// Validation des items entrants : borne la taille et rejette les dates invalides
// (qui empoisonneraient le last-write-wins). `data` reste un blob libre.
const incomingItem = z.object({
  kind: z.string().min(1).max(64),
  itemId: z.string().min(1).max(256),
  data: z.unknown(),
  updatedAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'date invalide'),
  deleted: z.boolean(),
});
const pushMessage = z.object({type: z.literal('push'), items: z.array(incomingItem).max(10000)});

/** Même origine (ou dev local) : refuse un handshake WS cross-site (CSWSH). */
function originAllowed(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (!origin) return true; // client non-navigateur : pas de cookie cross-site possible
  let oHost: string;
  try {
    oHost = new URL(origin).host;
  } catch {
    return false;
  }
  if (oHost === req.headers.host) return true; // même origine (le cas du PWA)
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(oHost)) return true; // dev (Vite)
  const allow = (process.env.ALLOWED_WS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return allow.includes(origin) || allow.includes(oHost);
}

function join(userId: string, ws: WebSocket) {
  let set = rooms.get(userId);
  if (!set) {
    set = new Set();
    rooms.set(userId, set);
  }
  set.add(ws);
}
function leave(userId: string, ws: WebSocket) {
  const set = rooms.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) rooms.delete(userId);
}
function broadcast(userId: string, from: WebSocket, payload: unknown) {
  const set = rooms.get(userId);
  if (!set) return;
  const msg = JSON.stringify(payload);
  for (const ws of set) {
    if (ws !== from && ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

/**
 * Pousse un message à TOUTES les sockets d'un utilisateur (sur tous ses appareils).
 * Sert à propager un changement d'ÉTAT DE COMPTE (email confirmé, sexe, rôle) : chaque
 * appareil rafraîchit alors son `/me` -> le bandeau « confirme ton email » disparaît
 * partout, le logo / les programmes suggérés se mettent à jour, etc.
 */
export function notifyUser(userId: string, payload: unknown) {
  const set = rooms.get(userId);
  if (!set) return;
  const msg = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

/** Ferme les sockets d'un utilisateur (révocation : changement de mdp / suppression). */
export function closeUserSockets(userId: string) {
  const set = rooms.get(userId);
  if (!set) return;
  for (const ws of [...set]) {
    try {
      ws.close(4001, 'session revoked');
    } catch {
      /* ignore */
    }
  }
}

export function attachSync(server: Server) {
  // maxPayload borne la RAM : un message > 4 Mio est rejeté (sinon défaut 100 Mio,
  // tenable sur 256 Mo). Couvre largement le snapshot complet d'un gros historique.
  const wss = new WebSocketServer({noServer: true, maxPayload: 4 * 1024 * 1024});

  // On ne capte que /ws : les autres upgrades (HMR de Vite en dev) passent.
  server.on('upgrade', (req, socket, head) => {
    let pathname = '';
    try {
      pathname = new URL(req.url ?? '', 'http://localhost').pathname;
    } catch {
      pathname = '';
    }
    if (pathname !== '/ws') return;
    if (!originAllowed(req)) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  wss.on('connection', async (ws, req) => {
    const user = await getAuthUserByCookie(req.headers.cookie);
    if (!user) {
      ws.close(4001, 'unauthorized');
      return;
    }
    const userId = user.id;
    join(userId, ws);
    ws.send(JSON.stringify({type: 'ready'}));

    ws.on('message', async (raw) => {
      let msg: unknown;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      const type = (msg as {type?: unknown}).type;
      try {
        if (type === 'pull') {
          ws.send(JSON.stringify({type: 'items', items: await listItems(userId)}));
        } else if (type === 'push') {
          const parsed = pushMessage.safeParse(msg);
          if (!parsed.success || parsed.data.items.length === 0) return;
          const items: SyncItem[] = parsed.data.items.map((it) => ({
            kind: it.kind,
            itemId: it.itemId,
            data: it.data ?? null,
            updatedAt: it.updatedAt,
            deleted: it.deleted,
          }));
          await upsertItems(userId, items);
          broadcast(userId, ws, {type: 'items', items});
        }
      } catch (err) {
        // Une erreur (DB, etc.) ne doit jamais tuer le process : on isole ce message.
        console.error('[sync] message error:', (err as Error).message);
      }
    });

    ws.on('close', () => leave(userId, ws));
    ws.on('error', () => leave(userId, ws));
  });
}
