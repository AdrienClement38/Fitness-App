import {Link} from 'react-router-dom';
import {exerciseImageUrl, label, type ExerciseListItem} from '../lib/api';
import {Badge} from './ui';

export default function ExerciseCard({ex}: {ex: ExerciseListItem}) {
  return (
    <Link
      to={`/exercices/${ex.id}`}
      className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900"
    >
      {ex.images && ex.images.length > 0 && (
        <img
          src={exerciseImageUrl(ex.images[0])}
          alt=""
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-lg border border-slate-800 bg-slate-950 object-contain"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{ex.nameFr ?? ex.nameEn}</h3>
          {ex.isEnriched && (
            <span title="Fiche en français complète" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
          )}
        </div>
        {ex.primaryMuscles.length > 0 && (
          <p className="mt-1 text-sm text-slate-400">{ex.primaryMuscles.map((m) => m.nameFr).join(', ')}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone="emerald">{label('level', ex.level)}</Badge>
          {ex.equipmentNameFr && <Badge>{ex.equipmentNameFr}</Badge>}
          {ex.mechanic && <Badge tone="indigo">{label('mechanic', ex.mechanic)}</Badge>}
        </div>
      </div>
    </Link>
  );
}
