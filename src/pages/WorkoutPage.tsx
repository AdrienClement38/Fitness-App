import {useEffect, useRef, useState} from 'react';
import {Check, Minus, Plus, Timer, X} from 'lucide-react';
import {Link, useNavigate} from 'react-router-dom';
import {
  abandonActive,
  adjustRest,
  finishActive,
  finishRest,
  setsDone,
  toggleSetDone,
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

const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

export default function WorkoutPage() {
  const navigate = useNavigate();
  const w = useActiveWorkout();

  // Tique chaque seconde pendant la séance : horloge + compte à rebours du repos.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!w) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [!!w]); // eslint-disable-line react-hooks/exhaustive-deps

  const now = Date.now();
  const rest = w?.rest ?? null;
  const remaining = rest ? rest.targetSeconds - Math.floor((now - Date.parse(rest.startedIso)) / 1000) : null;

  // Vibre (mobile) au moment précis où le repos se termine.
  const prevRemaining = useRef<number | null>(null);
  useEffect(() => {
    if (remaining != null && remaining <= 0 && prevRemaining.current != null && prevRemaining.current > 0) {
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* non supporté */
      }
    }
    prevRemaining.current = remaining;
  });

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
      if (d.rest && d.rest.ei === ei && d.rest.si === si) d.rest = null;
    });

  const total = w.exercises.reduce((a, e) => a + e.sets.length, 0);
  const done = setsDone(w);
  const elapsedMin = Math.max(0, Math.floor((now - Date.parse(w.startedIso)) / 60000));

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

  const restingExo = rest ? w.exercises[rest.ei] : null;
  const restOver = remaining != null && remaining <= 0;
  const restPct = rest ? Math.max(0, Math.min(100, ((rest.targetSeconds - Math.max(0, remaining ?? 0)) / rest.targetSeconds) * 100)) : 0;

  return (
    <div className={rest ? 'pb-32' : ''}>
      <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4">
        <h1 className="text-lg font-bold">{w.sessionName}</h1>
        {w.programName && <p className="text-sm text-slate-400">{w.programName}</p>}
        <p className="mt-1 text-xs font-medium text-emerald-300">
          {done} / {total} séries faites · {elapsedMin} min
        </p>
      </div>

      <div className="mt-4 grid gap-4">
        {w.exercises.map((e, ei) => {
          const load = e.kind === 'load';
          const valLabel = e.kind === 'duration' ? 'durée (s)' : e.kind === 'cardio' ? 'durée (min)' : 'reps';
          const objUnit = e.kind === 'duration' ? 's' : e.kind === 'cardio' ? 'min' : 'reps';
          const cols = load
            ? 'grid grid-cols-[1.5rem_1fr_1fr_2.5rem_1.5rem] items-center gap-2'
            : 'grid grid-cols-[1.5rem_1fr_2.5rem_1.5rem] items-center gap-2';
          return (
            <div key={ei} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <Link to={`/exercices/${e.exerciseId}`} className="font-semibold hover:text-emerald-300">
                  {e.nameFr ?? e.nameEn}
                </Link>
                {e.targetReps && (
                  <span className="shrink-0 text-xs text-slate-500">
                    objectif {e.targetReps} {objUnit}
                    {e.restSeconds ? ` · repos ${e.restSeconds}s` : ''}
                  </span>
                )}
              </div>

              <div className={`mt-3 ${cols} text-xs text-slate-500`}>
                <span />
                {load ? (
                  <>
                    <span className="text-center">kg</span>
                    <span className="text-center">reps</span>
                  </>
                ) : (
                  <span className="text-center">{valLabel}</span>
                )}
                <span className="text-center">fait</span>
                <span />
              </div>
              {e.sets.map((s, si) => (
                <div
                  key={si}
                  className={`mt-1.5 ${cols} rounded-md ${
                    rest && rest.ei === ei && rest.si === si ? 'bg-amber-500/10' : s.done ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  <span className="text-center text-sm text-slate-500">{si + 1}</span>
                  {load ? (
                    <>
                      <NumCell value={s.weight} onChange={(v) => setField(ei, si, {weight: v})} step={0.5} placeholder="kg" />
                      <NumCell value={s.reps} onChange={(v) => setField(ei, si, {reps: v})} step={1} placeholder="reps" />
                    </>
                  ) : (
                    <NumCell value={s.reps} onChange={(v) => setField(ei, si, {reps: v})} step={e.kind === 'duration' ? 5 : 1} placeholder={valLabel} />
                  )}
                  <button
                    onClick={() => toggleSetDone(ei, si)}
                    aria-label="Série faite (lance le repos)"
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
          );
        })}
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

      {/* Minuteur de repos : barre flottante au-dessus de la nav. */}
      {rest && (
        <div className="fixed inset-x-0 bottom-16 z-10 px-4">
          <div
            className={`mx-auto max-w-2xl rounded-2xl border p-3 shadow-xl backdrop-blur ${
              restOver ? 'border-emerald-500/60 bg-emerald-950/95' : 'border-slate-700 bg-slate-900/95'
            }`}
          >
            {restOver ? (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="animate-pulse font-semibold text-emerald-300">Repos terminé !</p>
                  <p className="truncate text-xs text-slate-400">Reprends : {restingExo?.nameFr ?? restingExo?.nameEn}</p>
                </div>
                <button
                  onClick={() => finishRest()}
                  className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400"
                >
                  Reprendre la série
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate text-xs text-slate-400">
                      <Timer className="h-3.5 w-3.5 shrink-0" /> Repos · {restingExo?.nameFr ?? restingExo?.nameEn}
                    </p>
                    <p className="text-2xl font-bold tabular-nums">{mmss(remaining ?? 0)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => adjustRest(-15)}
                      className="flex items-center gap-0.5 rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      <Minus className="h-3 w-3" />
                      15s
                    </button>
                    <button
                      onClick={() => adjustRest(15)}
                      className="flex items-center gap-0.5 rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      <Plus className="h-3 w-3" />
                      15s
                    </button>
                    <button
                      onClick={() => finishRest()}
                      className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
                    >
                      Reprendre
                    </button>
                  </div>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-emerald-400 transition-[width] duration-1000 ease-linear" style={{width: `${restPct}%`}} />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
