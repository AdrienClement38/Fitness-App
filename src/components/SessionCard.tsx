import {Trash2} from 'lucide-react';
import {Link} from 'react-router-dom';
import {deleteLog, logVolume, setsDone, type WorkoutLog} from '../lib/workoutLogs';
import {durationMinutes} from '../lib/stats';
import {type MyProgram} from '../lib/myPrograms';
import {Badge} from './ui';

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {weekday: 'short', day: 'numeric', month: 'short'});

/**
 * Cible du clic sur une séance : on relance la SÉANCE (son programme) si rattachable.
 *  - programId stocké : perso -> /mes-programmes/:id si le programme existe encore
 *    (sinon null = « n'existe plus ») ; curated -> /programmes/:id.
 *  - vieux logs sans id : retrouve un programme PERSO par nom (+ séance par nom).
 * null => non rattachable -> l'appelant retombe sur la fiche de l'exercice (séance mono).
 */
export function sessionHref(log: WorkoutLog, myPrograms: MyProgram[]): string | null {
  if (log.programId) {
    if (log.programMine) return myPrograms.some((p) => p.id === log.programId) ? `/mes-programmes/${log.programId}` : null;
    return `/programmes/${log.programId}`;
  }
  if (log.programName) {
    const p = myPrograms.find((mp) => mp.nameFr === log.programName && mp.sessions.some((s) => s.nameFr === log.sessionName));
    return p ? `/mes-programmes/${p.id}` : null;
  }
  return null;
}

/** Carte d'une séance enregistrée (titre, date, badges, suppression). Cliquable si rattachable. */
export default function SessionCard({log, myPrograms}: {log: WorkoutLog; myPrograms: MyProgram[]}) {
  const vol = logVolume(log);
  const dur = durationMinutes(log);
  const single = log.exercises.length === 1 ? log.exercises[0] : null;
  const href = sessionHref(log, myPrograms) ?? (single ? `/exercices/${single.exerciseId}` : null);

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{log.sessionName}</h3>
          <p className="text-xs text-slate-500">
            {fmtDay(log.finishedIso ?? log.startedIso ?? '')}
            {log.programName ? ` · ${log.programName}` : ''}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault(); // ne pas suivre le lien éventuel de la carte
            e.stopPropagation();
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
    </>
  );

  return href ? (
    <Link to={href} className="block rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900">
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">{body}</div>
  );
}
