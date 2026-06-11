import {ArrowLeft, ArrowRight} from 'lucide-react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {api, label, type ExerciseRef} from '../lib/api';
import {useFetch} from '../lib/useFetch';
import {Badge, ErrorState, Loading, SectionTitle} from '../components/ui';
import BodyMap from '../components/BodyMap';

function ExerciseLinks({items}: {items: ExerciseRef[]}) {
  return (
    <div className="grid gap-2">
      {items.slice(0, 20).map((e) => (
        <Link
          key={e.id}
          to={`/exercices/${e.id}`}
          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm hover:border-slate-700 hover:bg-slate-900"
        >
          <span>{e.nameFr ?? e.nameEn}</span>
          <Badge tone="emerald">{label('level', e.level)}</Badge>
        </Link>
      ))}
    </div>
  );
}

export default function MuscleDetailPage() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data: m, error, loading} = useFetch(() => api.muscle(id!), [id]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!m) return null;

  const vl = m.volumeLandmark;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <h1 className="text-xl font-bold leading-tight">{m.nameFr}</h1>
      {m.nameEn && <p className="text-sm italic text-slate-500">{m.nameEn}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge>{m.groupNameFr}</Badge>
        {m.antagonistId && (
          <Link to={`/muscles/${m.antagonistId}`}>
            <Badge tone="indigo">Antagoniste : {m.antagonistNameFr}</Badge>
          </Link>
        )}
      </div>

      <BodyMap primary={[m.id]} onSelect={(mid) => navigate(`/muscles/${mid}`)} className="mt-4" />

      {m.functionFr && (
        <>
          <SectionTitle>Fonction</SectionTitle>
          <p className="text-sm leading-relaxed text-slate-300">{m.functionFr}</p>
        </>
      )}
      {m.anatomyFr && (
        <>
          <SectionTitle>Anatomie</SectionTitle>
          <p className="text-sm leading-relaxed text-slate-300">{m.anatomyFr}</p>
        </>
      )}

      {vl && (vl.mevSets || vl.mrvSets) && (
        <>
          <SectionTitle>Volume hebdomadaire (séries)</SectionTitle>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{vl.mevSets}</div>
              <div className="text-xs text-slate-400">MEV (minimum)</div>
            </div>
            <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{vl.mavSetsMin}–{vl.mavSetsMax}</div>
              <div className="text-xs text-slate-400">MAV (optimal)</div>
            </div>
            <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{vl.mrvSets}</div>
              <div className="text-xs text-slate-400">MRV (max)</div>
            </div>
          </div>
          {vl.notesFr && <p className="mt-2 text-xs text-slate-400">{vl.notesFr}</p>}
        </>
      )}

      <SectionTitle>Exercices ciblant ce muscle</SectionTitle>
      <Link
        to={`/exercices?muscle=${m.id}`}
        className="mb-3 flex items-center justify-between rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/25"
      >
        Voir tous les exercices ({m.primaryExercises.length + m.secondaryExercises.length})
        <ArrowRight className="h-4 w-4" />
      </Link>

      {m.primaryExercises.length > 0 && (
        <>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">En principal</p>
          <ExerciseLinks items={m.primaryExercises} />
        </>
      )}
    </div>
  );
}
