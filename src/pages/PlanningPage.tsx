import {useMemo, useState} from 'react';
import {CalendarDays, ChevronLeft, Moon, Pencil, Play, Plus, Search, X} from 'lucide-react';
import {Link} from 'react-router-dom';
import {api} from '../lib/api';
import {getMyProgram, useMyPrograms} from '../lib/myPrograms';
import {useFetch} from '../lib/useFetch';
import {Loading} from '../components/ui';
import {
  DAY_LABELS,
  nextPlanned,
  setPlanSlot,
  useWeeklyPlan,
  weekdayIndex,
  type PlanSlot,
} from '../lib/weeklyPlan';

/** Lien vers le programme (perso ou catalogue) — là où on démarre la séance. */
const hrefFor = (s: PlanSlot) => (s.programMine ? `/mes-programmes/${s.programId}` : `/programmes/${s.programId}`);

const whenLabel = (inDays: number) => (inDays === 0 ? "aujourd'hui" : inDays === 1 ? 'demain' : null);

export default function PlanningPage() {
  const plan = useWeeklyPlan();
  const today = weekdayIndex(new Date().toISOString());
  const next = nextPlanned(plan);
  const [editing, setEditing] = useState<number | null>(null); // jour dont on ouvre le sélecteur

  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <CalendarDays className="h-6 w-6 text-emerald-400" /> Planning de la semaine
      </h1>
      <p className="mt-1 text-sm text-slate-400">Ta routine type, la même chaque semaine. Touche un jour pour y placer une séance.</p>

      {next && (
        <div className="mt-4 rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/80">Prochaine séance</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{next.slot.sessionName}</p>
              <p className="truncate text-sm text-slate-400">
                {DAY_LABELS[next.day]}
                {whenLabel(next.inDays) ? ` · ${whenLabel(next.inDays)}` : ''} — {next.slot.programName}
              </p>
            </div>
            <Link
              to={hrefFor(next.slot)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              <Play className="h-4 w-4" /> Démarrer
            </Link>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-2">
        {DAY_LABELS.map((label, day) => {
          const slot = plan[day];
          const isToday = day === today;
          return (
            <div
              key={day}
              className={`rounded-xl border p-3 ${isToday ? 'border-emerald-700/50 bg-emerald-950/10' : 'border-slate-800 bg-slate-900/40'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isToday ? 'text-emerald-300' : 'text-slate-200'}`}>{label}</span>
                    {isToday && (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">aujourd'hui</span>
                    )}
                  </div>
                  {slot ? (
                    <Link to={hrefFor(slot)} className="mt-0.5 block min-w-0">
                      <span className="block truncate text-sm text-slate-200">{slot.sessionName}</span>
                      <span className="block truncate text-xs text-slate-500">{slot.programName}</span>
                    </Link>
                  ) : (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600">
                      <Moon className="h-3 w-3" /> Repos
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {slot && (
                    <Link
                      to={hrefFor(slot)}
                      aria-label="Démarrer la séance"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                    >
                      <Play className="h-4 w-4" />
                    </Link>
                  )}
                  <button
                    onClick={() => setEditing(day)}
                    aria-label={slot ? 'Modifier' : 'Planifier'}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    {slot ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing !== null && <PlanPicker day={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/* ---- Sélecteur : programme (mes programmes + catalogue) -> séance ------- */

type Picked = {id: string; mine: boolean; name: string};

function PlanPicker({day, onClose}: {day: number; onClose: () => void}) {
  const myPrograms = useMyPrograms();
  const {data: catalogue, loading, error} = useFetch(() => api.programs(), []);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [q, setQ] = useState('');

  const choose = (slot: PlanSlot | null) => {
    setPlanSlot(day, slot);
    onClose();
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!catalogue) return [];
    return term ? catalogue.filter((p) => p.nameFr.toLowerCase().includes(term)) : catalogue;
  }, [catalogue, q]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <h2 className="flex min-w-0 items-center gap-2 font-semibold">
            {picked && (
              <button onClick={() => setPicked(null)} aria-label="Retour" className="-ml-1 rounded-lg p-1 text-slate-400 hover:bg-slate-800">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <span className="truncate">{picked ? picked.name : `Planifier — ${DAY_LABELS[day]}`}</span>
          </h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {picked ? (
            <SessionList picked={picked} onPick={(sessionName) => choose({programId: picked.id, programMine: picked.mine, programName: picked.name, sessionName})} />
          ) : (
            <>
              <button
                onClick={() => choose(null)}
                className="flex w-full items-center gap-2 rounded-lg border border-slate-700 px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-800"
              >
                <Moon className="h-4 w-4 text-slate-500" /> Repos (rien ce jour)
              </button>

              {myPrograms.length > 0 && (
                <section className="mt-4">
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Mes programmes</h3>
                  <div className="grid gap-1.5">
                    {myPrograms.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPicked({id: p.id, mine: true, name: p.nameFr})}
                        className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-left text-sm hover:border-emerald-700/50"
                      >
                        {p.nameFr}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="mt-4">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Catalogue</h3>
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Filtrer un programme…"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-8 pr-3 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                {loading ? (
                  <Loading />
                ) : error ? (
                  <p className="text-sm text-red-300">Catalogue indisponible (hors ligne ?).</p>
                ) : (
                  <div className="grid gap-1.5">
                    {filtered.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPicked({id: p.id, mine: false, name: p.nameFr})}
                        className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-left text-sm hover:border-emerald-700/50"
                      >
                        {p.nameFr}
                      </button>
                    ))}
                    {filtered.length === 0 && <p className="text-sm text-slate-500">Aucun programme.</p>}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Liste des séances du programme choisi (perso = en mémoire, catalogue = fetch). */
function SessionList({picked, onPick}: {picked: Picked; onPick: (sessionName: string) => void}) {
  const {data: detail, loading, error} = useFetch(
    () => (picked.mine ? Promise.resolve(null) : api.program(picked.id)),
    [picked.id, picked.mine],
  );
  const sessions: string[] = picked.mine
    ? (getMyProgram(picked.id)?.sessions ?? []).map((s) => s.nameFr)
    : (detail?.sessions ?? []).map((s) => s.nameFr);

  if (!picked.mine && loading) return <Loading />;
  if (!picked.mine && error) return <p className="text-sm text-red-300">Programme indisponible (hors ligne ?).</p>;
  if (sessions.length === 0) return <p className="text-sm text-slate-500">Ce programme n'a pas de séance.</p>;

  return (
    <div className="grid gap-1.5">
      <p className="mb-0.5 text-xs text-slate-500">Choisis la séance à placer ce jour :</p>
      {sessions.map((name, i) => (
        <button
          key={i}
          onClick={() => onPick(name)}
          className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-left text-sm hover:border-emerald-700/50"
        >
          <span className="min-w-0 truncate">{name}</span>
          <Plus className="h-4 w-4 shrink-0 text-emerald-400" />
        </button>
      ))}
    </div>
  );
}
