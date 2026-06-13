import {useEffect, useState} from 'react';
import {ArrowLeft, ChevronLeft, ChevronRight, Play, X} from 'lucide-react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {api, exerciseImageUrl, label} from '../lib/api';
import {useFetch} from '../lib/useFetch';
import {Badge, ErrorState, Loading, SectionTitle} from '../components/ui';
import FavoriteButton from '../components/FavoriteButton';
import AddToSessionButton from '../components/AddToSessionButton';
import {startQuickSession, useActiveWorkout} from '../lib/workoutLogs';
import BodyMap from '../components/BodyMap';

function List({items, tone}: {items: string[]; tone?: 'amber' | 'slate'}) {
  return (
    <ul className="mt-1 space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-slate-300">
          <span className={tone === 'amber' ? 'text-amber-400' : 'text-emerald-400'}>•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ExerciseDetailPage() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data: ex, error, loading} = useFetch(() => api.exercise(id!), [id]);
  const active = useActiveWorkout();
  const [zoom, setZoom] = useState<number | null>(null); // index de l'image agrandie (lightbox)

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!ex) return null;

  const quickStart = () => {
    if (active && !confirm('Une séance est déjà en cours. La remplacer par cet exercice ?')) return;
    startQuickSession({id: ex.id, nameFr: ex.nameFr, nameEn: ex.nameEn, force: ex.force, category: ex.category, measureKind: ex.measureKind, equipmentId: ex.equipmentId});
    navigate('/seance');
  };

  const instructions = ex.instructionsFr ?? ex.instructionsEn ?? [];
  const instructionsAreFr = Boolean(ex.instructionsFr);

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold leading-tight">{ex.nameFr ?? ex.nameEn}</h1>
          {ex.nameFr && <p className="text-sm italic text-slate-500">{ex.nameEn}</p>}
        </div>
        <FavoriteButton id={ex.id} size={24} />
      </div>
      {ex.aliasesFr && ex.aliasesFr.length > 0 && (
        <p className="mt-1 text-sm text-slate-400">Aussi appelé : {ex.aliasesFr.join(', ')}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone="emerald">{label('level', ex.level)}</Badge>
        <Badge>{label('category', ex.category)}</Badge>
        {ex.force && <Badge tone="amber">{label('force', ex.force)}</Badge>}
        {ex.mechanic && <Badge tone="indigo">{label('mechanic', ex.mechanic)}</Badge>}
        {ex.equipmentNameFr && <Badge>{ex.equipmentNameFr}</Badge>}
        {ex.movementPatternNameFr && <Badge>{ex.movementPatternNameFr}</Badge>}
        {ex.tempo && <Badge tone="indigo">Tempo {ex.tempo}</Badge>}
      </div>

      <button
        onClick={quickStart}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400"
      >
        <Play className="h-4 w-4" /> Faire maintenant
      </button>
      <AddToSessionButton ex={ex} />

      {ex.images && ex.images.length > 0 && (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-2">
            {ex.images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setZoom(i)}
                aria-label={`Agrandir l'image ${i + 1}`}
                className="aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
              >
                <img
                  src={exerciseImageUrl(img)}
                  alt={`${ex.nameFr ?? ex.nameEn} — position ${i + 1}`}
                  loading="lazy"
                  className="h-full w-full object-contain"
                />
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Photos :{' '}
            <a
              href="https://github.com/yuhonas/free-exercise-db"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 hover:underline"
            >
              free-exercise-db
            </a>{' '}
            — domaine public (The Unlicense)
          </p>
        </div>
      )}

      <SectionTitle>Muscles</SectionTitle>
      <BodyMap
        primary={ex.primaryMuscles.map((m) => m.id)}
        secondary={ex.secondaryMuscles.map((m) => m.id)}
        className="mb-3"
      />
      <div className="flex flex-wrap gap-1.5">
        {ex.primaryMuscles.map((m) => (
          <Link key={m.id} to={`/muscles/${m.id}`} className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25">
            {m.nameFr}
          </Link>
        ))}
        {ex.secondaryMuscles.map((m) => (
          <Link key={m.id} to={`/muscles/${m.id}`} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700">
            {m.nameFr}
          </Link>
        ))}
      </div>

      {instructions.length > 0 && (
        <>
          <SectionTitle>Exécution</SectionTitle>
          {!instructionsAreFr && (
            <p className="mb-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Instructions en anglais — traduction française à venir.
            </p>
          )}
          <ol className="space-y-2">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-300">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-400">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {ex.tipsFr && ex.tipsFr.length > 0 && (
        <>
          <SectionTitle>Conseils</SectionTitle>
          <List items={ex.tipsFr} />
        </>
      )}
      {ex.commonMistakesFr && ex.commonMistakesFr.length > 0 && (
        <>
          <SectionTitle>Erreurs fréquentes</SectionTitle>
          <List items={ex.commonMistakesFr} tone="amber" />
        </>
      )}
      {ex.contraindicationsFr && ex.contraindicationsFr.length > 0 && (
        <>
          <SectionTitle>Contre-indications</SectionTitle>
          <List items={ex.contraindicationsFr} tone="amber" />
        </>
      )}

      {zoom !== null && ex.images && (
        <ImageLightbox
          images={ex.images}
          alt={ex.nameFr ?? ex.nameEn}
          index={zoom}
          onClose={() => setZoom(null)}
          onIndex={(i) => setZoom(i)}
        />
      )}
    </div>
  );
}

/** Plein écran : image d'exercice agrandie, navigable (flèches / clavier), fermable. */
function ImageLightbox({
  images,
  alt,
  index,
  onClose,
  onIndex,
}: {
  images: string[];
  alt: string;
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const multi = images.length > 1;
  const go = (delta: number) => onIndex((index + delta + images.length) % images.length);

  // Échap pour fermer, flèches pour naviguer, et on bloque le scroll de fond.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (multi && e.key === 'ArrowRight') go(1);
      else if (multi && e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-slate-400">{multi ? `${index + 1} / ${images.length}` : ''}</span>
        <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1.5 text-slate-300 hover:bg-slate-800">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center px-3 pb-8">
        {/* Clic sur l'image : ne ferme pas. Clic n'importe où ailleurs (fond, marges) : ferme. */}
        <img
          src={exerciseImageUrl(images[index])}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-lg object-contain"
        />
      </div>
      {multi && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Image précédente"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 p-2 text-slate-200 hover:bg-slate-800"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Image suivante"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/70 p-2 text-slate-200 hover:bg-slate-800"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
    </div>
  );
}
