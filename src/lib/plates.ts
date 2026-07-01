/**
 * Calculette de disques : quels disques mettre de CHAQUE CÔTÉ d'une barre pour
 * atteindre un poids total. Logique pure (testée), zéro dépendance.
 *
 * On charge des disques identiques des deux côtés → poids par côté = (total − barre) / 2,
 * décomposé en glouton décroissant sur un jeu de disques standard (quantité illimitée).
 */

/** Barres proposées (kg) : 20 = barre olympique standard ; 15 = barre légère ; 10 ≈ barre courte. */
export const BAR_WEIGHTS = [20, 15, 10] as const;

/** Jeu de disques standard (kg), du plus lourd au plus léger. */
export const STANDARD_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export interface PlateBreakdown {
  bar: number;
  /** Disques d'UN côté, du plus lourd au plus léger (kg). */
  perSide: number[];
  /** Poids total réellement atteint = barre + 2 × somme d'un côté. */
  achieved: number;
  /** Poids demandé. */
  requested: number;
  /** Le poids demandé n'est pas exactement atteignable avec ce jeu de disques. */
  approx: boolean;
  /** Le poids demandé est plus léger que la barre (impossible sans alléger la barre). */
  belowBar: boolean;
}

/** Nettoie la poussière flottante (les disques 1,25 restent des multiples exacts). */
const clean = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Décompose `total` kg sur une barre `bar` avec le jeu `plates` (glouton décroissant).
 * Ex. 80 kg sur barre 20 → 30/côté → [25, 5], atteint 80.
 */
export function platesForWeight(total: number, bar: number, plates: readonly number[] = STANDARD_PLATES): PlateBreakdown {
  // Robustesse : entrée non finie (débordement de saisie) ou ≤ 0 -> résultat sûr, jamais de crash.
  if (!Number.isFinite(total) || total <= 0) {
    return {bar, perSide: [], achieved: bar, requested: 0, approx: false, belowBar: true};
  }
  const requested = clean(Math.min(total, 100000)); // borne haute : aucun chargement réel n'en approche (évite le débordement de clean())
  if (requested <= bar) {
    return {bar, perSide: [], achieved: bar, requested, approx: requested !== bar, belowBar: requested < bar};
  }
  let rem = clean((requested - bar) / 2); // poids par côté à charger
  const perSide: number[] = [];
  for (const p of plates) {
    while (rem >= p - 1e-9) {
      perSide.push(p);
      rem = clean(rem - p);
    }
  }
  const sidesSum = perSide.reduce((a, b) => a + b, 0);
  const achieved = clean(bar + sidesSum * 2);
  return {bar, perSide, achieved, requested, approx: Math.abs(achieved - requested) > 1e-9, belowBar: false};
}

/** Regroupe [25,25,5] → [{plate:25,count:2},{plate:5,count:1}] pour l'affichage. */
export function groupPlates(perSide: number[]): {plate: number; count: number}[] {
  const out: {plate: number; count: number}[] = [];
  for (const p of perSide) {
    const last = out[out.length - 1];
    if (last && last.plate === p) last.count++;
    else out.push({plate: p, count: 1});
  }
  return out;
}

/** Matériel = barre LIBRE chargée de disques identiques des deux côtés (barre droite ou EZ). */
const PLATE_LOADED_BARS = new Set(['barbell', 'ez-bar']);

/**
 * Cet exercice se fait-il sur une barre LIBRE chargée de disques → la calculette est pertinente ?
 * Barre droite ou EZ, mais PAS la Smith machine (guidée) : dans la source, quelques mouvements
 * Smith sont tagués 'barbell' → on les écarte par le nom (l'utilisateur veut la barre « non guidée »).
 */
export function usesPlateLoadedBar(ex: {equipmentId?: string | null; nameEn?: string | null; nameFr?: string | null}): boolean {
  if (!ex.equipmentId || !PLATE_LOADED_BARS.has(ex.equipmentId)) return false;
  return !/smith/i.test(`${ex.nameEn ?? ''} ${ex.nameFr ?? ''}`);
}
