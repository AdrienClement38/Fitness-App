import {useMemo, useState} from 'react';
import {Play, Trash2} from 'lucide-react';
import {Link} from 'react-router-dom';
import {deleteLog, logVolume, setsDone, useActiveWorkout, useWorkoutHistory} from '../lib/workoutLogs';
import {combineRecords, durationMinutes, exerciseStats, progression, summary, weeklyVolume} from '../lib/stats';
import {useRecords} from '../lib/records';
import type {MeasureKind} from '../lib/api';
import {BarChart, LineChart} from '../components/Charts';
import {Badge, Empty, SectionTitle} from '../components/ui';

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {weekday: 'short', day: 'numeric', month: 'short'});
const fmtShort = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'});

const progUnit = (k: MeasureKind): string => (k === 'duration' ? 's' : k === 'cardio' ? 'min' : '');
const progCaption = (k: MeasureKind): string =>
  k === 'load'
    ? '1RM estimé (kg) — charge max théorique (Epley)'
    : k === 'bodyweight'
      ? 'Meilleur nombre de reps par séance'
      : k === 'duration'
        ? 'Meilleure durée par séance (secondes)'
        : 'Meilleure durée par séance (minutes)';
const recordLabel = (s: {kind: MeasureKind; heaviest: {weight: number; reps: number} | null; bestValue: number | null}): string => {
  if (s.kind === 'load') return s.heaviest ? `${s.heaviest.weight} kg × ${s.heaviest.reps}` : '–';
  if (s.bestValue == null) return '–';
  return `${s.bestValue}${s.kind === 'duration' ? ' s' : s.kind === 'cardio' ? ' min' : ' reps'}`;
};

function StatCard({label, value}: {label: string; value: string | number}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-center">
      <div className="text-lg font-bold tabular-nums text-emerald-300">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  );
}

export default function SuiviPage() {
  const active = useActiveWorkout();
  const history = useWorkoutHistory();

  const stats = useMemo(() => exerciseStats(history), [history]);
  const sum = useMemo(() => summary(history), [history]);
  const weeks = useMemo(() => weeklyVolume(history), [history]);
  // Records all-time : meilleur entre l'historique courant et le store persistant (qui retient les séances purgées).
  const storeRecords = useRecords();
  const records = useMemo(() => combineRecords(stats, storeRecords), [stats, storeRecords]);

  const chartable = stats.filter((s) => s.sessions >= 2);
  const [exId, setExId] = useState('');
  const selected = exId || chartable[0]?.exerciseId || '';
  const prog = useMemo(() => (selected ? progression(history, selected) : {points: [], kind: 'load' as const}), [history, selected]);
  // Le graphique couvre les 3 derniers mois (= la rétention). Beaucoup de points -> scroll horizontal (cf. LineChart).
  const since3moIso = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString();
  }, []);
  const windowPoints = useMemo(() => prog.points.filter((p) => p.dateIso >= since3moIso), [prog.points, since3moIso]);

  return (
    <div>
      <h1 className="text-xl font-bold">Suivi</h1>
      <p className="mt-1 text-sm text-slate-400">
        Démarre une séance depuis un programme, note tes poids série par série, suis ta progression ici.
      </p>

      {active && (
        <Link
          to="/seance"
          className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 transition-colors hover:bg-emerald-500/20"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-emerald-300">Séance en cours</span>
            <span className="block truncate text-xs text-slate-400">
              {active.sessionName}
              {active.programName ? ` · ${active.programName}` : ''}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-300">
            <Play className="h-4 w-4" /> Reprendre
          </span>
        </Link>
      )}

      {history.length === 0 ? (
        <Empty label="Aucune séance enregistrée. Ouvre un programme et clique « Démarrer la séance »." />
      ) : (
        <>
          {/* Résumé */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatCard label="Séances" value={sum.sessions} />
            <StatCard label="Cette semaine" value={sum.thisWeek} />
            <StatCard label="Volume total" value={`${(sum.totalVolume / 1000).toFixed(1)} t`} />
          </div>

          {/* Progression */}
          {chartable.length > 0 && (
            <section>
              <SectionTitle>Progression</SectionTitle>
              <select
                value={selected}
                onChange={(e) => setExId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                {chartable.map((s) => (
                  <option key={s.exerciseId} value={s.exerciseId}>
                    {s.name} ({s.sessions} séances)
                  </option>
                ))}
              </select>
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                {windowPoints.length >= 2 ? (
                  <>
                    <LineChart data={windowPoints.map((p) => ({label: fmtShort(p.dateIso), value: p.value}))} unit={progUnit(prog.kind)} />
                    <p className="mt-1 text-center text-xs text-slate-500">
                      {progCaption(prog.kind)} · 3 derniers mois{windowPoints.length > 7 ? ' · glisse pour remonter' : ''}
                    </p>
                  </>
                ) : (
                  <p className="py-6 text-center text-sm text-slate-500">Pas assez de séances sur les 3 derniers mois pour tracer la courbe.</p>
                )}
              </div>
            </section>
          )}

          {/* Records (all-time : la meilleure perf est écrasée quand elle est battue). 5 visibles, scroll pour le reste. */}
          <section>
            <SectionTitle>Records</SectionTitle>
            <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
              {records.map((s) => (
                <div key={s.exerciseId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                  <Link to={`/exercices/${s.exerciseId}`} className="min-w-0 flex-1 truncate text-sm hover:text-emerald-300">
                    {s.name}
                  </Link>
                  <span className="shrink-0 text-sm font-semibold text-emerald-300">{recordLabel(s)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Volume hebdo */}
          {weeks.length > 1 && (
            <section>
              <SectionTitle>Volume par semaine</SectionTitle>
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                <BarChart data={weeks.slice(-8).map((w) => ({label: fmtShort(w.weekStartIso), value: w.volume}))} unit=" kg" />
              </div>
            </section>
          )}

          {/* Historique : 5 visibles, scroll pour le reste. */}
          <SectionTitle>Historique</SectionTitle>
          <div className="grid max-h-[36rem] gap-3 overflow-y-auto pr-1">
            {history.map((log) => {
              const vol = logVolume(log);
              const dur = durationMinutes(log);
              return (
                <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold">{log.sessionName}</h3>
                      <p className="text-xs text-slate-500">
                        {fmtDay(log.finishedIso ?? log.startedIso ?? '')}
                        {log.programName ? ` · ${log.programName}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Supprimer cette séance de l’historique ?')) deleteLog(log.id);
                      }}
                      aria-label="Supprimer la séance"
                      className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-red-950/40 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge>{log.exercises.length} exercices</Badge>
                    <Badge tone="emerald">{setsDone(log)} séries faites</Badge>
                    {vol > 0 && <Badge tone="indigo">{vol.toLocaleString('fr-FR')} kg de volume</Badge>}
                    {dur != null && <Badge>{dur} min</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
