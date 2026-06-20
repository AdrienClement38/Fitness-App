import {Heart, Info, RotateCcw} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {api, label, type Facets} from '../lib/api';
import {useAuth} from '../lib/auth';
import {hasEquipmentPref} from '../lib/equipment';
import {useFavorites} from '../lib/favorites';
import {useFetch} from '../lib/useFetch';
import {getPreset} from '../lib/presets';
import BodyMap from '../components/BodyMap';
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

  // Collection curée (preset) : ?preset=<clé> -> on restreint la liste à des ids choisis
  // (ex. « Gros mouvements dépensiers »). Les filtres normaux s'appliquent EN PLUS.
  const preset = getPreset(val('preset'));
  const presetIds = preset ? preset.ids.join(',') : undefined;

  // Facettes CONTEXTUELLES : on transmet les filtres actifs (et l'état favoris / preset) ->
  // les <select> ne proposent que des valeurs qui donnent des résultats. Refetch à chaque
  // changement. Jeu d'ids actif : favoris (prioritaire) sinon preset sinon aucun.
  const listIds = favActive ? (favorites.length ? favorites.join(',') : '__none__') : presetIds;
  const facetIds = listIds;
  const facetSig = [
    val('search'), val('muscle'), val('equipment'), val('level'), val('category'), val('mechanic'), val('primary'), facetIds ?? '',
  ].join('|');
  const facets = useFetch<Facets>(
    () =>
      api.facets({
        search: val('search') || undefined,
        muscle: val('muscle') || undefined,
        equipment: val('equipment') || undefined,
        level: val('level') || undefined,
        category: val('category') || undefined,
        mechanic: val('mechanic') || undefined,
        primary: val('primary') || undefined,
        ids: facetIds,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [facetSig],
  );
  const exercises = useFetch(
    () =>
      api.exercises({
        search: val('search') || undefined,
        muscle: val('muscle') || undefined,
        equipment: val('equipment') || undefined,
        level: val('level') || undefined,
        category: val('category') || undefined,
        mechanic: val('mechanic') || undefined,
        primary: val('primary') || undefined,
        ids: listIds,
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

  // Muscle filtré (pour le titre du body-map). Présent dans les facettes contextuelles
  // puisqu'on ne peut sélectionner qu'un muscle disponible.
  const selectedMuscle = facets.data?.muscles.find((m) => m.id === val('muscle'));

  return (
    <div>
      {/* Collection curée active (preset) : on annonce le contexte + sortie vers le catalogue. */}
      {preset && !favActive && (
        <div className="mb-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-emerald-200">{preset.label}</span>
            <Link to="/exercices" className="shrink-0 text-xs text-slate-400 hover:text-slate-200">
              Tout le catalogue
            </Link>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{preset.intro}</p>
        </div>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un exercice…"
        className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-500/60"
      />

      {/* Niveau : sélecteur segmenté contextuel. « Tous » (id vide) reste toujours actif ;
          un niveau sans exercice pour les filtres en cours (type/matériel/muscle) est grisé
          et non cliquable — comme les options absentes des selects. */}
      <div className="mt-3 flex gap-1 rounded-xl bg-slate-900 p-1">
        {LEVELS.map((lv) => {
          const disabled = lv.id !== '' && !!facets.data && !facets.data.levels.includes(lv.id);
          return (
            <button
              key={lv.id || 'all'}
              type="button"
              disabled={disabled}
              onClick={() => setParam('level', lv.id)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                val('level') === lv.id
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : disabled
                    ? 'cursor-not-allowed text-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lv.label}
            </button>
          );
        })}
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
      </div>

      {/* Filtre par muscle : body-map (remplace le select). Les muscles sans exercice
          pour les filtres actifs (type / matériel) sont grisés et non cliquables. Clic
          sur un muscle = filtre ; clic sur le muscle actif = on enlève le filtre. */}
      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">
            {selectedMuscle ? (
              <>
                Muscle : <span className="text-emerald-300">{selectedMuscle.nameFr}</span>
              </>
            ) : (
              <>
                Filtrer par muscle <span className="text-slate-600">— touche le schéma</span>
              </>
            )}
          </span>
          {val('muscle') && (
            <div className="flex items-center gap-1">
              <Link
                to={`/muscles/${val('muscle')}`}
                title="Voir la fiche du muscle"
                aria-label="Voir la fiche du muscle"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              >
                <Info className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setParam('muscle', '')}
                title="Enlever le filtre muscle"
                aria-label="Enlever le filtre muscle"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <BodyMap
          onSelect={(id) => setParam('muscle', id === val('muscle') ? '' : id)}
          available={facets.data?.muscles.map((m) => m.id)}
          primary={val('muscle') ? [val('muscle')] : []}
          hideLegend
        />
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
