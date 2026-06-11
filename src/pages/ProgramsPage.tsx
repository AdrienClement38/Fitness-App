import {Link} from 'react-router-dom';
import {api, label} from '../lib/api';
import {useFetch} from '../lib/useFetch';
import {Badge, ErrorState, Loading} from '../components/ui';

export default function ProgramsPage() {
  const {data, error, loading} = useFetch(() => api.programs(), []);

  return (
    <div>
      <h1 className="text-xl font-bold">Programmes</h1>
      <p className="mt-1 text-sm text-slate-400">
        Des plans d'entraînement prêts à suivre, ancrés sur la science. Chaque exercice renvoie à sa fiche.
      </p>

      {loading && <Loading />}
      {error && <ErrorState message={error} />}

      <div className="mt-4 grid gap-3">
        {data?.map((p) => (
          <Link
            key={p.id}
            to={`/programmes/${p.id}`}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{p.nameFr}</h3>
              {p.theme && <Badge tone="indigo">{label('theme', p.theme)}</Badge>}
              {p.level && <Badge tone="emerald">{label('level', p.level)}</Badge>}
              {p.daysPerWeek && <Badge>{p.daysPerWeek} j/sem</Badge>}
            </div>
            {p.summaryFr && <p className="mt-1 text-sm leading-relaxed text-slate-300">{p.summaryFr}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
