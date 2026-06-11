import {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {api, label, type Facets} from '../lib/api';
import {useFetch} from '../lib/useFetch';
import ExerciseCard from '../components/ExerciseCard';
import {Empty, ErrorState, Loading} from '../components/ui';

export default function ExercisesPage() {
  const [params, setParams] = useSearchParams();
  const val = (k: string) => params.get(k) ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1'));

  const facets = useFetch<Facets>(() => api.facets(), []);
  const exercises = useFetch(
    () =>
      api.exercises({
        search: val('search') || undefined,
        muscle: val('muscle') || undefined,
        equipment: val('equipment') || undefined,
        level: val('level') || undefined,
        category: val('category') || undefined,
        force: val('force') || undefined,
        page,
      }),
    [params.toString()],
  );

  const setParam = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page'); // tout changement de filtre revient page 1
        return next;
      },
      {replace: true},
    );

  // Recherche : état local + debounce vers l'URL (évite un refetch par frappe).
  const [search, setSearch] = useState(val('search'));
  useEffect(() => {
    const t = setTimeout(() => setParam('search', search.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const selectClass =
    'rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/60';

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un exercice…"
        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-500/60"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <select className={selectClass} value={val('muscle')} onChange={(e) => setParam('muscle', e.target.value)}>
          <option value="">Tous les muscles</option>
          {facets.data?.muscles.map((m) => (
            <option key={m.id} value={m.id}>{m.nameFr}</option>
          ))}
        </select>
        <select className={selectClass} value={val('equipment')} onChange={(e) => setParam('equipment', e.target.value)}>
          <option value="">Tout matériel</option>
          {facets.data?.equipment.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.nameFr}</option>
          ))}
        </select>
        <select className={selectClass} value={val('level')} onChange={(e) => setParam('level', e.target.value)}>
          <option value="">Tous niveaux</option>
          {facets.data?.levels.map((lv) => (
            <option key={lv} value={lv}>{label('level', lv)}</option>
          ))}
        </select>
        <select className={selectClass} value={val('category')} onChange={(e) => setParam('category', e.target.value)}>
          <option value="">Toutes catégories</option>
          {facets.data?.categories.map((c) => (
            <option key={c} value={c}>{label('category', c)}</option>
          ))}
        </select>
        <select className={selectClass} value={val('force')} onChange={(e) => setParam('force', e.target.value)}>
          <option value="">Tout type</option>
          {facets.data?.forces.map((f) => (
            <option key={f} value={f}>{label('force', f)}</option>
          ))}
        </select>
      </div>

      {exercises.loading && <Loading />}
      {exercises.error && <ErrorState message={exercises.error} />}
      {exercises.data && (
        <>
          <p className="mb-3 mt-4 text-sm text-slate-400">{exercises.data.total} exercice(s)</p>
          {exercises.data.items.length === 0 ? (
            <Empty label="Aucun exercice ne correspond à ces filtres." />
          ) : (
            <div className="grid gap-2.5">
              {exercises.data.items.map((ex) => (
                <ExerciseCard key={ex.id} ex={ex} />
              ))}
            </div>
          )}

          {exercises.data.pageCount > 1 && (
            <div className="mt-5 flex items-center justify-between">
              <button
                disabled={page <= 1}
                onClick={() => setParam('page', String(page - 1))}
                className="rounded-lg border border-slate-800 px-4 py-2 text-sm disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-sm text-slate-400">
                Page {page} / {exercises.data.pageCount}
              </span>
              <button
                disabled={page >= exercises.data.pageCount}
                onClick={() => setParam('page', String(page + 1))}
                className="rounded-lg border border-slate-800 px-4 py-2 text-sm disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
