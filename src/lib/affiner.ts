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
  /** Conseil de coaching propre à la zone : comment la travailler + une option hors salle.
   *  Présent UNIQUEMENT si c'est justifié (du concret et spécifique à dire). Rédigé/vérifié
   *  honnête (renforcer/galber, jamais de perte de gras ciblée — la note globale est au pied
   *  de page). Aucune différence de paramètres selon le sexe. */
  advice?: string;
}

export const ZONES: AffinerZone[] = [
  {
    id: 'ventre',
    label: 'Ventre & taille',
    blurb: "Abdos, sangle, poignées d'amour",
    muscleIds: ['abdominals'],
    advice:
      "Les abdos récupèrent vite : tu peux les solliciter 3 à 4 fois par semaine, en séries proche de l'échec (12-20 reps) avec une vraie flexion du tronc — enroule la colonne vertèbre par vertèbre, sans tirer sur la nuque — plutôt qu'un simple maintien. Ajoute du gainage anti-rotation pour le transverse et les obliques. Sans matériel : alterne dead bug et planche latérale, 3 séries de 30-45 s par côté.",
  },
  {
    id: 'fessiers',
    label: 'Fessiers',
    blurb: 'Galber et raffermir',
    muscleIds: ['glutes'],
    advice:
      "Les fessiers récupèrent vite : sollicite-les 2 à 3 fois par semaine en grande amplitude (descends profond, serre fort la fesse en haut sans cambrer le bas du dos). Pour le grand fessier, privilégie l'extension de hanche (hip thrust, soulevé de terre roumain) plutôt que le seul squat. Sans matériel : hip thrusts au sol dos calé contre le canapé, fentes et montées de marche, lestés d'un sac à dos quand ça devient trop facile.",
  },
  {
    id: 'cuisses',
    label: 'Cuisses',
    blurb: 'Quadriceps, ischios, intérieur',
    muscleIds: ['quadriceps', 'hamstrings', 'adductors', 'abductors'],
    advice:
      "Travaille en grande amplitude : descends en squat ou fente jusqu'à au moins la parallèle — l'amplitude complète développe mieux quadriceps et fessiers que les versions partielles. Ajoute du travail d'ischios (soulevé de terre jambes semi-tendues), que squats et fentes sous-sollicitent. Sans matériel : fentes marchées et squats bulgares (pied arrière sur une chaise), 12 à 20 reps, 2 à 3 fois par semaine.",
  },
  {
    id: 'bras',
    label: 'Bras',
    blurb: 'Biceps, triceps, avant-bras',
    muscleIds: ['biceps', 'triceps', 'forearms'],
    advice:
      "Le triceps fait environ deux tiers du volume du bras : priorise-le via les extensions au-dessus de la tête, qui étirent le chef long sous tension (bras près des oreilles, charge descendue derrière la nuque). Ces petits muscles récupèrent vite — 2 séances par semaine proche de l'échec et en amplitude complète. Sans matériel : dips sur une chaise (buste près du bord pour ménager l'épaule) pour les triceps, curls avec un bidon de 5 L pour les biceps, descente contrôlée.",
  },
  {
    id: 'dos',
    label: 'Dos',
    blurb: 'Largeur, épaisseur, posture',
    muscleIds: ['lats', 'middle-back', 'lower-back', 'traps'],
    advice:
      "Le dos répond bien à 2 séances par semaine en combinant tirages verticaux (traction) et horizontaux (rowing), en grande amplitude : laisse les omoplates s'écarter en bas puis ramène-les en serrant — c'est ce qui recrute le grand dorsal et le milieu du dos plutôt que les seuls biceps. Sans matériel : rowings inversés sous une table solide (corps gainé, tire la poitrine vers le bord) et Superman au sol pour les lombaires, 2-3 s en haut.",
  },
  {
    id: 'poitrine',
    label: 'Poitrine',
    blurb: 'Pectoraux',
    muscleIds: ['chest'],
    advice:
      "Tes pectoraux ramènent les bras vers l'avant et vers le centre : travaille-les 2 fois par semaine avec un grand étirement en bas (développés, écartés) puis un serrage en haut. Charger le muscle bien étiré est au moins aussi efficace pour le faire grossir, donc vise l'amplitude complète. Sans matériel, les pompes suffisent : mains sur deux livres ou le bord de deux chaises pour descendre plus bas que les mains, descente ralentie sur 2-3 s.",
  },
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
