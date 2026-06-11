/**
 * État d'authentification global (réactif). Au chargement, demande « qui suis-je »
 * (`/api/auth/me`) ; expose login / register / logout. Cookie httpOnly géré par
 * le navigateur (same-origin), donc rien à stocker côté JS.
 */
import {useSyncExternalStore} from 'react';
import {authApi, type AuthUser} from './api';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

let state: AuthState = {user: null, loading: true};
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

// Init : résout la session courante une fois.
authApi
  .me()
  .then((u) => set({user: u, loading: false}))
  .catch(() => set({user: null, loading: false}));

export async function login(email: string, password: string) {
  set({user: await authApi.login(email, password), loading: false});
}
export async function register(email: string, password: string) {
  set({user: await authApi.register(email, password), loading: false});
}
export async function logout() {
  await authApi.logout();
  set({user: null, loading: false});
}
export async function changePassword(currentPassword: string, newPassword: string) {
  await authApi.changePassword(currentPassword, newPassword);
}
export async function deleteAccount(password: string) {
  await authApi.deleteAccount(password);
  set({user: null, loading: false});
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
