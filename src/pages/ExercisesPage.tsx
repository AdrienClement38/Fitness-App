import {Heart} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {api, label, type Facets} from '../lib/api';
import {useAuth} from '../lib/auth';
import {hasEquipmentPref} from '../lib/equipment';
import {useFavorites} from '../lib/favorites';
import {useFetch} from '../lib/useFetch';
import ExerciseCard from '../components/ExerciseCard';
import {Empty, ErrorState, Loading} from '../components/ui';

// Niveau : sélecteur segmenté (même style que Programmes / Muscles), + « Tous »
// car la page exercices est une page de parcours (on veut pouvoir tout voir).
const LEVELS = [
  {id: '', label: 'Tous'},
  {id: 'beginner', label: 'Débutant'},
  {id: 'intermediate', label: 'Intermédiaire'},
  {id: 'advanced', label: 'Avancé'},
];

export default function ExercisesPage() {
  const [params, setParams] = useSearchParams();
  const val = (k: string) => params.get(k) ?? '';
  const page = Math.max(1, Number(params.get('page') ?? '1'));

  const {favorites, count: favCount} = useFavorites();
  const favActive = params.get('fav') === '1';

  // Matériel renseigné -> le serveur remonte les exercices faisables en premier (+ drapeau
  // canDo). On inclut sa signature dans les deps pour refetcher quand il change (autre
  // appareil, ou retour depuis « Mon compte » après modification).
  const {user} = useAuth();
  // Préférence renseignée = tableau présent, MÊME vide ([] = « zéro matériel »). La signature
  // distingue null (non renseigné) de [] pour refetcher sur cette transition.
  const equip = user && hasEquipmentPref(user.equipment) ? user.equipment : null;
  const prefSet = equip !== null;
  const equipSig = equip ? `set:${equip.join(',')}` : '∅';

  const facets = useFetch<Facets>(() => api.facets(), []);
  const exercises = useFetch(
    () =>
      api.exercises({
        search: val('search') || undefined,
        muscle: val('muscle') || undefined,
        equipment: val('equipment') || undefined,
        level: val('level') || undefined,
        category: val('category') || undefined,
        ids: favActive ? (favorites.length ? favorites.join(',') : '__none__') : undefined,
        page,
      }),
    [params.toString(), favActive ? favorites.join(',') : '', equipSig],
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

      {/* Niveau en haut : sélecteur segmenté (cohérent avec Programmes / Muscles). */}
      <div className="mt-3 flex gap-1 rounded-xl bg-slate-900 p-1">
        {LEVELS.map((lv) => (
          <button
            key={lv.id || 'all'}
            type="button"
            onClick={() => setParam('level', lv.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              val('level') === lv.id ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lv.label}
          </button>
        ))}
      </div>

      {/* Filtres : Favoris · Type · Matériel · Muscles. */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setParam('fav', favActive ? '' : '1')}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-sm transition-colors ${
            favActive
              ? 'border-rose-500/50 bg-rose-500/15 text-rose-300'
              : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-slate-100'
          }`}
        >
          <Heart size={15} className={favActive ? 'fill-rose-400 text-rose-400' : ''} />
          Favoris{favCount ? ` (${favCount})` : ''}
        </button>
        <select className={selectClass} value={val('category')} onChange={(e) => setParam('category', e.target.value)}>
          <option value="">Tous types</option>
          {facets.data?.categories
            .slice()
            .sort((a, b) => label('category', a).localeCompare(label('category', b), 'fr'))
            .map((c) => (
              <option key={c} value={c}>{label('category', c)}</option>
            ))}
        </select>
        <select className={selectClass} value={val('equipment')} onChange={(e) => setParam('equipment', e.target.value)}>
          <option value="">Tout matériel</option>
          {facets.data?.equipment.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.nameFr}</option>
          ))}
        </select>
        <select className={selectClass} value={val('muscle')} onChange={(e) => setParam('muscle', e.target.value)}>
          <option value="">Tous les muscles</option>
          {facets.data?.muscles.map((m) => (
            <option key={m.id} value={m.id}>{m.nameFr}</option>
          ))}
        </select>
      </div>

      {user && !prefSet && (
        <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
          Indique ton matériel (salle, haltères…) pour repérer d'un coup d'œil les exercices compatibles.{' '}
          <Link to="/compte" className="font-medium text-emerald-400 hover:underline">
            Renseigner
          </Link>
        </p>
      )}

      {exercises.loading && <Loading />}
      {exercises.error && <ErrorState message={exercises.error} />}
      {exercises.data && (
        <>
          <p className="mb-3 mt-4 text-sm text-slate-400">{exercises.data.total} exercice(s)</p>
          {exercises.data.items.length === 0 ? (
            <Empty
              label={
                favActive
                  ? 'Aucun favori pour l’instant — touche le cœur sur un exercice pour l’ajouter.'
                  : 'Aucun exercice ne correspond à ces filtres.'
              }
            />
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
                Page {Math.min(page, exercises.data.pageCount)} / {exercises.data.pageCount}
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
