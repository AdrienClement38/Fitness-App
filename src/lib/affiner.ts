import type {Gender} from './api';

/**
 * Module « M'affiner / perdre du gras ».
 *
 * Principe NON négociable (cf. recherche sourcée) : la perte de gras ciblée est un
 * MYTHE. On ne fait pas fondre une zone en l'entraînant — la perte est GLOBALE
 * (déficit + cardio + gros mouvements). Le travail local muscle/galbe la zone, visible
 * une fois le gras réduit. Tous les libellés respectent ça : jamais « perdre le gras de
 * [zone] », toujours « tonifier / galber ».
 *
 * Les zones sont adossées aux muscles réellement présents en base (filtre
 * /exercices?muscle=<ids>, qui accepte une liste séparée par des virgules).
 */
export interface AffinerZone {
  id: string; // slug de route /affiner/:id
  label: string;
  blurb: string;
  muscleIds: string[];
}

export const ZONES: AffinerZone[] = [
  {id: 'ventre', label: 'Ventre & taille', blurb: "Abdos, sangle, poignées d'amour", muscleIds: ['abdominals']},
  {id: 'fessiers', label: 'Fessiers', blurb: 'Galber et raffermir', muscleIds: ['glutes']},
  {id: 'cuisses', label: 'Cuisses', blurb: 'Quadriceps, ischios, intérieur', muscleIds: ['quadriceps', 'hamstrings', 'adductors', 'abductors']},
  {id: 'bras', label: 'Bras', blurb: 'Biceps, triceps, avant-bras', muscleIds: ['biceps', 'triceps', 'forearms']},
  {id: 'dos', label: 'Dos', blurb: 'Largeur, épaisseur, posture', muscleIds: ['lats', 'middle-back', 'lower-back', 'traps']},
  {id: 'poitrine', label: 'Poitrine', blurb: 'Pectoraux', muscleIds: ['chest']},
];

export const getZone = (id: string | undefined): AffinerZone | undefined => ZONES.find((z) => z.id === id);

// Ordre d'AFFICHAGE des zones selon le sexe : purement éditorial (là où chacun cible le
// plus souvent), toutes restent visibles. La méthode et les exercices ne changent JAMAIS.
// gender null/absent -> ordre neutre.
const ORDER_MALE = ['ventre', 'bras', 'poitrine', 'dos', 'cuisses', 'fessiers'];
const ORDER_FEMALE = ['fessiers', 'cuisses', 'ventre', 'bras', 'dos', 'poitrine'];

export function orderedZones(gender: Gender | null | undefined): AffinerZone[] {
  const order = gender === 'female' ? ORDER_FEMALE : gender === 'male' ? ORDER_MALE : null;
  if (!order) return ZONES;
  return [...ZONES].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

// Cadrage anti-mythe, identique pour tous (la science ne dépend pas du sexe).
export const FRAMING = {
  title: "Le gras part où il veut, pas où tu cibles",
  body:
    "La perte de gras ciblée est un mythe : aucun exercice ne fait fondre la graisse d'un endroit précis. Ce qui dévoile une zone, c'est baisser ton gras GLOBAL (déficit alimentaire + cardio + gros mouvements). Le travail ciblé, lui, renforce et galbe le muscle — visible une fois le gras réduit.",
  footnote:
    "Le travail local renforce et galbe le muscle, mais ne brûle pas le gras au-dessus. Le gras part de façon générale, dans un ordre dicté par ta génétique et tes hormones — pas par l'exercice choisi.",
};

// Note éditoriale facultative sur la répartition typique (tendance, pas une règle). Sert
// à reconnaître le ressenti de l'utilisateur, jamais à promettre une perte ciblée.
export function genderNote(gender: Gender | null | undefined): string | null {
  if (gender === 'male')
    return "Chez les hommes, le gras se loge surtout sur le ventre (graisse viscérale) — un enjeu de santé en plus de l'esthétique, et souvent la zone qui part en dernier.";
  if (gender === 'female')
    return "Chez les femmes, le gras se loge plutôt sur les hanches, cuisses et fessiers — une réserve naturelle, souvent la dernière à partir. C'est normal, pas un échec.";
  return null;
}
