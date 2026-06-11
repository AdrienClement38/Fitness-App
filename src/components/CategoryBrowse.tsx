import {useState, type ReactNode} from 'react';
import {ArrowLeft} from 'lucide-react';
import {Link} from 'react-router-dom';
import {api} from '../lib/api';
import {useFetch} from '../lib/useFetch';
import ExerciseCard from './ExerciseCard';
import {Empty, ErrorState, Loading} from './ui';

/** Page de navigation dédiée à une catégorie d'exercices (cardio, étirements…). */
export default function CategoryBrowse({category, title, intro}: {category: string; title: string; intro: ReactNode}) {
  const [page, setPage] = useState(1);
  const {data, error, loading} = useFetch(() => api.exercises({category, page}), [category, page]);

  return (
    <div>
      <Link to="/" className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Accueil
      </Link>
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-1 text-sm leading-relaxed text-slate-400">{intro}</p>

      {loading && <Loading />}
      {error && <ErrorState message={error} />}
      {data && (
        <>
          <p className="mb-3 mt-4 text-sm text-slate-400">{data.total} exercices</p>
          {data.items.length === 0 ? (
            <Empty label="Aucun exercice." />
          ) : (
            <div className="grid gap-2.5">
              {data.items.map((ex) => (
                <ExerciseCard key={ex.id} ex={ex} />
              ))}
            </div>
          )}

          {data.pageCount > 1 && (
            <div className="mt-5 flex items-center justify-between">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-slate-800 px-4 py-2 text-sm disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-sm text-slate-400">
                Page {page} / {data.pageCount}
              </span>
              <button
                disabled={page >= data.pageCount}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-800 px-4 py-2 text-sm disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
