import {useEffect, useState} from 'react';
import {ArrowLeft, ArrowRight} from 'lucide-react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {api, type ExerciseRef} from '../lib/api';
import {useFetch} from '../lib/useFetch';
import {Badge, ErrorState, Loading, SectionTitle} from '../components/ui';
import {InfoTip} from '../components/InfoTip';
import BodyMap from '../components/BodyMap';

const LEVELS = [
  {id: 'beginner', label: 'Débutant'},
  {id: 'intermediate', label: 'Intermédiaire'},
  {id: 'advanced', label: 'Avancé'},
];

function ExerciseLinks({items}: {items: ExerciseRef[]}) {
  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-800 p-3 text-sm text-slate-500">Aucun exercice à ce niveau pour ce muscle.</p>;
  }
  return (
    <div className="grid gap-2">
      {items.map((e) => (
        <Link
          key={e.id}
          to={`/exercices/${e.id}`}
          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm hover:border-slate-700 hover:bg-slate-900"
        >
          <span>{e.nameFr ?? e.nameEn}</span>
        </Link>
      ))}
    </div>
  );
}

export default function MuscleDetailPage() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data: m, error, loading} = useFetch(() => api.muscle(id!), [id]);
  // Même niveau mémorisé que la page Programmes (l'utilisateur a « son » niveau).
  const [level, setLevel] = useState(() => localStorage.getItem('program-level') || 'beginner');
  useEffect(() => {
    localStorage.setItem('program-level', level);
  }, [level]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!m) return null;

  const name = (e: ExerciseRef) => e.nameFr ?? e.nameEn;
  const primaryAtLevel = m.primaryExercises
    .filter((e) => e.level === level)
    .sort((a, b) => name(a).localeCompare(name(b), 'fr'));

  const vl = m.volumeLandmark;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <h1 className="text-xl font-bold leading-tight">{m.nameFr}</h1>
      {m.nameEn && <p className="text-sm italic text-slate-500">{m.nameEn}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge>{m.groupNameFr}</Badge>
        {m.antagonistId && (
          <Link to={`/muscles/${m.antagonistId}`}>
            <Badge tone="indigo">Muscle opposé : {m.antagonistNameFr}</Badge>
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
          <SectionTitle>
            Séries par semaine{' '}
            <InfoTip srLabel="Séries par semaine">
              Nombre de séries par semaine pour ce muscle : le minimum pour progresser, la zone idéale, et le
              maximum à ne pas dépasser. (Sigles techniques : MEV · MAV · MRV.)
            </InfoTip>
          </SectionTitle>
          <div className="flex gap-2">
            <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{vl.mevSets}</div>
              <div className="text-xs text-slate-400">Minimum</div>
            </div>
            <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{vl.mavSetsMin}–{vl.mavSetsMax}</div>
              <div className="text-xs text-slate-400">Idéal</div>
            </div>
            <div className="flex-1 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-center">
              <div className="text-lg font-bold text-emerald-400">{vl.mrvSets}</div>
              <div className="text-xs text-slate-400">Maximum</div>
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

      <div className="mb-3 flex gap-1 rounded-xl bg-slate-900 p-1">
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

      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        En principal ({primaryAtLevel.length})
      </p>
      <ExerciseLinks items={primaryAtLevel} />
    </div>
  );
}
