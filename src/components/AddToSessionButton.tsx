import {useEffect, useState} from 'react';
import {Check, ClipboardList, ListPlus, Plus, X} from 'lucide-react';
import {addExerciseToNewSession, addExerciseToSession, createEmptyProgram, useMyPrograms, type AddableExercise} from '../lib/myPrograms';
import {useModalDismiss} from '../lib/useModalDismiss';

/**
 * Bouton « Ajouter à un programme » + sélecteur (programme perso -> séance).
 * Calqué sur l'overlay d'ExercisePicker ; l'écriture passe par addExerciseToSession
 * (défauts de prescription + persistance + synchro gérés dans le store).
 */
export default function AddToSessionButton({ex}: {ex: AddableExercise}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
      >
        <ListPlus className="h-4 w-4" /> Ajouter à un programme
      </button>
      {open && <SessionPicker ex={ex} onClose={() => setOpen(false)} />}
    </>
  );
}

function SessionPicker({ex, onClose}: {ex: AddableExercise; onClose: () => void}) {
  useModalDismiss(onClose); // Échap pour fermer + verrou du scroll de fond
  const programs = useMyPrograms();
  const [added, setAdded] = useState<string | null>(null);

  // Le bandeau de confirmation s'efface tout seul (la modale reste ouverte).
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(null), 2000);
    return () => clearTimeout(t);
  }, [added]);

  const add = (programId: string, sessionIndex: number, programName: string) => {
    const sessionName = addExerciseToSession(programId, sessionIndex, ex);
    if (sessionName) setAdded(`${sessionName} · ${programName}`);
  };
  const createAndAdd = () => add(createEmptyProgram(), 0, 'Mon programme');
  const addNew = (programId: string, programName: string) => {
    const sessionName = addExerciseToNewSession(programId, ex);
    if (sessionName) setAdded(`${sessionName} · ${programName}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-picker-title"
        className="mx-auto flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 id="session-picker-title" className="font-semibold">Ajouter à un programme</h3>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-400">{ex.nameFr ?? ex.nameEn}</p>

        {added && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-300">
            <Check className="h-4 w-4 shrink-0" /> Ajouté à {added}
          </p>
        )}

        <div className="mt-3 flex-1 overflow-y-auto">
          {programs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center">
              <p className="text-sm text-slate-400">Tu n'as pas encore de programme perso.</p>
              <button
                onClick={createAndAdd}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
              >
                <Plus className="h-4 w-4" /> Créer un programme et l'ajouter
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {programs.map((p) => (
                <div key={p.id} className="rounded-xl border border-slate-700/70 bg-slate-800/20 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-100">
                    <ClipboardList className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="truncate">{p.nameFr}</span>
                  </p>
                  <div className="grid gap-1.5">
                    {p.sessions.map((s, si) => {
                      const already = s.exercises.some((e) => e.exerciseId === ex.id);
                      return (
                        <button
                          key={si}
                          disabled={already}
                          onClick={() => add(p.id, si, p.nameFr)}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                            already
                              ? 'cursor-default border-slate-800/60 bg-slate-900/30 text-slate-500'
                              : 'border-slate-800 bg-slate-900/60 hover:border-emerald-500/50 hover:bg-slate-800/60'
                          }`}
                        >
                          <span className="truncate font-medium">{s.nameFr}</span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {already ? (
                              <span className="flex items-center gap-1 text-emerald-400">
                                <Check className="h-3.5 w-3.5" /> déjà ajouté
                              </span>
                            ) : (
                              `${s.exercises.length} exo${s.exercises.length > 1 ? 's' : ''}`
                            )}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => addNew(p.id, p.nameFr)}
                      className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-700 px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                    >
                      <Plus className="h-4 w-4 shrink-0" /> Nouvelle séance
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={createAndAdd}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-emerald-700/50 px-3 py-2.5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/10"
              >
                <Plus className="h-4 w-4" /> Nouveau programme
              </button>
            </div>
          )}
        </div>

        {programs.length > 0 && (
          <button onClick={onClose} className="mt-3 w-full rounded-lg border border-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-800">
            Fermer
          </button>
        )}
      </div>
    </div>
  );
}
