/**
 * Schéma corporel — vues avant + arrière, muscles travaillés colorés.
 * Rendu par react-body-highlighter (MIT). On mappe nos 17 muscles vers ses
 * slugs et on distingue primaires (rouge) / secondaires (rouge clair) via la
 * fréquence : un primaire est compté 2× (→ rouge), un secondaire 1× (→ clair).
 */
import type {ReactNode} from 'react';
import Model, {type IExerciseData, type Muscle} from 'react-body-highlighter';

type Props = {primary?: string[]; secondary?: string[]; className?: string};

/** Nos 17 muscles → slugs react-body-highlighter (1 vers n). */
const MUSCLE_MAP: Record<string, Muscle[]> = {
  chest: ['chest'],
  lats: ['upper-back'],
  'middle-back': ['upper-back'],
  'lower-back': ['lower-back'],
  traps: ['trapezius'],
  shoulders: ['front-deltoids', 'back-deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearm'],
  abdominals: ['abs', 'obliques'],
  quadriceps: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves'],
  adductors: ['adductor'],
  abductors: ['abductors'],
  neck: ['neck'],
};

const map = (ids: string[]): Muscle[] => ids.flatMap((id) => MUSCLE_MAP[id] ?? []);

const BODY_COLOR = '#475569'; // slate-600 (muscle non sollicité)
// index = fréquence − 1 : 1 = secondaire (rouge clair), 2+ = primaire (rouge).
const COLORS = ['#fca5a5', '#ef4444', '#ef4444'];

export default function BodyMap({primary = [], secondary = [], className}: Props) {
  const prim = map(primary);
  const sec = map(secondary);
  const data: IExerciseData[] = [
    {name: 'primaires', muscles: prim},
    {name: 'primaires', muscles: prim}, // compté 2× → rouge
    {name: 'secondaires', muscles: sec}, // compté 1× → rouge clair
  ];

  return (
    <div className={className}>
      <div className="flex items-start justify-center gap-6">
        <Figure label="Face avant">
          <Model data={data} type="anterior" bodyColor={BODY_COLOR} highlightedColors={COLORS} style={{width: '8rem'}} />
        </Figure>
        <Figure label="Face arrière">
          <Model data={data} type="posterior" bodyColor={BODY_COLOR} highlightedColors={COLORS} style={{width: '8rem'}} />
        </Figure>
      </div>
      <div className="mt-2 flex justify-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{background: COLORS[1]}} /> Principaux
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{background: COLORS[0]}} /> Secondaires
        </span>
      </div>
    </div>
  );
}

function Figure({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {children}
      <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}
