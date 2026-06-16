import {useEffect, useState} from 'react';
import {ArrowLeft, Check, Plus, Trash2} from 'lucide-react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {label, measureKind, type ExerciseListItem} from '../lib/api';
import {Badge, Empty} from '../components/ui';
import ExercisePicker from '../components/ExercisePicker';
import {
  addExerciseToSession,
  getMyProgram,
  removeMyProgram,
  updateMyProgram,
  useMyPrograms,
  type MyProgram,
  type MyProgramExercise,
} from '../lib/myPrograms';

/** Libellé du champ « répétitions » selon le mode (reps / durée). */
const repLabel = (e: {category: string | null; force: string | null; equipmentId: string | null}): string => {
  const k = measureKind(e);
  return k === 'duration' ? 'Durée (s)' : k === 'cardio' ? 'Durée (min)' : 'Reps';
};

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

  const [flash, setFlash] = useState(false); // indicateur "Enregistré" après une modif
  const [pickerFor, setPickerFor] = useState<number | null>(null); // index de séance où ajouter un exo
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 1300);
    return () => clearTimeout(t);
  }, [flash]);

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

  // Édition immuable : on clone, on mute le brouillon, on enregistre, on signale.
  const patch = (mut: (draft: MyProgram) => void) => {
    const draft = structuredClone(program);
    mut(draft);
    updateMyProgram(draft);
    setFlash(true);
  };
  const patchEx = (si: number, ei: number, p: Partial<MyProgramExercise>) =>
    patch((d) => {
      Object.assign(d.sessions[si].exercises[ei], p);
    });
  const addExercise = (si: number, e: ExerciseListItem) => {
    addExerciseToSession(program.id, si, e);
    setFlash(true);
    setPickerFor(null);
  };
  const addSession = () =>
    patch((d) => d.sessions.push({nameFr: `Séance ${d.sessions.length + 1}`, focusFr: null, exercises: []}));
  const removeSession = (si: number) => {
    if (confirm(`Supprimer « ${program.sessions[si].nameFr} » ?`)) patch((d) => d.sessions.splice(si, 1));
  };
  const del = () => {
    if (confirm(`Supprimer « ${program.nameFr} » ? Action définitive.`)) {
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
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            flash ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'
          }`}
        >
          <Check className="h-3.5 w-3.5" /> {flash ? 'Enregistré' : 'Enregistré auto'}
        </span>
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
      <p className="mt-2 text-xs text-slate-500">
        Tes modifications sont enregistrées automatiquement sur cet appareil. Quand tu as fini, clique « Terminé ».
      </p>

      <div className="mt-4 grid gap-4">
        {program.sessions.map((s, si) => (
          <div key={si} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <input
                value={s.nameFr}
                onChange={(e) => patch((d) => (d.sessions[si].nameFr = e.target.value))}
                aria-label="Nom de la séance"
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent font-semibold hover:border-slate-700 focus:border-emerald-500 focus:bg-slate-800 focus:outline-none"
              />
              <button
                onClick={() => removeSession(si)}
                aria-label="Supprimer la séance"
                className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-red-950/40 hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {s.exercises.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Aucun exercice. Ajoute-en un ci-dessous.</p>
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
                        {repLabel(e)}{' '}
                        <Num value={e.repsMin} onChange={(v) => patchEx(si, ei, {repsMin: v})} title="min" />
                        <span>–</span>
                        <Num value={e.repsMax} onChange={(v) => patchEx(si, ei, {repsMax: v})} title="max" />
                      </label>
                      <label className="flex items-center gap-1">
                        Repos <Num value={e.restSeconds} onChange={(v) => patchEx(si, ei, {restSeconds: v})} title="Repos (s)" />s
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setPickerFor(si)}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-700 py-2 text-sm text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300"
            >
              <Plus className="h-4 w-4" /> Ajouter un exercice
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addSession}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-700 py-2.5 text-sm text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300"
      >
        <Plus className="h-4 w-4" /> Ajouter une séance
      </button>

      <button
        onClick={() => navigate(`/mes-programmes/${program.id}`)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30"
      >
        <Check className="h-4 w-4" /> Terminé
      </button>
      <button
        onClick={del}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl px-4 py-2 text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300"
      >
        <Trash2 className="h-4 w-4" /> Supprimer ce programme
      </button>

      {pickerFor !== null && (
        <ExercisePicker onPick={(e) => addExercise(pickerFor, e)} onClose={() => setPickerFor(null)} />
      )}
    </div>
  );
}
