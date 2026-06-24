import {ArrowLeft} from 'lucide-react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {durationMinutes} from '../lib/stats';
import {logVolume, setsDone, useWorkoutHistory, type LoggedSet} from '../lib/workoutLogs';
import type {MeasureKind} from '../lib/api';
import {Badge} from '../components/ui';

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'});

/** Une série dans son unité (kg×reps / s / min / reps). */
function setLabel(kind: MeasureKind, s: LoggedSet): string {
  if (kind === 'load') {
    if (s.weight != null && s.reps != null) return `${s.weight} kg × ${s.reps}`;
    return s.reps != null ? `${s.reps} reps` : '—';
  }
  if (s.reps == null) return '—';
  return `${s.reps}${kind === 'duration' ? ' s' : kind === 'cardio' ? ' min' : ' reps'}`;
}

/**
 * Détail d'une séance passée (depuis l'historique du Suivi). La séance est lue dans
 * l'historique local par son id ; chaque exercice renvoie vers sa fiche. Pas de fetch.
 */
export default function SessionLogPage() {
  const {logId} = useParams<{logId: string}>();
  const navigate = useNavigate();
  const history = useWorkoutHistory();
  const log = history.find((l) => l.id === logId);

  if (!log) {
    return (
      <div>
        <button onClick={() => navigate('/suivi')} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Suivi
        </button>
        <p className="text-sm text-slate-400">Séance introuvable — elle a peut-être été supprimée ou purgée (historique limité à ~3 mois).</p>
      </div>
    );
  }

  const vol = logVolume(log);
  const dur = durationMinutes(log);

  return (
    <div>
      <button onClick={() => navigate('/suivi')} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Suivi
      </button>
      <h1 className="text-xl font-bold leading-tight">{log.sessionName}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {fmtDay(log.finishedIso ?? log.startedIso ?? '')}
        {log.programName ? ` · ${log.programName}` : ''}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge>{log.exercises.length} exercices</Badge>
        <Badge tone="emerald">{setsDone(log)} séries faites</Badge>
        {vol > 0 && <Badge tone="indigo">{vol.toLocaleString('fr-FR')} kg de volume</Badge>}
        {dur != null && <Badge>{dur} min</Badge>}
      </div>

      <div className="mt-4 grid gap-3">
        {log.exercises.map((ex, i) => (
          <div key={`${ex.exerciseId}-${i}`} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <Link to={`/exercices/${ex.exerciseId}`} className="font-semibold hover:text-emerald-300">
              {ex.nameFr ?? ex.nameEn}
            </Link>
            <div className="mt-2 grid gap-1">
              {ex.sets.map((s, si) => (
                <div
                  key={si}
                  className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm ${
                    s.done ? 'border-slate-800 bg-slate-950/40' : 'border-slate-800/40 text-slate-600'
                  }`}
                >
                  <span className="text-slate-500">Série {si + 1}</span>
                  <span className={s.done ? 'font-medium text-slate-200' : ''}>{setLabel(ex.kind, s)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
