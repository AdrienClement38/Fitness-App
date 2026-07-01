import {useEffect, useRef, useState} from 'react';
import {Check, Minus, Play, Plus, Replace, Timer, TrendingUp, Volume2, VolumeX, X} from 'lucide-react';
import {Link, useNavigate} from 'react-router-dom';
import {mmss} from '../lib/time';
import {
  abandonActive,
  adjustRest,
  finishActive,
  finishRest,
  replaceExercise,
  setsDone,
  startChrono,
  toggleSetDone,
  updateActive,
  useActiveWorkout,
  useWorkoutHistory,
  type LoggedSet,
} from '../lib/workoutLogs';
import {overloadHint, type OverloadHint} from '../lib/overload';
import {restSoundEnabled, setRestSound, stretchSuggestionsEnabled, useRestSound} from '../lib/settings';
import {armAudio, beep} from '../lib/restAlert';
import ReplaceExercisePicker from '../components/ReplaceExercisePicker';
import {useWakeLock} from '../lib/useWakeLock';

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

/** Chrono de séance : H:MM:SS au-delà d'une heure, sinon M:SS. */
const hms = (s: number) => {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};

export default function WorkoutPage() {
  const navigate = useNavigate();
  const w = useActiveWorkout();
  const history = useWorkoutHistory(); // séances terminées -> suggestion de surcharge progressive
  useWakeLock(!!w); // garde l'écran allumé pendant la séance -> l'alerte de fin de repos part à l'heure
  const soundOn = useRestSound();
  const [replaceEi, setReplaceEi] = useState<number | null>(null); // index de l'exercice à remplacer (modale)

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

  // Alerte au moment précis où le repos se termine : vibration (Android) + bip (si activé).
  // Le flash visuel, lui, est porté par la barre (classe animate-flash-alert quand restOver).
  const prevRemaining = useRef<number | null>(null);
  useEffect(() => {
    if (remaining != null && remaining <= 0 && prevRemaining.current != null && prevRemaining.current > 0) {
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* non supporté */
      }
      if (restSoundEnabled()) beep();
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
  // Applique l'objectif de surcharge aux séries PAS ENCORE faites (on ne touche pas à l'historique de la séance).
  const applyHint = (ei: number, hint: OverloadHint) =>
    updateActive((d) => {
      for (const s of d.exercises[ei].sets) {
        if (s.done) continue;
        if (hint.weight != null) s.weight = hint.weight;
        s.reps = hint.reps;
      }
    });

  const total = w.exercises.reduce((a, e) => a + e.sets.length, 0);
  const done = setsDone(w);
  const started = w.startedIso != null;
  const elapsedSec = w.startedIso ? Math.max(0, Math.floor((now - Date.parse(w.startedIso)) / 1000)) : 0;

  const start = () => startChrono();
  const finish = () => {
    const ids = [...new Set(w.exercises.map((e) => e.exerciseId))];
    const logId = w.id;
    finishActive();
    const idsParam = stretchSuggestionsEnabled() ? `ids=${encodeURIComponent(ids.join(','))}` : '';
    navigate(`/seance/fin?${idsParam}&logId=${logId}`);
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
        {started ? (
          <p className="mt-2 flex items-center gap-2 font-semibold text-emerald-300">
            <Timer className="h-5 w-5 shrink-0" />
            <span className="text-2xl tabular-nums">{hms(elapsedSec)}</span>
            <span className="text-xs font-medium text-slate-400">· {done}/{total} séries faites</span>
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-slate-400">
              {w.exercises.length} exercices · {total} séries prévues. Renseigne tes poids, puis lance le chrono.
            </p>
            <button
              onClick={start}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              <Play className="h-4 w-4" /> Commencer la séance
            </button>
          </>
        )}
      </div>

      <div className="mt-4 grid gap-4">
        {w.exercises.map((e, ei) => {
          const load = e.kind === 'load';
          const valLabel = e.kind === 'duration' ? 'durée (s)' : e.kind === 'cardio' ? 'durée (min)' : 'reps';
          const objUnit = e.kind === 'duration' ? 's' : e.kind === 'cardio' ? 'min' : 'reps';
          const cols = load
            ? 'grid grid-cols-[1.5rem_1fr_1fr_2.5rem_2rem] items-center gap-2'
            : 'grid grid-cols-[1.5rem_1fr_2.5rem_2rem] items-center gap-2';
          const hint = overloadHint(e.kind, e.targetReps, history, e.exerciseId);
          return (
            <div key={ei} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/exercices/${e.exerciseId}`} className="font-semibold hover:text-emerald-300">
                    {e.nameFr ?? e.nameEn}
                  </Link>
                  {e.targetReps && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      objectif {e.targetReps} {objUnit}
                      {e.restSeconds ? ` · repos ${mmss(e.restSeconds)}` : ''}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setReplaceEi(ei)}
                  aria-label="Remplacer l'exercice"
                  title="Remplacer par un exercice similaire (même muscle, selon ton matériel)"
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                >
                  <Replace className="h-3.5 w-3.5" /> Remplacer
                </button>
              </div>

              {/* Surcharge progressive : objectif déduit de ta dernière séance. Tap = pré-remplir. */}
              {hint && (
                <button
                  type="button"
                  onClick={() => applyHint(ei, hint)}
                  className="mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 text-left transition-colors hover:bg-emerald-500/10"
                >
                  <span className="flex min-w-0 items-center gap-1.5 text-xs">
                    <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span className="font-medium text-emerald-300">Vise {hint.text}</span>
                    <span className="truncate text-slate-500">· dernière fois {hint.lastText}</span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-emerald-400">Appliquer</span>
                </button>
              )}

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
                    onClick={() => {
                      armAudio(); // débloque l'audio sur ce geste -> le bip pourra sonner en fin de repos
                      toggleSetDone(ei, si);
                    }}
                    aria-label="Série faite (lance le repos)"
                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                      s.done ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-600 text-transparent hover:border-emerald-500'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeSet(ei, si)}
                    aria-label="Retirer la série"
                    className="mx-auto flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-red-950/40 hover:text-red-300"
                  >
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

      {/* « Commencer » n'existe qu'en haut. Ici, une fois lancé, on garde « Terminer ». */}
      {started && (
        <button
          onClick={finish}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30"
        >
          <Check className="h-4 w-4" /> Terminer la séance
        </button>
      )}
      <button
        onClick={abandon}
        className={`${started ? 'mt-2' : 'mt-6'} w-full rounded-xl px-4 py-2 text-sm text-slate-500 hover:text-red-300`}
      >
        {started ? 'Abandonner' : 'Quitter'}
      </button>

      {/* Minuteur de repos : barre flottante au-dessus de la nav. */}
      {rest && (
        <div className="fixed inset-x-0 bottom-20 z-10 px-4">
          <div
            className={`mx-auto max-w-2xl rounded-2xl border p-3 shadow-xl backdrop-blur ${
              restOver ? 'animate-flash-alert border-emerald-400 bg-emerald-950/95 ring-2 ring-emerald-400/70' : 'border-slate-700 bg-slate-900/95'
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
                      onClick={() => setRestSound(!soundOn)}
                      aria-label={soundOn ? 'Couper le bip de fin de repos' : 'Activer le bip de fin de repos'}
                      title={soundOn ? 'Bip activé' : 'Bip coupé'}
                      className={`flex items-center justify-center rounded-lg border border-slate-700 p-1.5 hover:bg-slate-800 ${soundOn ? 'text-emerald-300' : 'text-slate-500'}`}
                    >
                      {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                    </button>
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

      {replaceEi !== null && w.exercises[replaceEi] && (
        <ReplaceExercisePicker
          exerciseId={w.exercises[replaceEi].exerciseId}
          onPick={(ex) => {
            replaceExercise(replaceEi, ex);
            setReplaceEi(null);
          }}
          onClose={() => setReplaceEi(null)}
        />
      )}
    </div>
  );
}
