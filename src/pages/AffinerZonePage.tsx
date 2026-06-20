import {ArrowLeft, ArrowRight, Check, ChevronRight, Dumbbell, Flame, Lightbulb} from 'lucide-react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {api, type ExerciseListItem} from '../lib/api';
import {useAuth} from '../lib/auth';
import {useFetch} from '../lib/useFetch';
import {ErrorState, Loading} from '../components/ui';
import {FRAMING, getZone} from '../lib/affiner';

const exName = (e: ExerciseListItem) => e.nameFr ?? e.nameEn;

export default function AffinerZonePage() {
  const {zone: zoneId} = useParams<{zone: string}>();
  const navigate = useNavigate();
  const zone = getZone(zoneId);

  const {user} = useAuth();
  const equip = user && Array.isArray(user.equipment) ? user.equipment : null;
  const equipSig = equip ? `set:${equip.join(',')}` : '∅';
  const muscleParam = zone ? zone.muscleIds.join(',') : '';
  // Exercices de la zone (muscles primaires), compatibles d'abord si le matériel est renseigné.
  const {data, error, loading} = useFetch(() => api.exercises({muscle: muscleParam, primary: '1'}), [muscleParam, equipSig]);

  if (!zone) {
    return (
      <div>
        <button onClick={() => navigate('/affiner')} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> M'affiner
        </button>
        <p className="text-sm text-slate-400">Zone inconnue.</p>
      </div>
    );
  }

  const exercises = data?.items ?? [];
  const top = exercises.slice(0, 8);

  return (
    <div>
      <button onClick={() => navigate('/affiner')} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> M'affiner
      </button>
      <h1 className="text-xl font-bold leading-tight">{zone.label}</h1>
      <p className="mt-1 text-sm text-slate-400">{zone.blurb}</p>

      {/* Rappel : brûler le gras est GLOBAL (pas de perte ciblée) -> inutile de répéter
          cardio / gros mouvements par zone, on renvoie au hub M'affiner qui les centralise. */}
      <Link
        to="/affiner"
        className="mt-4 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5 text-xs leading-relaxed text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-300"
      >
        <Flame className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="flex-1">
          Brûler le gras est <span className="text-slate-300">global</span> — cardio &amp; gros mouvements dans M'affiner.
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
      </Link>

      {/* Bloc 2 — sculpter le muscle de la zone */}
      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Dumbbell className="h-4 w-4 text-emerald-400" /> Exercices pour travailler la zone
        </h2>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">Pour renforcer et galber la zone — le galbe est visible une fois le gras réduit.</p>

        {loading && <Loading />}
        {error && <ErrorState message={error} />}
        {data && (
          <>
            <div className="mt-3 grid gap-2">
              {top.map((e) => (
                <Link
                  key={e.id}
                  to={`/exercices/${e.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm hover:border-slate-700 hover:bg-slate-900"
                >
                  <span>{exName(e)}</span>
                  {e.canDo && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-label="Compatible avec ton matériel" />}
                </Link>
              ))}
            </div>
            <Link
              to={`/exercices?muscle=${zone.muscleIds.join(',')}&primary=1`}
              className="mt-3 flex items-center justify-between rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/25"
            >
              Voir tous les exercices ({data.total})
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </div>

      <div className="mt-3 flex gap-2 rounded-xl bg-slate-900/40 p-3 text-xs leading-relaxed text-slate-400">
        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
        <span>{FRAMING.footnote}</span>
      </div>
    </div>
  );
}
