import {Check} from 'lucide-react';
import {Link} from 'react-router-dom';
import {exerciseImageUrl, label, type ExerciseListItem} from '../lib/api';
import {Badge} from './ui';
import FavoriteButton from './FavoriteButton';

export default function ExerciseCard({ex}: {ex: ExerciseListItem}) {
  return (
    <Link
      to={`/exercices/${ex.id}`}
      className={`flex gap-3 rounded-xl border p-3 transition-colors ${
        ex.canDo
          ? 'border-emerald-700/40 bg-emerald-950/20 hover:border-emerald-600/60 hover:bg-emerald-950/30'
          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
      }`}
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
          <div className="-mt-1 flex shrink-0 items-center gap-1">
            {ex.isEnriched && (
              <span title="Fiche en français complète" className="h-2 w-2 rounded-full bg-emerald-400" />
            )}
            <FavoriteButton id={ex.id} size={18} />
          </div>
        </div>
        {ex.primaryMuscles.length > 0 && (
          <p className="mt-1 text-sm text-slate-400">{ex.primaryMuscles.map((m) => m.nameFr).join(', ')}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ex.canDo && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-xs font-semibold text-emerald-300">
              <Check className="h-3 w-3" /> Compatible
            </span>
          )}
          <Badge tone="emerald">{label('level', ex.level)}</Badge>
          {ex.equipmentNameFr && <Badge>{ex.equipmentNameFr}</Badge>}
          {ex.mechanic && <Badge tone="indigo">{label('mechanic', ex.mechanic)}</Badge>}
        </div>
      </div>
    </Link>
  );
}
