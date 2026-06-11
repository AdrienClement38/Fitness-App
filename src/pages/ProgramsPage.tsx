import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {api, label} from '../lib/api';
import {useMyPrograms} from '../lib/myPrograms';
import {useFetch} from '../lib/useFetch';
import {Badge, Empty, ErrorState, Loading, SectionTitle} from '../components/ui';

const LEVELS = [
  {id: 'beginner', label: 'Débutant'},
  {id: 'intermediate', label: 'Intermédiaire'},
  {id: 'advanced', label: 'Avancé'},
];

export default function ProgramsPage() {
  const {data, error, loading} = useFetch(() => api.programs(), []);
  const mine = useMyPrograms();
  // Niveau choisi, mémorisé (l'utilisateur retrouve son niveau).
  const [level, setLevel] = useState(() => localStorage.getItem('program-level') || 'beginner');
  useEffect(() => {
    localStorage.setItem('program-level', level);
  }, [level]);

  const filtered = (data ?? []).filter((p) => p.level === level);

  return (
    <div>
      <h1 className="text-xl font-bold">Programmes</h1>
      <p className="mt-1 text-sm text-slate-400">
        Choisis ton niveau, puis un programme prêt à suivre. Chaque exercice renvoie à sa fiche.
      </p>

      {mine.length > 0 && (
        <section className="mt-4">
          <SectionTitle>Mes programmes</SectionTitle>
          <div className="grid gap-3">
            {mine.map((mp) => (
              <Link
                key={mp.id}
                to={`/mes-programmes/${mp.id}`}
                className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 transition-colors hover:border-emerald-800 hover:bg-emerald-950/30"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{mp.nameFr}</h3>
                  {mp.level && <Badge tone="emerald">{label('level', mp.level)}</Badge>}
                  <Badge>Perso</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {mp.sessions.length} séance{mp.sessions.length > 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
          <SectionTitle>Catalogue par niveau</SectionTitle>
        </section>
      )}

      <div className="mt-3 flex gap-1 rounded-xl bg-slate-900 p-1">
        {LEVELS.map((lv) => (
          <button
            key={lv.id}
            onClick={() => setLevel(lv.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              level === lv.id ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lv.label}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorState message={error} />}
      {data && (
        <div className="mt-4 grid gap-3">
          {filtered.length === 0 ? (
            <Empty label="Aucun programme à ce niveau pour l'instant." />
          ) : (
            filtered.map((p) => (
              <Link
                key={p.id}
                to={`/programmes/${p.id}`}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{p.nameFr}</h3>
                  {p.theme && <Badge tone="indigo">{label('theme', p.theme)}</Badge>}
                  {p.daysPerWeek && <Badge>{p.daysPerWeek} j/sem</Badge>}
                </div>
                {p.summaryFr && <p className="mt-1 text-sm leading-relaxed text-slate-300">{p.summaryFr}</p>}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
