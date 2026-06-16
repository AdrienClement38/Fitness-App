import {ArrowLeft, Copy, Play} from 'lucide-react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {api, KIND_UNIT, label, measureKind, type ProgramExerciseItem, type ProgramSession} from '../lib/api';
import {duplicateProgram} from '../lib/myPrograms';
import {startSession, useActiveWorkout} from '../lib/workoutLogs';
import {useFetch} from '../lib/useFetch';
import {Badge, ErrorState, Loading} from '../components/ui';
import {LabelBadge} from '../components/InfoTip';

function reps(e: ProgramExerciseItem): string {
  if (e.repsMin == null) return '';
  if (e.repsMax == null || e.repsMin === e.repsMax) return `${e.repsMin}`;
  return `${e.repsMin}–${e.repsMax}`;
}

/** Suffixe d'unité selon le mode de saisie (« s », « min », ou rien pour des reps). */
function unitSuffix(e: ProgramExerciseItem): string {
  const u = KIND_UNIT[measureKind(e)];
  return u ? ` ${u}` : '';
}

export default function ProgramDetailPage() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data: p, error, loading} = useFetch(() => api.program(id!), [id]);
  const active = useActiveWorkout();

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!p) return null;

  const start = (s: ProgramSession) => {
    if (active && !confirm('Une séance est déjà en cours. La remplacer ?')) return;
    startSession({
      programName: p.nameFr,
      sessionName: s.nameFr,
      exercises: s.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        nameFr: e.nameFr,
        nameEn: e.nameEn,
        kind: measureKind(e),
        sets: e.sets,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        restSeconds: e.restSeconds,
      })),
    });
    navigate('/seance');
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <h1 className="text-xl font-bold leading-tight">{p.nameFr}</h1>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <LabelBadge kind="theme" value={p.theme} tone="indigo" />
        {p.level && <Badge tone="emerald">{label('level', p.level)}</Badge>}
        {p.daysPerWeek && <Badge>{p.daysPerWeek} j/sem</Badge>}
        <LabelBadge kind="goal" value={p.goal} />
      </div>
      {p.descriptionFr && <p className="mt-3 text-sm leading-relaxed text-slate-300">{p.descriptionFr}</p>}

      <button
        onClick={() => navigate(`/mes-programmes/${duplicateProgram(p)}/modifier`)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
      >
        <Copy className="h-4 w-4" /> Dupliquer / personnaliser
      </button>

      <div className="mt-4 grid gap-4">
        {p.sessions.map((s) => (
          <div key={s.dayOrder} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">{s.nameFr}</h2>
              {s.focusFr && <span className="text-right text-xs text-slate-500">{s.focusFr}</span>}
            </div>
            <div className="mt-2 divide-y divide-slate-800">
              {s.exercises.map((e) => (
                <div key={e.position} className="py-2">
                  <div className="flex items-center justify-between gap-3">
                    <Link to={`/exercices/${e.exerciseId}`} className="min-w-0 flex-1 text-sm hover:text-emerald-300">
                      {e.nameFr ?? e.nameEn}
                    </Link>
                    <span className="shrink-0 text-sm font-semibold text-slate-200">
                      {e.sets} × {reps(e)}
                      {unitSuffix(e)}
                    </span>
                  </div>
                  {(e.restSeconds || e.notesFr) && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      {e.restSeconds ? `Repos ${e.restSeconds}s` : ''}
                      {e.restSeconds && e.notesFr ? ' · ' : ''}
                      {e.notesFr ?? ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => start(s)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/25"
            >
              <Play className="h-4 w-4" /> Démarrer la séance
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
