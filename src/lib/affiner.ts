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
      "Le ventre concentre le gras viscéral, celui qui entoure les organes : sa quantité dépend surtout de tes androgènes, de ton cortisol (stress) et de ta sensibilité à l'insuline, ce qui explique qu'il s'y accumule plus facilement chez les hommes (silhouette « pomme ») et après la ménopause chez les femmes, quand les œstrogènes baissent. Le sous-cutané du bas-ventre et des poignées d'amour, lui, est l'un des plus tenaces : riche en récepteurs alpha-2 qui freinent la mobilisation des graisses, il figure souvent parmi les derniers à partir. Tu ne choisis ni l'endroit ni l'ordre dans lequel le gras s'en va, et aucune série d'abdos ne brûle la couche qui le recouvre.",
  },
  {
    id: 'fessiers',
    label: 'Fessiers',
    blurb: 'Galber et raffermir',
    muscleIds: ['glutes'],
    fatNote:
      "Les fessiers sont une réserve de stockage privilégiée sous l'influence des œstrogènes, ce qui explique un dépôt en moyenne plus généreux chez la femme : le corps protège cette réserve glutéo-fémorale, autour du grand fessier, comme un capital qu'il garde longtemps. Ce gras est riche en récepteurs alpha-2 qui freinent son déstockage, si bien qu'il fond souvent quand le reste a déjà maigri. C'est ta physiologie qui fixe cet ordre, pas ta volonté : renforcer les fessiers leur donne du galbe, mais ne fait pas fondre la couche qui les habille.",
  },
  {
    id: 'cuisses',
    label: 'Cuisses',
    blurb: 'Quadriceps, ischios, intérieur',
    muscleIds: ['quadriceps', 'hamstrings', 'adductors', 'abductors'],
    fatNote:
      "Le gras des cuisses appartient à la même réserve glutéo-fémorale que les fessiers, mais il se répartit plus bas, surtout sur la face interne et le tour de cuisse, et reste en moyenne plus marqué chez la femme sous l'effet des œstrogènes. Ces cellules sont elles aussi riches en récepteurs freins (alpha-2 adrénergiques) qui les rendent lentes à se vider : c'est typiquement un gras qui s'en va tard, après le haut du corps. Muscler les cuisses les raffermit sous la peau, mais ne commande pas l'ordre dans lequel ton corps décide d'y puiser.",
  },
  {
    id: 'bras',
    label: 'Bras',
    blurb: 'Biceps, triceps, avant-bras',
    muscleIds: ['biceps', 'triceps', 'forearms'],
    fatNote:
      "L'arrière du bras ne porte que du gras sous-cutané, et sa quantité tient surtout à ta génétique et à tes hormones : chez beaucoup de femmes, les œstrogènes accentuent un peu le stockage au triceps, une tendance qui se marque souvent avec l'âge. Bonne nouvelle, ce n'est pas un dépôt réputé tenace : il se mobilise plutôt au rythme de ta perte globale, sans figurer parmi les plus récalcitrants. Travailler le triceps renforce le muscle dessous, mais c'est ton corps qui choisit quand et où puiser dans la graisse au-dessus, pas l'exercice ciblé.",
  },
  {
    id: 'dos',
    label: 'Dos',
    blurb: 'Largeur, épaisseur, posture',
    muscleIds: ['lats', 'middle-back', 'lower-back', 'traps'],
    fatNote:
      "Le gras du dos (haut du dos, ligne du soutien-gorge, bas du dos) est essentiellement du sous-cutané dont l'emplacement dépend de ta génétique et de tes hormones : les androgènes orientent le stockage vers le tronc et la moitié supérieure du corps, plus marqué chez l'homme. Sur le haut du dos, ce gras se mobilise globalement au fil de ta perte, sans être particulièrement coriace ; seul le bas du dos rejoint la zone des poignées d'amour, plus lente à se vider. Tu ne pilotes pas l'ordre dans lequel ton corps puise : il s'affine d'ensemble, et aucun exercice ne cible le gras d'un secteur précis.",
  },
  {
    id: 'poitrine',
    label: 'Poitrine',
    blurb: 'Pectoraux',
    muscleIds: ['chest'],
    fatNote:
      "À la poitrine, ce sont surtout tes hormones et ta génétique qui mènent la danse. Chez la femme, le sein est en bonne partie du tissu glandulaire dont le volume dépend des œstrogènes ; le gras n'en est qu'une part, plus ou moins importante selon les personnes. Chez l'homme, il s'agit le plus souvent de gras sous-cutané qui se dépose et fond au rythme de ta perte globale (une fermeté plus glandulaire relève, elle, du suivi médical, pas de l'entraînement). Dans les deux cas, renforcer les pectoraux raffermit le muscle dessous sans déloger la graisse locale : la façon dont cette zone se vide dépend de ton profil, pas d'un exercice ciblé.",
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
  title: 'Muscle vs gras : comment ça marche',
  body:
    "Deux leviers, deux rôles : tu muscles la zone pour la galber (ça, c'est local et ça marche), et tu baisses ton gras GLOBAL (déficit + cardio + gros mouvements) pour la révéler. Ce qui n'existe pas, c'est faire fondre le gras d'un seul endroit en l'entraînant — aucun exercice ne déstocke localement.",
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
