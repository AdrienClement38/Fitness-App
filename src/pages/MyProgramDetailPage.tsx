import {ArrowLeft, Pencil, Play} from 'lucide-react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {KIND_UNIT, label, measureKind} from '../lib/api';
import {Badge, Empty} from '../components/ui';
import {getMyProgram, useMyPrograms, type MyProgramExercise, type MyProgramSession} from '../lib/myPrograms';
import {startSession, useActiveWorkout} from '../lib/workoutLogs';
import {mmss} from '../lib/time';

function reps(e: MyProgramExercise): string {
  if (e.repsMin == null) return '';
  if (e.repsMax == null || e.repsMin === e.repsMax) return `${e.repsMin}`;
  return `${e.repsMin}–${e.repsMax}`;
}

function unitSuffix(e: MyProgramExercise): string {
  const u = KIND_UNIT[measureKind(e)];
  return u ? ` ${u}` : '';
}

export default function MyProgramDetailPage() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  useMyPrograms(); // s'abonne au store
  const active = useActiveWorkout();
  const p = id ? getMyProgram(id) : undefined;

  if (!p) {
    return (
      <div>
        <button onClick={() => navigate('/programmes')} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Programmes
        </button>
        <Empty label="Ce programme n'existe plus." />
      </div>
    );
  }

  const start = (s: MyProgramSession) => {
    if (active && !confirm('Une séance est déjà en cours. La remplacer ?')) return;
    startSession({
      programName: p.nameFr,
      sessionName: s.nameFr,
      programId: p.id,
      programMine: true,
      exercises: s.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        nameFr: e.nameFr,
        nameEn: e.nameEn,
        kind: measureKind(e),
        sets: e.sets,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        restSeconds: e.restSeconds,
        weight: e.weight,
      })),
    });
    navigate('/seance');
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => navigate('/programmes')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Programmes
        </button>
        <button
          onClick={() => navigate(`/mes-programmes/${p.id}/modifier`)}
          className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-slate-100"
        >
          <Pencil className="h-4 w-4" /> Modifier
        </button>
      </div>

      <h1 className="text-xl font-bold leading-tight">{p.nameFr}</h1>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {p.level && <Badge tone="emerald">{label('level', p.level)}</Badge>}
        {p.theme && <Badge tone="indigo">{label('theme', p.theme)}</Badge>}
        <Badge>Programme perso</Badge>
      </div>

      <div className="mt-4 grid gap-4">
        {p.sessions.map((s, si) => (
          <div key={si} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div>
              <h2 className="font-semibold">{s.nameFr}</h2>
              {s.focusFr && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{s.focusFr}</p>}
            </div>

            {s.exercises.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Séance vide — ajoute des exercices via « Modifier ».</p>
            ) : (
              <>
                <div className="mt-2 divide-y divide-slate-800">
                  {s.exercises.map((e, ei) => (
                    <div key={ei} className="py-2">
                      <div className="flex items-center justify-between gap-3">
                        <Link to={`/exercices/${e.exerciseId}`} className="min-w-0 flex-1 text-sm hover:text-emerald-300">
                          {e.nameFr ?? e.nameEn}
                        </Link>
                        <span className="shrink-0 text-sm font-semibold text-slate-200">
                          {e.sets ?? '–'} × {reps(e) || '–'}
                          {unitSuffix(e)}
                          {e.weight != null && measureKind(e) === 'load' ? ` · ${e.weight} kg` : ''}
                        </span>
                      </div>
                      {(e.restSeconds || e.notesFr) && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {e.restSeconds ? `Repos ${mmss(e.restSeconds)}` : ''}
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
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
