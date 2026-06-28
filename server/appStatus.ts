/**
 * État applicatif global éditable par l'admin : bandeau d'annonce + mode
 * maintenance. Stocké en base (table `app_settings`) mais **mis en cache mémoire**
 * pour ne pas faire de requête DB à chaque appel (lu sur le chemin chaud : le garde
 * de maintenance + l'endpoint public d'état). Chargé au démarrage, rafraîchi à
 * chaque écriture admin. Instance unique sur AlwaysData → cache simple suffisant.
 */
import {randomBytes} from 'node:crypto';
import {getSetting, setSetting} from './repositories/settingsRepository';
import {googleConfigured} from './google';

export interface Announcement {
  message: string;
  tone: 'info' | 'warn';
  active: boolean;
  version: string; // régénéré à chaque (re)publication active -> le bandeau réapparaît pour tous
}
export interface Maintenance {
  active: boolean;
  message: string;
}

const ANNOUNCEMENT_KEY = 'announcement';
const MAINTENANCE_KEY = 'maintenance';
const DEFAULT_MAINTENANCE_MSG = 'Maintenance en cours, on revient très vite.';

let announcement: Announcement = {message: '', tone: 'info', active: false, version: ''};
let maintenance: Maintenance = {active: false, message: ''};

/** Charge l'état depuis la base (au démarrage). */
export async function loadAppStatus(): Promise<void> {
  const a = await getSetting<Partial<Announcement>>(ANNOUNCEMENT_KEY);
  if (a) announcement = {message: a.message ?? '', tone: a.tone === 'warn' ? 'warn' : 'info', active: !!a.active, version: a.version ?? ''};
  const m = await getSetting<Partial<Maintenance>>(MAINTENANCE_KEY);
  if (m) maintenance = {active: !!m.active, message: m.message ?? ''};
}

/** Lecture rapide (mémoire) du flag maintenance — utilisé par le garde sur chaque requête. */
export function isMaintenanceActive(): boolean {
  return maintenance.active;
}

/** Vue admin : la config complète et éditable. */
export function getAdminAppStatus() {
  return {announcement, maintenance};
}

/** Vue publique : seulement ce dont le client a besoin (annonce active uniquement). */
export function getPublicAppStatus() {
  return {
    announcement:
      announcement.active && announcement.message.trim()
        ? {message: announcement.message, tone: announcement.tone, version: announcement.version}
        : null,
    maintenance: {
      active: maintenance.active,
      message: maintenance.message.trim() || DEFAULT_MAINTENANCE_MSG,
    },
    // Le client n'affiche le bouton « Continuer avec Google » que si l'OAuth est configuré.
    googleAuth: googleConfigured(),
  };
}

export async function setAnnouncement(a: {message: string; tone: 'info' | 'warn'; active: boolean}): Promise<void> {
  const active = !!a.active;
  announcement = {
    message: a.message.trim(),
    tone: a.tone === 'warn' ? 'warn' : 'info',
    active,
    // Nouvelle version à chaque publication active : tous les clients reverront le bandeau
    // (leur « version fermée » ne correspond plus). Vidée si on désactive l'annonce.
    version: active ? randomBytes(6).toString('hex') : '',
  };
  await setSetting(ANNOUNCEMENT_KEY, announcement);
}

export async function setMaintenance(m: Maintenance): Promise<void> {
  maintenance = {active: !!m.active, message: m.message.trim()};
  await setSetting(MAINTENANCE_KEY, maintenance);
}
