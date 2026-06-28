import {useEffect, useState} from 'react';
import {ArrowLeft, Check, Copy, Plus, Trash2} from 'lucide-react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {label, measureKind, type ExerciseListItem} from '../lib/api';
import {Badge, Empty} from '../components/ui';
import ExercisePicker from '../components/ExercisePicker';
import {
  addExerciseToSession,
  duplicateSession,
  getMyProgram,
  removeMyProgram,
  updateMyProgram,
  useMyPrograms,
  type MyProgram,
  type MyProgramExercise,
} from '../lib/myPrograms';

/** Libellé du champ « répétitions » selon le mode (reps / durée). */
const repLabel = (e: {category: string | null; force: string | null; equipmentId: string | null}): string => {
  const k = measureKind(e);
  return k === 'duration' ? 'Durée (s)' : k === 'cardio' ? 'Durée (min)' : 'Reps';
};

/** Petit champ numérique : vide -> null. `step < 1` -> clavier décimal (poids en demi-kilos). */
function Num({value, onChange, title, step = 1}: {value: number | null; onChange: (v: number | null) => void; title?: string; step?: number}) {
  return (
    <input
      type="number"
      inputMode={step < 1 ? 'decimal' : 'numeric'}
      min={0}
      step={step}
      title={title}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
      className="w-14 rounded-md border border-slate-700 bg-slate-800 px-1.5 py-1 text-center text-sm tabular-nums focus:border-emerald-500 focus:outline-none"
    />
  );
}

export default function MyProgramPage() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  useMyPrograms(); // s'abonne au store pour re-render à chaque édition
  const program = id ? getMyProgram(id) : undefined;

  const [flash, setFlash] = useState(false); // indicateur "Enregistré" après une modif
  const [pickerFor, setPickerFor] = useState<number | null>(null); // index de séance où ajouter un exo
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 1300);
    return () => clearTimeout(t);
  }, [flash]);

  if (!program) {
    return (
      <div>
        <button onClick={() => navigate('/programmes')} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Programmes
        </button>
        <Empty label="Ce programme n'existe plus." />
      </div>
    );
  }

  // Édition immuable : on clone, on mute le brouillon, on enregistre, on signale.
  const patch = (mut: (draft: MyProgram) => void) => {
    const draft = structuredClone(program);
    mut(draft);
    updateMyProgram(draft);
    setFlash(true);
  };
  const patchEx = (si: number, ei: number, p: Partial<MyProgramExercise>) =>
    patch((d) => {
      Object.assign(d.sessions[si].exercises[ei], p);
    });
  const addExercise = (si: number, e: ExerciseListItem) => {
    addExerciseToSession(program.id, si, e);
    setFlash(true);
    setPickerFor(null);
  };
  const addSession = () =>
    patch((d) => d.sessions.push({nameFr: `Séance ${d.sessions.length + 1}`, focusFr: null, exercises: []}));
  const removeSession = (si: number) => {
    if (confirm(`Supprimer « ${program.sessions[si].nameFr} » ?`)) patch((d) => d.sessions.splice(si, 1));
  };
  const del = () => {
    if (confirm(`Supprimer « ${program.nameFr} » ? Action définitive.`)) {
      removeMyProgram(program.id);
      navigate('/programmes');
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => navigate('/programmes')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Programmes
        </button>
        <span
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
            flash ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-500'
          }`}
        >
          <Check className="h-3.5 w-3.5" /> {flash ? 'Enregistré' : 'Enregistré auto'}
        </span>
      </div>

      <input
        value={program.nameFr}
        onChange={(e) => patch((d) => (d.nameFr = e.target.value))}
        aria-label="Nom du programme"
        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xl font-bold focus:border-emerald-500 focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {program.level && <Badge tone="emerald">{label('level', program.level)}</Badge>}
        {program.theme && <Badge tone="indigo">{label('theme', program.theme)}</Badge>}
        <Badge>Programme perso</Badge>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Tes modifications sont enregistrées automatiquement sur cet appareil. Quand tu as fini, clique « Terminé ».
      </p>

      <div className="mt-4 grid gap-4">
        {program.sessions.map((s, si) => (
          <div key={si} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <input
                value={s.nameFr}
                onChange={(e) => patch((d) => (d.sessions[si].nameFr = e.target.value))}
                aria-label="Nom de la séance"
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent font-semibold hover:border-slate-700 focus:border-emerald-500 focus:bg-slate-800 focus:outline-none"
              />
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={() => {
                    if (duplicateSession(program.id, si)) setFlash(true);
                  }}
                  aria-label="Dupliquer la séance"
                  title="Dupliquer la séance"
                  className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-emerald-300"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeSession(si)}
                  aria-label="Supprimer la séance"
                  className="rounded-md p-1 text-slate-500 hover:bg-red-950/40 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {s.exercises.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Aucun exercice. Ajoute-en un ci-dessous.</p>
            ) : (
              <div className="mt-2 divide-y divide-slate-800">
                {s.exercises.map((e, ei) => (
                  <div key={ei} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Link to={`/exercices/${e.exerciseId}`} className="min-w-0 flex-1 text-sm hover:text-emerald-300">
                        {e.nameFr ?? e.nameEn}
                      </Link>
                      <button
                        onClick={() => patch((d) => d.sessions[si].exercises.splice(ei, 1))}
                        aria-label="Retirer l'exercice"
                        className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-red-950/40 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-col gap-1.5 text-xs text-slate-400">
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2">
                          <span className="w-20 shrink-0 text-slate-500">Séries</span>
                          <Num
                            value={e.sets}
                            onChange={(v) => {
                              let nextConfigs = e.setConfigs;
                              if (e.progressive && nextConfigs) {
                                const targetLen = v || 1;
                                if (nextConfigs.length < targetLen) {
                                  nextConfigs = [...nextConfigs];
                                  while (nextConfigs.length < targetLen) {
                                    const last = nextConfigs[nextConfigs.length - 1] || { repsMin: e.repsMin, repsMax: e.repsMax, weight: e.weight ?? null };
                                    nextConfigs.push({ ...last });
                                  }
                                } else if (nextConfigs.length > targetLen) {
                                  nextConfigs = nextConfigs.slice(0, targetLen);
                                }
                              }
                              patchEx(si, ei, {
                                sets: v,
                                setConfigs: nextConfigs,
                              });
                            }}
                            title="Séries"
                          />
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">progressive</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={e.progressive || false}
                            onClick={() => {
                              const nextVal = !(e.progressive || false);
                              let setConfigs = e.setConfigs;
                              if (nextVal && (!setConfigs || setConfigs.length === 0)) {
                                const count = e.sets && e.sets > 0 ? e.sets : 1;
                                const baseReps = e.repsMax != null ? e.repsMax - 2 : e.repsMin;
                                setConfigs = Array.from({length: count}, () => ({
                                  repsMin: baseReps,
                                  repsMax: baseReps,
                                  weight: e.weight ?? null,
                                }));
                              }
                              patchEx(si, ei, {
                                progressive: nextVal,
                                setConfigs: nextVal ? setConfigs : null,
                              });
                            }}
                            className="flex items-center focus:outline-none"
                          >
                            <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${(e.progressive || false) ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                              <span className={`inline-block h-4 w-4 rounded-full bg-slate-100 shadow-sm transition-transform duration-200 ${(e.progressive || false) ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
                            </span>
                          </button>
                        </div>
                      </div>

                      {!e.progressive ? (
                        <>
                          {measureKind(e) === 'load' && (
                            <label className="flex items-center gap-2">
                              <span className="w-20 shrink-0 text-slate-500">Poids</span>
                              <Num value={e.weight ?? null} step={0.5} onChange={(v) => patchEx(si, ei, {weight: v})} title="Poids de base (kg)" />
                              <span className="text-slate-500">kg</span>
                            </label>
                          )}
                          <label className="flex items-center gap-2">
                            <span className="w-20 shrink-0 text-slate-500">{repLabel(e)}</span>
                            <Num
                              value={e.repsMax != null ? e.repsMax - 2 : null}
                              onChange={(v) => {
                                patchEx(si, ei, {
                                  repsMin: v === null ? null : Math.max(1, v - 2),
                                  repsMax: v === null ? null : v + 2,
                                });
                              }}
                              title={repLabel(e)}
                            />
                          </label>
                        </>
                      ) : (
                        <div className="mt-1 flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/20 p-2.5">
                          {Array.from({length: e.sets || 1}).map((_, index) => {
                            const config = e.setConfigs?.[index] || { repsMin: e.repsMin, repsMax: e.repsMax, weight: e.weight ?? null };
                            const isLoad = measureKind(e) === 'load';

                            const updateConfig = (patch: Partial<{repsMin: number | null; repsMax: number | null; weight: number | null}>) => {
                              const nextConfigs = [...(e.setConfigs || [])];
                              while (nextConfigs.length <= index) {
                                nextConfigs.push({ repsMin: e.repsMin, repsMax: e.repsMax, weight: e.weight ?? null });
                              }
                              nextConfigs[index] = { ...nextConfigs[index], ...patch };
                              patchEx(si, ei, { setConfigs: nextConfigs });
                            };

                            return (
                              <div key={index} className="flex items-center gap-3 text-[11px]">
                                <span className="w-14 shrink-0 text-slate-500 font-semibold tabular-nums">Série {index + 1}</span>
                                {isLoad ? (
                                  <div className="flex items-center gap-1.5">
                                    <Num value={config.weight} step={0.5} onChange={(v) => updateConfig({ weight: v })} title="kg" />
                                    <span className="text-slate-500">kg</span>
                                    <span className="text-slate-700">·</span>
                                    <Num value={config.repsMin} onChange={(v) => updateConfig({ repsMin: v, repsMax: v })} title="reps" />
                                    <span className="text-slate-500">reps</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <Num value={config.repsMin} onChange={(v) => updateConfig({ repsMin: v, repsMax: v })} title={repLabel(e)} />
                                    <span className="text-slate-500">{repLabel(e).toLowerCase()}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <label className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-slate-500">Repos</span>
                        <Num value={e.restSeconds} onChange={(v) => patchEx(si, ei, {restSeconds: v})} title="Repos (s)" />
                        <span className="text-slate-500">s</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setPickerFor(si)}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-slate-700 py-2 text-sm text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300"
            >
              <Plus className="h-4 w-4" /> Ajouter un exercice
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addSession}
        className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-700 py-2.5 text-sm text-slate-300 hover:border-emerald-500/50 hover:text-emerald-300"
      >
        <Plus className="h-4 w-4" /> Ajouter une séance
      </button>

      <button
        onClick={() => navigate(`/mes-programmes/${program.id}`)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30"
      >
        <Check className="h-4 w-4" /> Terminé
      </button>
      <button
        onClick={del}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl px-4 py-2 text-sm text-red-400 hover:bg-red-950/40 hover:text-red-300"
      >
        <Trash2 className="h-4 w-4" /> Supprimer ce programme
      </button>

      {pickerFor !== null && (
        <ExercisePicker onPick={(e) => addExercise(pickerFor, e)} onClose={() => setPickerFor(null)} />
      )}
    </div>
  );
}
