/**
 * État d'authentification global (réactif). Repart du dernier utilisateur connu
 * (cache localStorage) pour que la PWA s'ouvre hors-ligne à la salle, puis
 * revalide la session (`/api/auth/me`) : un refus du serveur (401) déconnecte,
 * une panne réseau conserve l'état local. Cookie httpOnly géré par le navigateur.
 */
import {useSyncExternalStore} from 'react';
import {authApi, type AuthUser} from './api';

const UKEY = 'auth-user';

function readCachedUser(): AuthUser | null {
  try {
    return JSON.parse(localStorage.getItem(UKEY) || 'null') as AuthUser | null;
  } catch {
    return null;
  }
}
function cacheUser(u: AuthUser | null) {
  try {
    if (u) localStorage.setItem(UKEY, JSON.stringify(u));
    else localStorage.removeItem(UKEY);
  } catch {
    /* quota / mode privé */
  }
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

let state: AuthState = {user: readCachedUser(), loading: true};
const listeners = new Set<() => void>();

function set(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// Init : revalide la session une fois. `get` lève « Erreur <status> » quand le
// serveur a répondu (session invalide) ; toute autre erreur = réseau (hors-ligne).
authApi
  .me()
  .then((u) => {
    cacheUser(u);
    set({user: u, loading: false});
  })
  .catch((err) => {
    const rejected = err instanceof Error && /^Erreur \d+$/.test(err.message);
    if (rejected) cacheUser(null);
    set({user: rejected ? null : readCachedUser(), loading: false});
  });

export async function login(email: string, password: string) {
  const u = await authApi.login(email, password);
  cacheUser(u);
  set({user: u, loading: false});
}
export async function register(email: string, password: string) {
  const u = await authApi.register(email, password);
  cacheUser(u);
  set({user: u, loading: false});
}
export async function logout() {
  await authApi.logout();
  cacheUser(null);
  set({user: null, loading: false});
}
export async function changePassword(currentPassword: string, newPassword: string) {
  await authApi.changePassword(currentPassword, newPassword);
}
export async function deleteAccount(password: string) {
  await authApi.deleteAccount(password);
  cacheUser(null);
  set({user: null, loading: false});
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
