import {Check, Plus, X} from 'lucide-react';
import {Link, useNavigate} from 'react-router-dom';
import {
  abandonActive,
  finishActive,
  setsDone,
  updateActive,
  useActiveWorkout,
  type LoggedSet,
} from '../lib/workoutLogs';

function NumCell({
  value,
  onChange,
  step = 1,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step={step}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
      className="w-full rounded-md border border-slate-700 bg-slate-800 px-1 py-1.5 text-center text-sm tabular-nums focus:border-emerald-500 focus:outline-none"
    />
  );
}

export default function WorkoutPage() {
  const navigate = useNavigate();
  const w = useActiveWorkout();

  if (!w) {
    return (
      <div className="py-16 text-center">
        <p className="text-slate-400">Aucune séance en cours.</p>
        <Link
          to="/programmes"
          className="mt-3 inline-block rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/30"
        >
          Choisir un programme
        </Link>
      </div>
    );
  }

  const setField = (ei: number, si: number, patch: Partial<LoggedSet>) =>
    updateActive((d) => {
      Object.assign(d.exercises[ei].sets[si], patch);
    });
  const addSet = (ei: number) =>
    updateActive((d) => {
      const s = d.exercises[ei].sets;
      const last = s[s.length - 1];
      s.push({weight: last?.weight ?? null, reps: last?.reps ?? null, done: false});
    });
  const removeSet = (ei: number, si: number) =>
    updateActive((d) => {
      d.exercises[ei].sets.splice(si, 1);
    });

  const total = w.exercises.reduce((a, e) => a + e.sets.length, 0);
  const done = setsDone(w);

  const finish = () => {
    finishActive();
    navigate('/suivi');
  };
  const abandon = () => {
    if (confirm('Abandonner la séance ? Rien ne sera enregistré.')) {
      abandonActive();
      navigate('/programmes');
    }
  };

  const cols = 'grid grid-cols-[1.5rem_1fr_1fr_2.5rem_1.5rem] items-center gap-2';

  return (
    <div>
      <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4">
        <h1 className="text-lg font-bold">{w.sessionName}</h1>
        {w.programName && <p className="text-sm text-slate-400">{w.programName}</p>}
        <p className="mt-1 text-xs font-medium text-emerald-300">
          {done} / {total} séries faites
        </p>
      </div>

      <div className="mt-4 grid gap-4">
        {w.exercises.map((e, ei) => (
          <div key={ei} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <Link to={`/exercices/${e.exerciseId}`} className="font-semibold hover:text-emerald-300">
                {e.nameFr ?? e.nameEn}
              </Link>
              {e.targetReps && <span className="shrink-0 text-xs text-slate-500">objectif {e.targetReps} reps</span>}
            </div>

            <div className={`mt-3 ${cols} text-xs text-slate-500`}>
              <span />
              <span className="text-center">kg</span>
              <span className="text-center">reps</span>
              <span className="text-center">fait</span>
              <span />
            </div>
            {e.sets.map((s, si) => (
              <div key={si} className={`mt-1.5 ${cols} rounded-md ${s.done ? 'bg-emerald-500/10' : ''}`}>
                <span className="text-center text-sm text-slate-500">{si + 1}</span>
                <NumCell value={s.weight} onChange={(v) => setField(ei, si, {weight: v})} step={0.5} placeholder="kg" />
                <NumCell value={s.reps} onChange={(v) => setField(ei, si, {reps: v})} step={1} placeholder="reps" />
                <button
                  onClick={() => setField(ei, si, {done: !s.done})}
                  aria-label="Série faite"
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                    s.done ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-600 text-transparent hover:border-emerald-500'
                  }`}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => removeSet(ei, si)} aria-label="Retirer la série" className="text-slate-600 hover:text-red-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button onClick={() => addSet(ei)} className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-300">
              <Plus className="h-3.5 w-3.5" /> série
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={finish}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30"
      >
        <Check className="h-4 w-4" /> Terminer la séance
      </button>
      <button onClick={abandon} className="mt-2 w-full rounded-xl px-4 py-2 text-sm text-slate-500 hover:text-red-300">
        Abandonner
      </button>
    </div>
  );
}
