import {Play, Trash2} from 'lucide-react';
import {Link} from 'react-router-dom';
import {deleteLog, logVolume, setsDone, useActiveWorkout, useWorkoutHistory} from '../lib/workoutLogs';
import {Badge, Empty, SectionTitle} from '../components/ui';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {weekday: 'short', day: 'numeric', month: 'short'});

export default function SuiviPage() {
  const active = useActiveWorkout();
  const history = useWorkoutHistory();

  return (
    <div>
      <h1 className="text-xl font-bold">Suivi</h1>
      <p className="mt-1 text-sm text-slate-400">
        Démarre une séance depuis un programme, log tes poids série par série, retrouve ton historique ici.
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

      <SectionTitle>Historique</SectionTitle>
      {history.length === 0 ? (
        <Empty label="Aucune séance enregistrée. Ouvre un programme et clique « Démarrer la séance »." />
      ) : (
        <div className="grid gap-3">
          {history.map((log) => {
            const vol = logVolume(log);
            return (
              <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{log.sessionName}</h3>
                    <p className="text-xs text-slate-500">
                      {fmtDate(log.finishedIso ?? log.startedIso)}
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
                  <Badge>{log.exercises.length} exos</Badge>
                  <Badge tone="emerald">{setsDone(log)} séries faites</Badge>
                  {vol > 0 && <Badge tone="indigo">{vol.toLocaleString('fr-FR')} kg de volume</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
