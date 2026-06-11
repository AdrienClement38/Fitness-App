import {useEffect, useState} from 'react';
import {Search, X} from 'lucide-react';
import {api, label, type ExerciseListItem} from '../lib/api';
import {Badge} from './ui';

/** Modale de recherche pour ajouter un exercice (puise dans les 873 exos). */
export default function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (e: ExerciseListItem) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<ExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.exercises({search: q, page: 1});
        if (active) setItems(res.items);
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto flex max-h-[85vh] w-full max-w-md flex-col rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Ajouter un exercice</h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher (ex. squat, curl, développé…)"
            className="w-full bg-transparent py-2 text-sm focus:outline-none"
          />
        </div>

        <div className="mt-3 flex-1 divide-y divide-slate-800 overflow-y-auto">
          {loading && <p className="py-6 text-center text-sm text-slate-500">Recherche…</p>}
          {!loading && items.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Aucun résultat.</p>}
          {!loading &&
            items.map((e) => (
              <button
                key={e.id}
                onClick={() => onPick(e)}
                className="flex w-full items-center justify-between gap-2 py-2.5 text-left hover:bg-slate-800/50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{e.nameFr ?? e.nameEn}</span>
                  {e.primaryMuscles[0] && <span className="block truncate text-xs text-slate-500">{e.primaryMuscles[0].nameFr}</span>}
                </span>
                <Badge tone="emerald">{label('level', e.level)}</Badge>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
