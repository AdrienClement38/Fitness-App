import {Link, useNavigate} from 'react-router-dom';
import {api, type MuscleListItem} from '../lib/api';
import {useFetch} from '../lib/useFetch';
import {ErrorState, Loading, SectionTitle} from '../components/ui';
import BodyMap from '../components/BodyMap';

export default function MusclesPage() {
  const navigate = useNavigate();
  const {data, error, loading} = useFetch(() => api.muscles(), []);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const groups: {name: string; muscles: MuscleListItem[]}[] = [];
  for (const m of data) {
    let group = groups.find((g) => g.name === m.groupNameFr);
    if (!group) {
      group = {name: m.groupNameFr, muscles: []};
      groups.push(group);
    }
    group.muscles.push(m);
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Muscles</h1>
      <div className="mb-4 mt-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
        <BodyMap onSelect={(mid) => navigate(`/muscles/${mid}`)} />
        <p className="mt-1 text-center text-xs text-slate-500">Touche un muscle pour voir ses exercices</p>
      </div>
      {groups.map((g) => (
        <div key={g.name}>
          <SectionTitle>{g.name}</SectionTitle>
          <div className="grid gap-2">
            {g.muscles.map((m) => (
              <Link
                key={m.id}
                to={`/muscles/${m.id}`}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900"
              >
                <h3 className="font-semibold">{m.nameFr}</h3>
                {m.functionFr && <p className="mt-0.5 line-clamp-2 text-sm text-slate-400">{m.functionFr}</p>}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
