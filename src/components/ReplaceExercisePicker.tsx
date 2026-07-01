import {api, type ExerciseListItem} from '../lib/api';
import {useFetch} from '../lib/useFetch';
import ExercisePicker from './ExercisePicker';

/**
 * « Remplacer un exercice » : ouvre le sélecteur pré-filtré sur le MÊME muscle principal
 * que l'exercice courant (on charge sa fiche pour le connaître), en excluant l'exercice
 * lui-même. Le tri « faisable d'abord » selon le matériel de l'utilisateur est déjà fait
 * côté serveur (la liste remonte tes exos compatibles en premier). 100% client.
 */
export default function ReplaceExercisePicker({
  exerciseId,
  onPick,
  onClose,
}: {
  exerciseId: string;
  onPick: (e: ExerciseListItem) => void;
  onClose: () => void;
}) {
  const {data, loading} = useFetch(() => api.exercise(exerciseId), [exerciseId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm" onClick={onClose}>
        <p className="text-sm text-slate-400">Recherche d'alternatives…</p>
      </div>
    );
  }

  // À défaut de muscle (réseau KO), on ouvre le sélecteur complet (recherche libre).
  const muscle = data?.primaryMuscles?.[0]?.id ?? '';
  return (
    <ExercisePicker
      initialMuscle={muscle}
      primaryMuscle
      excludeId={exerciseId}
      title="Remplacer par un exercice similaire"
      onPick={onPick}
      onClose={onClose}
    />
  );
}
