import {useEffect, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, Dumbbell, Search, X} from 'lucide-react';
import {api, exerciseImageUrl, label, type ExerciseListItem, type Facets} from '../lib/api';
import {useFetch} from '../lib/useFetch';
import {useModalDismiss} from '../lib/useModalDismiss';
import {Badge} from './ui';

/**
 * Modale de choix d'exercice (création/édition de programme). Pensée pour
 * trouver SANS connaître le nom : recherche + filtres muscle/niveau, et une
 * grille visuelle avec la photo de chaque exercice.
 */
export default function ExercisePicker({
  onPick,
  onClose,
}: {
  onPick: (e: ExerciseListItem) => void;
  onClose: () => void;
}) {
  useModalDismiss(onClose); // Échap pour fermer + verrou du scroll de fond
  const [q, setQ] = useState('');
  const [muscle, setMuscle] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ExerciseListItem[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [netError, setNetError] = useState(false); // échec réseau ≠ zéro résultat
  const listRef = useRef<HTMLDivElement>(null);

  const facets = useFetch<Facets>(() => api.facets(), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.exercises({
          search: q || undefined,
          muscle: muscle || undefined,
          level: level || undefined,
          page,
        });
        if (active) {
          setItems(res.items);
          setPageCount(res.pageCount);
          setTotal(res.total);
          setNetError(false);
        }
      } catch {
        if (active) {
          setItems([]);
          setNetError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q, muscle, level, page]);

  useEffect(() => {
    listRef.current?.scrollTo({top: 0});
  }, [page]);

  const selectClass =
    'min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-sm focus:border-emerald-500 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-picker-title"
        className="mx-auto flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 id="exercise-picker-title" className="font-semibold">Ajouter un exercice</h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Rechercher (ex. squat, curl, développé…)"
            className="w-full bg-transparent py-2 text-sm focus:outline-none"
          />
        </div>

        <div className="mt-2 flex gap-2">
          <select
            value={muscle}
            onChange={(e) => {
              setMuscle(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrer par muscle"
            className={selectClass}
          >
            <option value="">Tous les muscles</option>
            {facets.data?.muscles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nameFr}
              </option>
            ))}
          </select>
          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setPage(1);
            }}
            aria-label="Filtrer par niveau"
            className={selectClass}
          >
            <option value="">Tous niveaux</option>
            {facets.data?.levels.map((lv) => (
              <option key={lv} value={lv}>
                {label('level', lv)}
              </option>
            ))}
          </select>
        </div>

        <div ref={listRef} className="mt-3 flex-1 overflow-y-auto">
          {loading && <p className="py-8 text-center text-sm text-slate-500">Recherche…</p>}
          {!loading && netError && (
            <p className="py-8 text-center text-sm text-amber-300">Connexion indisponible. Réessaie une fois en ligne.</p>
          )}
          {!loading && !netError && items.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">Aucun résultat avec ces filtres.</p>
          )}
          {!loading && items.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {items.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onPick(e)}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-left transition-colors hover:border-emerald-500/50 hover:bg-slate-800/60"
                >
                  {e.images && e.images.length > 0 ? (
                    <img
                      src={exerciseImageUrl(e.images[0])}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full rounded-lg border border-slate-800 bg-slate-950 object-contain"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-700">
                      <Dumbbell className="h-6 w-6" />
                    </div>
                  )}
                  <p className="mt-1.5 line-clamp-2 text-xs font-medium leading-snug">{e.nameFr ?? e.nameEn}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{e.primaryMuscles[0]?.nameFr ?? ''}</p>
                  <div className="mt-1">
                    <Badge tone="emerald">{label('level', e.level)}</Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {pageCount > 1 && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-sm disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Préc.
            </button>
            <span className="text-xs text-slate-500">
              Page {page}/{pageCount} · {total} exos
            </span>
            <button
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-sm disabled:opacity-40"
            >
              Suiv. <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
