/**
 * Matériel de l'utilisateur ↔ exercices « faisables ».
 *
 * Source UNIQUE de vérité, partagée client/serveur (le serveur l'importe pour
 * trier la liste « faisable d'abord » ; le client pour l'affichage). On évite
 * toute liste d'IDs en dur : le lieu d'un exercice se déduit de sa catégorie et
 * de son équipement (constat de l'audit du catalogue) :
 *  - barre / haltères / kettlebell…  → selon le matériel possédé (l'équipement prime)
 *  - machine / poulies               → salle
 *  - étirements / pliométrie         → sans matériel (partout)
 *  - cardio délocalisable            → tapis≈courir, vélo, stairmaster≈escaliers, corde, skating
 *    → faisable hors salle (la modalité prime sur le tag « machine »).
 *  - cardio réellement machine       → elliptique / rameur / vélo couché / traîneau (prowler) :
 *    pas d'équivalent maison → salle (cf. CARDIO_NEEDS_MACHINE).
 *  - strongman / powerlifting SANS équipement précis (atlas stones, chaînes…) → salle.
 *    NB : un mouvement de force à la BARRE (squat/bench/deadlift) reste classé par son
 *    équipement (barre) -> faisable chez soi si on a une barre ; seul le matériel vraiment
 *    spécialisé (équipement « other ») tombe dans le repli « salle » par catégorie.
 *  - poids du corps / sans matériel  → partout
 */

/** Jeton « accès salle » : présent = l'utilisateur a accès à tout le matériel. */
export const GYM_TOKEN = 'gym';

/**
 * Matériel « maison / dehors » que l'utilisateur peut posséder. Les ids correspondent
 * aux `equipment_id` de la base (pour le mapping exercice → faisable). Le poids du corps,
 * les étirements et le cardio extérieur sont TOUJOURS disponibles → pas de toggle.
 */
export const HOME_EQUIPMENT: ReadonlyArray<{id: string; label: string}> = [
  {id: 'dumbbell', label: 'Haltères'},
  {id: 'barbell', label: 'Barre + poids'},
  {id: 'kettlebell', label: 'Kettlebell'},
  {id: 'resistance-band', label: 'Élastiques'},
  {id: 'medicine-ball', label: 'Medicine ball'},
  {id: 'stability-ball', label: 'Ballon de gym'},
  {id: 'foam-roller', label: 'Rouleau de massage'},
];

/** Ensemble des jetons valides (salle + matériel maison). */
export const ALL_EQUIP_TOKENS: ReadonlySet<string> = new Set<string>([GYM_TOKEN, ...HOME_EQUIPMENT.map((e) => e.id)]);

/** Matériel présent uniquement en salle (jamais « faisable » sans accès salle). */
const GYM_ONLY_EQUIPMENT = new Set(['machine', 'cable']);

/**
 * Cardio qui exige VRAIMENT une machine spécifique, sans équivalent maison/extérieur :
 * l'elliptique, le rameur et le vélo couché ne « se font pas dehors », et le traîneau
 * (prowler) demande un sled. Le RESTE du cardio est délocalisable (un tapis = courir, un
 * vélo = un vélo, un stairmaster = des escaliers, la corde à sauter, le skating…).
 */
const CARDIO_NEEDS_MACHINE = new Set(['elliptical-trainer', 'rowing-stationary', 'recumbent-bike', 'prowler-sprint']);

/** Champs minimaux d'un exercice nécessaires au calcul (l'id sert au cas cardio-machine). */
export interface ExerciseAccessInput {
  id?: string;
  category: string;
  equipmentId: string | null;
}

/**
 * Un exercice est-il faisable avec le matériel possédé ?
 * `owned` = ensemble de jetons (GYM_TOKEN + ids de HOME_EQUIPMENT).
 *
 * On respecte d'abord l'équipement CONCRET requis (un automassage « au rouleau » ou un
 * étirement « avec haltère » exige réellement ce matériel, quelle que soit sa catégorie),
 * et on ne décide par catégorie que s'il n'y a pas d'équipement précis (poids du corps /
 * « autre » / non renseigné).
 */
export function canDoExercise(ex: ExerciseAccessInput, owned: ReadonlySet<string>): boolean {
  if (owned.has(GYM_TOKEN)) return true; // accès salle = tout le matériel

  // 0) Cardio : délocalisable (tapis≈courir, vélo, stairmaster≈escaliers, corde…) SAUF les
  //    modalités réellement machine (elliptique, rameur, vélo couché, traîneau). On teste
  //    AVANT l'équipement pour neutraliser le tag « machine » des modalités délocalisables.
  if (ex.category === 'cardio') return !CARDIO_NEEDS_MACHINE.has(ex.id ?? '');

  const eq = ex.equipmentId;

  // 1) Équipement concret requis : décide à lui seul.
  if (eq && eq !== 'bodyweight' && eq !== 'other') {
    if (GYM_ONLY_EQUIPMENT.has(eq)) return false; // machine, poulies (+ cardio sur machine)
    if (eq === 'ez-bar') return owned.has('barbell'); // barre EZ ≈ barre
    return owned.has(eq); // haltères, kettlebell, élastique, ballon, medicine-ball, rouleau, barre
  }

  // 2) Sans équipement précis (poids du corps / « autre » / non renseigné) : selon la catégorie.
  const cat = ex.category;
  // Strongman / powerlifting restés ici = SANS équipement concret (atlas stones, chaînes…) -> salle.
  // (Les mouvements de force à la barre sont déjà traités en 1) via leur équipement.)
  if (cat === 'strongman' || cat === 'powerlifting') return false;
  // étirements, pliométrie, cardio extérieur (vélo, course, corde…), renfo au poids du corps → partout
  return true;
}

/**
 * Filtre/dé-doublonne une liste de jetons (garde-fou de frontière). `null` si l'entrée
 * n'est pas un tableau (préférence « non renseignée »). Un tableau vide reste un tableau
 * vide (préférence explicitement « rien »).
 */
export function sanitizeEquipment(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  return [...new Set(input.filter((t): t is string => typeof t === 'string' && ALL_EQUIP_TOKENS.has(t)))];
}

/** Préférence renseignée ? (tableau présent, même vide). */
export function hasEquipmentPref(equipment: string[] | null | undefined): equipment is string[] {
  return Array.isArray(equipment);
}
