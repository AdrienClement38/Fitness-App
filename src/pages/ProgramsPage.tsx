import {useEffect, useState} from 'react';
import {Plus} from 'lucide-react';
import {Link, useNavigate} from 'react-router-dom';
import {api, label, type Gender} from '../lib/api';
import {createEmptyProgram, useMyPrograms} from '../lib/myPrograms';
import {useFetch} from '../lib/useFetch';
import {useAuth} from '../lib/auth';
import {Badge, Empty, ErrorState, Loading, SectionTitle} from '../components/ui';

const LEVELS = [
  {id: 'beginner', label: 'Débutant'},
  {id: 'intermediate', label: 'Intermédiaire'},
  {id: 'advanced', label: 'Avancé'},
];

// Mise en avant PAR OBJECTIF/PRÉFÉRENCE (pas une nécessité physiologique : cf. recherche
// — les programmes marchent pareil pour tous, la charge est individuelle). Simple ordre
// d'affichage + badge « Suggéré » : tout reste accessible. 'préfère ne pas dire' -> aucun tri.
const FEMALE_THEMES = new Set(['glutes', 'fat-loss', 'full-body', 'upper-lower']);
const MALE_THEMES = new Set(['strength', 'upper-body', 'ppl', 'split']);
const isSuggested = (theme: string | null, gender: Gender | null | undefined): boolean => {
  if (!gender || !theme) return false;
  return gender === 'female' ? FEMALE_THEMES.has(theme) : MALE_THEMES.has(theme);
};

export default function ProgramsPage() {
  const {data, error, loading} = useFetch(() => api.programs(), []);
  const mine = useMyPrograms();
  const {user} = useAuth();
  const navigate = useNavigate();
  const gender = user?.gender ?? null;
  // Niveau choisi, mémorisé (l'utilisateur retrouve son niveau).
  const [level, setLevel] = useState(() => localStorage.getItem('program-level') || 'beginner');
  useEffect(() => {
    localStorage.setItem('program-level', level);
  }, [level]);

  const filtered = (data ?? []).filter((p) => p.level === level);
  // Suggérés (selon l'objectif fréquent du sexe) remontés en premier ; ordre neutre sinon.
  const catalog = gender
    ? [...filtered].sort((a, b) => Number(isSuggested(b.theme, gender)) - Number(isSuggested(a.theme, gender)))
    : filtered;

  return (
    <div>
      <h1 className="text-xl font-bold">Programmes</h1>
      <p className="mt-1 text-sm text-slate-400">
        Choisis ton niveau, puis un programme prêt à suivre. Chaque exercice renvoie à sa fiche.
      </p>

      <section className="mt-4">
        <div className="mb-2 mt-6 flex items-center justify-between">
          <h2 className="font-heading text-lg uppercase tracking-wider text-slate-300">Mes programmes</h2>
          <button
            onClick={() => navigate(`/mes-programmes/${createEmptyProgram()}/modifier`)}
            className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
          >
            <Plus className="h-4 w-4" /> Créer
          </button>
        </div>
        {mine.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-500">
            Aucun programme perso. Crée-en un de zéro avec « Créer », ou ouvre un programme du catalogue et clique « Dupliquer / personnaliser ».
          </p>
        ) : (
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
        )}
      </section>

      <SectionTitle>Catalogue par niveau</SectionTitle>

      {gender === 'female' && (
        <p className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs leading-relaxed text-emerald-200/80">
          💪 Les mêmes programmes marchent pour tout le monde — tu logges tes charges, elles s'adaptent à toi. Et non, charger lourd ne rend pas « massive ».
        </p>
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
          {catalog.length === 0 ? (
            <Empty label="Aucun programme à ce niveau pour l'instant." />
          ) : (
            catalog.map((p) => (
              <Link
                key={p.id}
                to={`/programmes/${p.id}`}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{p.nameFr}</h3>
                  {isSuggested(p.theme, gender) && <Badge tone="emerald">Suggéré</Badge>}
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
