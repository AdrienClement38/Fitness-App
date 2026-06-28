/**
 * Enregistre TOUTES les collections synchronisées au démarrage (effets de bord
 * d'import). Garantit que clearLocalData() (purge des données locales au changement
 * de compte, cf. sync.ts) est toujours complète — même si la page correspondante
 * n'a pas encore été visitée. Importé une seule fois, tôt, dans main.tsx.
 */
import './favorites';
import './workoutLogs';
import './myPrograms';
import './records';
import './userProfile';
import './announcementDismiss';
