import {useEffect, useMemo, useState} from 'react';
import {CalendarDays, ChevronLeft, ChevronRight, X} from 'lucide-react';
import type {WorkoutLog} from '../lib/workoutLogs';
import type {MyProgram} from '../lib/myPrograms';
import {addMonths, groupByDay, labelFromKey, monthGrid, monthLabel, todayKey} from '../lib/calendar';
import SessionCard from './SessionCard';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Calendrier mensuel de tes séances : un point vert les jours où tu es allé t'entraîner,
 * navigation mois par mois. Au clic sur un jour actif -> popup avec le détail des séances.
 */
export default function WorkoutCalendar({history, myPrograms}: {history: WorkoutLog[]; myPrograms: MyProgram[]}) {
  const byDay = useMemo(() => groupByDay(history), [history]);
  const start = todayKey();
  const [view, setView] = useState(() => {
    const [y, m] = start.split('-').map(Number);
    return {year: y, month: m - 1};
  });
  const [selected, setSelected] = useState<string | null>(null);
  const grid = useMemo(() => monthGrid(view.year, view.month), [view]);

  const selectedLogs = selected ? byDay.get(selected) ?? [] : [];
  // Si le dernier log d'un jour ouvert est supprimé, on referme la popup.
  useEffect(() => {
    if (selected && selectedLogs.length === 0) setSelected(null);
  }, [selected, selectedLogs.length]);

  return (
    <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
      {/* En-tête : mois + navigation */}
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setView((v) => addMonths(v, -1))}
          aria-label="Mois précédent"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold">{monthLabel(view.year, view.month)}</span>
        <button
          onClick={() => setView((v) => addMonths(v, 1))}
          aria-label="Mois suivant"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Jours de la semaine (décoratif : chaque bouton-jour porte la date complète en aria-label) */}
      <div aria-hidden="true" className="grid grid-cols-7 text-center text-[11px] font-medium text-slate-600">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 gap-1">
        {grid.flat().map((cell) => {
          const count = byDay.get(cell.key)?.length ?? 0;
          const has = count > 0;
          const isToday = cell.key === start;
          const base = 'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm';
          const tone = !cell.inMonth
            ? 'text-slate-700'
            : has
              ? 'bg-emerald-500/10 font-semibold text-emerald-200'
              : 'text-slate-400';
          const ring = isToday ? ' ring-1 ring-inset ring-emerald-500/50' : '';
          return has ? (
            <button
              key={cell.key}
              onClick={() => setSelected(cell.key)}
              aria-label={`${labelFromKey(cell.key)} — ${count} séance${count > 1 ? 's' : ''}`}
              className={`${base} ${tone}${ring} transition-colors hover:bg-emerald-500/20`}
            >
              <span>{cell.day}</span>
              <span className="mt-0.5 flex gap-0.5">
                {Array.from({length: Math.min(count, 3)}).map((_, i) => (
                  <span key={i} className="h-1 w-1 rounded-full bg-emerald-400" />
                ))}
              </span>
            </button>
          ) : (
            <div key={cell.key} className={`${base} ${tone}${ring}`}>
              {cell.day}
            </div>
          );
        })}
      </div>

      <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> jour d'entraînement — touche pour le détail
      </p>

      {/* Popup d'un jour */}
      {selected && selectedLogs.length > 0 && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={() => setSelected(null)}>
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-slate-700 bg-slate-900 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <h2 className="flex min-w-0 items-center gap-2 font-semibold">
                <CalendarDays className="h-5 w-5 shrink-0 text-emerald-400" />
                <span className="truncate">{labelFromKey(selected)}</span>
              </h2>
              <button onClick={() => setSelected(null)} aria-label="Fermer" className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {selectedLogs.map((log) => (
                <SessionCard key={log.id} log={log} myPrograms={myPrograms} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
