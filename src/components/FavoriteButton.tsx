import {Heart} from 'lucide-react';
import {useFavorites} from '../lib/favorites';

/** Bouton ♥ de mise en favori. Utilisable dans un lien (stoppe la navigation). */
export default function FavoriteButton({id, size = 18}: {id: string; size?: number}) {
  const {isFavorite, toggle} = useFavorites();
  const fav = isFavorite(id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      aria-pressed={fav}
      aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className="shrink-0 rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-rose-400"
    >
      <Heart size={size} className={fav ? 'fill-rose-500 text-rose-500' : ''} />
    </button>
  );
}
