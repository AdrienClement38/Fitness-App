import {Check} from 'lucide-react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {api} from '../lib/api';
import {useFetch} from '../lib/useFetch';
import ExerciseCard from '../components/ExerciseCard';
import {Loading} from '../components/ui';

/**
 * Écran de fin de séance : étirements suggérés pour les muscles travaillés.
 * Les ids des exos vivent dans l'URL (?ids=...) → revenir depuis une fiche
 * d'étirement (bouton Retour) ré-affiche bien cette page.
 */
export default function PostSessionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean);
  const {data, loading} = useFetch(() => api.stretchSuggestions(ids), [ids.join(',')]);
  const stretches = data?.items ?? [];

  return (
    <div>
      <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-center">
        <Check className="mx-auto h-7 w-7 text-emerald-400" />
        <h1 className="mt-1 text-lg font-bold">Séance terminée</h1>
        <p className="mt-1 text-sm text-slate-400">Bien joué. Quelques étirements pour les muscles travaillés :</p>
      </div>

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
