import {useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import {Badge} from './ui';
import {label} from '../lib/api';
import {useExplanations} from '../lib/settings';

/**
 * Petit « ? » cliquable qui révèle une définition courte et grand public. Pensé mobile
 * (tap pour ouvrir/fermer, clic à l'extérieur pour refermer). Garde les vrais termes
 * techniques tout en les expliquant à un débutant.
 */
export function InfoTip({children, srLabel = 'Explication'}: {children: ReactNode; srLabel?: string}) {
  const explanations = useExplanations();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{top: number; left: number; width: number; caret: number} | null>(null);

  // Bulle en position `fixed`, ancrée sous le « ? » mais CLAMPÉE dans l'écran : sinon
  // elle déborde quand le « ? » est au bord (en-tête de tableau, mobile). Au scroll /
  // resize la position figée se décalerait -> on referme.
  useLayoutEffect(() => {
    if (!open) return;
    const el = btnRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const width = Math.min(256, window.innerWidth - 16);
      const center = r.left + r.width / 2;
      const left = Math.max(8, Math.min(center - width / 2, window.innerWidth - width - 8));
      const caret = Math.max(12, Math.min(center - left, width - 12)); // X de la flèche = sous le « ? »
      setPos({top: r.bottom + 6, left, width, caret});
    }
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  if (!explanations) return null; // mode explication désactivé -> pas de « ? »
  return (
    <span className="relative inline-flex items-center align-middle">
      <button
        ref={btnRef}
        type="button"
        aria-label={srLabel}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-500 text-[10px] font-bold leading-none text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-200"
      >
        ?
      </button>
      {open && pos && (
        <>
          {/* Capte le clic extérieur pour refermer. */}
          <span className="fixed inset-0 z-40" onClick={(e) => {e.stopPropagation(); setOpen(false);}} />
          <span
            role="tooltip"
            style={{top: pos.top, left: pos.left, width: pos.width}}
            className="fixed z-50 rounded-lg border border-slate-700 bg-slate-800 p-2.5 text-left font-sans text-xs font-normal normal-case leading-snug tracking-normal text-slate-200 shadow-xl"
          >
            {/* Flèche pointant vers le « ? » cliqué (même si la bulle est décalée pour rester dans l'écran). */}
            <span style={{left: pos.caret - 5}} className="absolute -top-1.5 h-2.5 w-2.5 rotate-45 border-l border-t border-slate-700 bg-slate-800" />
            {children}
          </span>
        </>
      )}
    </span>
  );
}

/**
 * Définitions grand public des libellés d'énumération (badges). Renvoie null si le terme
 * est déjà clair (ex. Débutant, Cardio) -> pas d'info-bulle.
 */
const LABEL_DEFS: Record<string, Record<string, string>> = {
  mechanic: {
    compound: 'Plusieurs muscles et articulations à la fois (squat, développé…).',
    isolation: 'Un seul muscle ciblé (curl biceps, extension de jambe…).',
  },
  category: {
    plyometrics: 'Exercices explosifs de type sauts et rebonds.',
    powerlifting: 'Force athlétique : squat, développé couché, soulevé de terre, le plus lourd possible.',
    olympic_weightlifting: 'Mouvements olympiques (arraché, épaulé-jeté) — technique avancée.',
    strongman: 'Force « homme fort » : porter, tirer et soulever des objets lourds.',
  },
  force: {
    static: 'On tient une position sans bouger (gainage, planche).',
  },
  goal: {
    hypertrophy: 'Prendre du volume musculaire (« faire grossir » le muscle).',
    power: 'Force explosive : produire de la force vite (sauts, démarrages).',
    strength: 'Soulever le plus lourd possible (force maximale).',
    endurance: 'Tenir l’effort longtemps (séries longues, charges légères).',
  },
  theme: {
    'full-body': 'Tout le corps à chaque séance.',
    'upper-lower': 'Une séance pour le haut du corps, une pour le bas, en alternance.',
    ppl: 'Pousser (pecs, épaules, triceps) / Tirer (dos, biceps) / Jambes.',
    split: 'Chaque séance cible un ou deux muscles.',
    'upper-body': 'Séances centrées sur le haut du corps.',
  },
};

/** Définition grand public d'un libellé (kind = mechanic/category/goal/theme/force), ou null. */
export function labelDef(kind: string, value: string | null | undefined): string | null {
  return value ? LABEL_DEFS[kind]?.[value] ?? null : null;
}

type LabelKind = 'level' | 'force' | 'mechanic' | 'category' | 'goal' | 'theme' | 'evidence' | 'sourceType';
type Tone = 'slate' | 'emerald' | 'indigo' | 'amber';

/** Badge d'un libellé d'énumération, avec une info-bulle « ? » si le terme reste du jargon. */
export function LabelBadge({kind, value, tone}: {kind: LabelKind; value: string | null | undefined; tone?: Tone}) {
  if (!value) return null;
  const text = label(kind, value);
  const def = labelDef(kind, value);
  return (
    <Badge tone={tone}>
      {text}
      {def && <InfoTip srLabel={text}>{def}</InfoTip>}
    </Badge>
  );
}

/** Définitions des termes/sigles utilisés directement dans les pages (Savoir, Suivi, Muscles…). */
export const TERMS = {
  mev: 'Le minimum de séries par semaine pour continuer à progresser. En dessous, tu entretiens mais tu ne gagnes presque plus.',
  mav: 'La zone idéale : la fourchette de séries par semaine où tu progresses le mieux.',
  mrv: 'Le plafond : au-delà, trop de fatigue pour récupérer, tu finis par régresser.',
  oneRm: 'Le poids maximum que tu pourrais soulever 1 seule fois sur cet exercice (souvent estimé, pas testé pour de vrai).',
  rir: 'Reps en réserve : combien de répétitions tu aurais encore pu faire à la fin de la série. RIR 2 = il t’en restait 2.',
  volume: 'Le total soulevé : on additionne (poids × répétitions) de toutes tes séries. Une mesure de la quantité d’effort.',
  tempo: 'La vitesse du mouvement, en secondes : descente · pause basse · montée · pause haute.',
  antagoniste: 'Le muscle opposé, qui fait le mouvement inverse (le biceps plie le coude, le triceps le tend). À équilibrer.',
  metaAnalyse: 'Une étude qui combine les résultats de nombreuses études pour une conclusion plus fiable.',
} as const;
