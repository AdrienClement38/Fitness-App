import {ArrowLeft, Trash2} from 'lucide-react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {label} from '../lib/api';
import {Badge, Empty} from '../components/ui';
import {
  getMyProgram,
  removeMyProgram,
  updateMyProgram,
  useMyPrograms,
  type MyProgram,
  type MyProgramExercise,
} from '../lib/myPrograms';

/** Petit champ numérique : vide -> null. */
function Num({value, onChange, title}: {value: number | null; onChange: (v: number | null) => void; title?: string}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      title={title}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
      className="w-14 rounded-md border border-slate-700 bg-slate-800 px-1.5 py-1 text-center text-sm tabular-nums focus:border-emerald-500 focus:outline-none"
    />
  );
}

export default function MyProgramPage() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  useMyPrograms(); // s'abonne au store pour re-render à chaque édition
  const program = id ? getMyProgram(id) : undefined;

  if (!program) {
    return (
      <div>
        <button onClick={() => navigate('/programmes')} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Programmes
        </button>
        <Empty label="Ce programme n'existe plus." />
      </div>
    );
  }

  // Édition immuable : on clone, on mute le brouillon, on enregistre.
  const patch = (mut: (draft: MyProgram) => void) => {
    const draft = structuredClone(program);
    mut(draft);
    updateMyProgram(draft);
  };
  const patchEx = (si: number, ei: number, p: Partial<MyProgramExercise>) =>
    patch((d) => {
      Object.assign(d.sessions[si].exercises[ei], p);
    });

  const del = () => {
    if (confirm(`Supprimer « ${program.nameFr} » ? Action définitive.`)) {
      removeMyProgram(program.id);
      navigate('/programmes');
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => navigate('/programmes')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Programmes
        </button>
        <button
          onClick={del}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" /> Supprimer
        </button>
      </div>

      <input
        value={program.nameFr}
        onChange={(e) => patch((d) => (d.nameFr = e.target.value))}
        aria-label="Nom du programme"
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xl font-bold focus:border-emerald-500 focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {program.level && <Badge tone="emerald">{label('level', program.level)}</Badge>}
        {program.theme && <Badge tone="indigo">{label('theme', program.theme)}</Badge>}
        <Badge>Programme perso</Badge>
      </div>
      <p className="mt-2 text-xs text-slate-500">Tes modifications sont enregistrées automatiquement sur cet appareil.</p>

      <div className="mt-4 grid gap-4">
        {program.sessions.map((s, si) => (
          <div key={si} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <input
              value={s.nameFr}
              onChange={(e) => patch((d) => (d.sessions[si].nameFr = e.target.value))}
              aria-label="Nom de la séance"
              className="w-full rounded-md border border-transparent bg-transparent font-semibold hover:border-slate-700 focus:border-emerald-500 focus:bg-slate-800 focus:outline-none"
            />
            {s.exercises.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Aucun exercice. (L'ajout arrive bientôt.)</p>
            ) : (
              <div className="mt-2 divide-y divide-slate-800">
                {s.exercises.map((e, ei) => (
                  <div key={ei} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Link to={`/exercices/${e.exerciseId}`} className="min-w-0 flex-1 text-sm hover:text-emerald-300">
                        {e.nameFr ?? e.nameEn}
                      </Link>
                      <button
                        onClick={() => patch((d) => d.sessions[si].exercises.splice(ei, 1))}
                        aria-label="Retirer l'exercice"
                        className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-red-950/40 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400">
                      <label className="flex items-center gap-1">
                        Séries <Num value={e.sets} onChange={(v) => patchEx(si, ei, {sets: v})} title="Séries" />
                      </label>
                      <label className="flex items-center gap-1">
                        Reps <Num value={e.repsMin} onChange={(v) => patchEx(si, ei, {repsMin: v})} title="Reps min" />
                        <span>–</span>
                        <Num value={e.repsMax} onChange={(v) => patchEx(si, ei, {repsMax: v})} title="Reps max" />
                      </label>
                      <label className="flex items-center gap-1">
                        Repos <Num value={e.restSeconds} onChange={(v) => patchEx(si, ei, {restSeconds: v})} title="Repos (s)" />s
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
