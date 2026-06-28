import {Check, Dumbbell, Flame, Timer} from 'lucide-react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {api} from '../lib/api';
import {useFetch} from '../lib/useFetch';
import ExerciseCard from '../components/ExerciseCard';
import {Loading} from '../components/ui';
import {useAuth} from '../lib/auth';
import {useProfile} from '../lib/userProfile';
import {defaultWeightKg, sessionSeconds, sessionKcal} from '../lib/calories';
import {logVolume, useWorkoutHistory} from '../lib/workoutLogs';

/**
 * Écran de fin de séance : statistiques de la séance + étirements suggérés.
 */
export default function PostSessionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
  const logId = params.get('logId');
  
  const {data, loading} = useFetch(() => api.stretchSuggestions(ids), [ids.join(',')]);
  const stretches = data?.items ?? [];

  const {user} = useAuth();
  const profile = useProfile();
  const history = useWorkoutHistory();

  // On récupère la séance spécifique via son id, ou à défaut la plus récente de l'historique
  const log = (logId ? history.find((l) => l.id === logId) : null) || history[0];

  const weightKg = profile.weightKg ?? defaultWeightKg(user?.gender);
  const volume = log ? logVolume(log) : 0;
  const seconds = log ? sessionSeconds(log) : 0;
  const kcal = log ? sessionKcal(log, weightKg) : 0;

  const durationStr = (() => {
    if (seconds < 60) return `${seconds} s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (s === 0) return `${m} min`;
    return `${m} min ${s} s`;
  })();

  return (
    <div>
      <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-center">
        <Check className="mx-auto h-7 w-7 text-emerald-400" />
        <h1 className="mt-1 text-lg font-bold">Séance terminée</h1>
        <p className="mt-1 text-sm text-slate-400">Bien joué !</p>
      </div>

      {log && (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center">
            <Timer className="mx-auto h-5 w-5 text-emerald-400" />
            <div className="mt-1 text-lg font-bold tabular-nums text-emerald-300">{durationStr}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Durée</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center">
            <Dumbbell className="mx-auto h-5 w-5 text-emerald-400" />
            <div className="mt-1 text-lg font-bold tabular-nums text-emerald-300">
              {volume > 0 ? `${volume.toLocaleString('fr-FR')} kg` : '0 kg'}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Volume</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center" title="Estimation indicative basée sur le modèle METs">
            <Flame className="mx-auto h-5 w-5 text-emerald-400" />
            <div className="mt-1 text-lg font-bold tabular-nums text-emerald-300">~{kcal} kcal</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Calories</div>
          </div>
        </div>
      )}

      {ids.length > 0 && stretches.length > 0 && (
        <p className="mt-6 text-sm font-semibold text-slate-400">Quelques étirements suggérés pour les muscles travaillés :</p>
      )}

      {ids.length === 0 ? (
        <p className="mt-4 text-center text-sm text-slate-500">Séance enregistrée.</p>
      ) : loading ? (
        <Loading />
      ) : stretches.length > 0 ? (
        <div className="mt-4 grid gap-2.5">
          {stretches.map((ex) => (
            <ExerciseCard key={ex.id} ex={ex} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-slate-500">Pas de suggestion d'étirement cette fois.</p>
      )}

      <button
        onClick={() => navigate('/suivi')}
        className="mt-6 w-full rounded-xl bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30"
      >
        Voir mon suivi
      </button>
    </div>
  );
}
