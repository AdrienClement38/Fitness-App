/**
 * État d'authentification global (réactif). Repart du dernier utilisateur connu
 * (cache localStorage) pour que la PWA s'ouvre hors-ligne à la salle, puis
 * revalide la session (`/api/auth/me`) : un refus du serveur (401) déconnecte,
 * une panne réseau conserve l'état local. Cookie httpOnly géré par le navigateur.
 */
import {useSyncExternalStore} from 'react';
import {authApi, type AuthUser, type Gender} from './api';
import {clearLocalData} from './sync';

const UKEY = 'auth-user';
const OWNER_KEY = 'sync-data-owner'; // à quel compte appartiennent les données locales synchronisées

function getDataOwner(): string | null {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}
/**
 * À l'authentification : on ne CONSERVE les données locales (séances, programmes, favoris)
 * que si elles appartiennent de façon CERTAINE au compte qui se connecte, c.-à-d. si le
 * marqueur `sync-data-owner` vaut exactement son userId. Dans TOUS les autres cas —
 * propriétaire différent OU inconnu (`null` : autre navigateur, données héritées d'un
 * compte supprimé puis recréé…) — on PURGE le local ; la sync (pull serveur, source de
 * vérité) restaure ensuite les vraies données du compte. Ainsi un appareil ne peut jamais
 * réinjecter les données d'un compte dans un autre. (Une donnée créée hors-ligne et jamais
 * synchronisée sur un appareil au propriétaire inconnu peut être perdue — cas marginal,
 * acceptable face à la garantie d'isolation.)
 */
function adoptUserData(userId: string) {
  if (getDataOwner() !== userId) clearLocalData();
  try {
    localStorage.setItem(OWNER_KEY, userId);
  } catch {
    /* quota / mode privé */
  }
}
function forgetDataOwner() {
  try {
    localStorage.removeItem(OWNER_KEY);
  } catch {
    /* ignore */
  }
}

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
    adoptUserData(u.id);
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
  adoptUserData(u.id);
  cacheUser(u);
  set({user: u, loading: false});
}
export async function register(email: string, password: string, gender: Gender | null = null, website = '') {
  const u = await authApi.register(email, password, gender, website);
  adoptUserData(u.id);
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
  // Compte supprimé : on efface toutes ses données locales (séances, programmes, favoris…).
  clearLocalData();
  forgetDataOwner();
  cacheUser(null);
  set({user: null, loading: false});
}

/** Re-synchronise l'utilisateur depuis le serveur (ex. après confirmation d'email). */
export async function refreshUser() {
  try {
    const u = await authApi.me();
    cacheUser(u);
    set({user: u, loading: false});
  } catch {
    /* panne réseau : on conserve l'état courant */
  }
}

/** Renvoie l'email de confirmation (utilisateur connecté non vérifié). */
export function resendVerification() {
  return authApi.resendVerification();
}

/** Met à jour son sexe puis rafraîchit l'utilisateur (logo + programmes suggérés réagissent). */
export async function setGender(gender: Gender | null) {
  await authApi.setGender(gender);
  await refreshUser();
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
