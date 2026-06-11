/**
 * Synchronisation temps réel par WebSocket. Le serveur reste léger : il
 * authentifie via le cookie de session, regroupe les connexions d'un même
 * utilisateur dans un « salon », persiste les blobs (last-write-wins) et
 * rediffuse aux autres appareils. Tout le merge se fait côté client.
 */
import type {Server} from 'node:http';
import {WebSocket, WebSocketServer} from 'ws';
import {getAuthUserByCookie} from './auth';
import {listItems, upsertItems, type SyncItem} from './repositories/syncRepository';

// userId -> connexions ouvertes (un salon par utilisateur).
const rooms = new Map<string, Set<WebSocket>>();

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

export function attachSync(server: Server) {
  const wss = new WebSocketServer({noServer: true});

  // On ne capte que /ws : les autres upgrades (HMR de Vite en dev) passent.
  server.on('upgrade', (req, socket, head) => {
    let pathname = '';
    try {
      pathname = new URL(req.url ?? '', 'http://localhost').pathname;
    } catch {
      pathname = '';
    }
    if (pathname !== '/ws') return;
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
      let msg: {type?: string; items?: SyncItem[]};
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.type === 'pull') {
        ws.send(JSON.stringify({type: 'items', items: await listItems(userId)}));
      } else if (msg.type === 'push' && Array.isArray(msg.items)) {
        await upsertItems(userId, msg.items);
        broadcast(userId, ws, {type: 'items', items: msg.items});
      }
    });

    ws.on('close', () => leave(userId, ws));
    ws.on('error', () => leave(userId, ws));
  });
}
