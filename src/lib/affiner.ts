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
  /** Texte « pourquoi le gras se loge ici » : vulgarisation physiologique propre à la zone
   *  (génétique, hormones, gras viscéral/sous-cutané, récepteurs alpha-2 des zones tenaces).
   *  Présent UNIQUEMENT si la zone a une histoire de répartition réellement spécifique.
   *  Rédigé/vérifié honnête (réaffirme : on ne choisit pas où le gras part, aucune perte
   *  ciblée) ; différences H/F = tendances physiologiques factuelles, jamais un jugement. */
  fatNote?: string;
}

export const ZONES: AffinerZone[] = [
  {
    id: 'ventre',
    label: 'Ventre & taille',
    blurb: "Abdos, sangle, poignées d'amour",
    muscleIds: ['abdominals'],
    fatNote:
      "Le ventre est la zone où se loge le gras viscéral, celui qui entoure les organes : sa quantité dépend surtout de tes androgènes, de ton cortisol (stress) et de ta sensibilité à l'insuline, ce qui explique pourquoi il a tendance à s'y accumuler plus facilement chez les hommes (silhouette « pomme ») et après la ménopause chez les femmes, quand les œstrogènes baissent. Le sous-cutané des poignées d'amour et du bas-ventre, lui, est souvent l'un des derniers à partir, car il est riche en récepteurs alpha-2 qui freinent la mobilisation des graisses. C'est ta génétique et tes hormones qui décident où et dans quel ordre le gras s'en va : aucun exercice d'abdos ne brûle le gras qui le recouvre.",
  },
  {
    id: 'fessiers',
    label: 'Fessiers',
    blurb: 'Galber et raffermir',
    muscleIds: ['glutes'],
    fatNote:
      "Les fessiers et le haut des cuisses sont une zone de stockage privilégiée sous l'influence des œstrogènes, ce qui explique pourquoi le gras s'y dépose plus volontiers, en moyenne, chez la femme : c'est une réserve sous-cutanée que le corps a tendance à protéger. Ce gras est aussi riche en récepteurs alpha-2, qui freinent son déstockage : il part donc souvent en dernier, quand le reste a déjà fondu. Cet ordre est dicté par ta génétique et tes hormones, pas par les exercices : travailler les fessiers les renforce, mais ne déloge pas le gras qui les recouvre.",
  },
  {
    id: 'cuisses',
    label: 'Cuisses',
    blurb: 'Quadriceps, ischios, intérieur',
    muscleIds: ['quadriceps', 'hamstrings', 'adductors', 'abductors'],
    fatNote:
      "Le gras des cuisses (réserve dite glutéo-fémorale) est en grande partie piloté par tes hormones et ta génétique : les œstrogènes favorisent ce stockage bas du corps, ce qui explique qu'il soit en moyenne plus marqué chez la femme. Localement, ces cellules graisseuses sont riches en récepteurs « freins » (alpha-2 adrénergiques) qui les rendent moins faciles à mobiliser : c'est souvent le gras qui s'en va en dernier, après le reste. C'est cet équilibre hormonal et génétique qui décide où et dans quel ordre le gras part, pas le fait de travailler les cuisses : muscler la zone ne déloge pas le gras qui la recouvre.",
  },
  {
    id: 'bras',
    label: 'Bras',
    blurb: 'Biceps, triceps, avant-bras',
    muscleIds: ['biceps', 'triceps', 'forearms'],
    fatNote:
      "L'arrière du bras est une zone où la graisse logée est purement sous-cutanée, et sa quantité dépend surtout de ta génétique et de tes hormones : chez beaucoup de femmes, les œstrogènes tendent à favoriser un stockage plus marqué au triceps comme aux hanches et aux cuisses, une tendance qui s'accentue souvent avec l'âge. C'est aussi une zone dite « têtue », riche en récepteurs alpha-2 qui ralentissent la libération du gras à cet endroit, donc elle se vide en général parmi les dernières. Travailler le triceps renforce le muscle dessous mais ne déloge pas la graisse au-dessus : c'est ton corps, pas l'exercice ciblé, qui décide d'où et dans quel ordre le gras s'en va.",
  },
  {
    id: 'dos',
    label: 'Dos',
    blurb: 'Largeur, épaisseur, posture',
    muscleIds: ['lats', 'middle-back', 'lower-back', 'traps'],
    fatNote:
      "Le gras du dos (poignées d'amour, haut du dos, ligne du soutien-gorge) est surtout du sous-cutané dont l'emplacement dépend de ta génétique et de tes hormones : les androgènes tendent à favoriser un stockage sur la moitié supérieure du corps et le tronc, plus marqué chez l'homme. Le bas du dos compte souvent parmi les zones « tenaces » riches en récepteurs alpha-2 qui freinent la mobilisation, si bien qu'il part en dernier. Aucun exercice ne déloge le gras de cette zone : c'est ton corps qui décide où et dans quel ordre il puise, en s'affinant globalement.",
  },
  {
    id: 'poitrine',
    label: 'Poitrine',
    blurb: 'Pectoraux',
    muscleIds: ['chest'],
    fatNote:
      "À la poitrine, ce sont surtout tes hormones et ta génétique qui décident. Chez la femme, le sein est en bonne partie du tissu glandulaire, dont le volume dépend des œstrogènes ; le gras n'en est qu'une part, plus ou moins importante selon les personnes. Chez l'homme, il s'agit le plus souvent de gras sous-cutané qui se dépose et part au rythme de ta perte de gras globale (une fermeté plus glandulaire relève, elle, du suivi médical, pas de l'entraînement). Dans les deux cas, travailler les pectoraux renforce le muscle dessous mais ne déloge pas le gras local : l'ordre dans lequel cette zone se vide dépend de ton profil, pas d'un exercice ciblé.",
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
