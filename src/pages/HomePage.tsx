import {ClipboardList, Flame, Leaf, LineChart, Play, Search} from 'lucide-react';
import {useState, type FormEvent} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useActiveWorkout, useWorkoutHistory} from '../lib/workoutLogs';
import {useMyPrograms} from '../lib/myPrograms';
import {summary} from '../lib/stats';
import {useAuth} from '../lib/auth';
import Logo from '../components/Logo';

// Accès unique à l'accueil (le cardio, lui, est un exercice -> onglet Exercices).
const browseCards = [
  {to: '/affiner', icon: Flame, title: "M'affiner", desc: 'Perdre du gras et galber tes zones.'},
  {to: '/recuperation', icon: Leaf, title: 'Récupération & étirements', desc: 'Étirements et automassages, pour après la séance.'},
];

export default function HomePage() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const {user} = useAuth();
  const active = useActiveWorkout();
  const myPrograms = useMyPrograms();
  const history = useWorkoutHistory();
  const stats = summary(history);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(`/exercices${term ? `?search=${encodeURIComponent(term)}` : ''}`);
  };

  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <Logo className="h-40 w-40" women={user?.gender === 'female'} />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Ta salle, dans ta poche</h1>
        <p className="mt-1 text-slate-400">Tes entraînements, tes programmes, et une bibliothèque complète.</p>
      </div>

      <form onSubmit={submit} className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un exercice…"
          className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-4 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-500/60"
        />
      </form>

      {/* Séance en cours */}
      {active && (
        <Link
          to="/seance"
          className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 transition-colors hover:bg-emerald-500/20"
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

      {/* Aperçu suivi */}
      {stats.sessions > 0 && (
        <Link
          to="/suivi"
          className="mt-3 flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <LineChart className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold">
              {stats.sessions} séance{stats.sessions > 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-slate-400">
              {stats.thisWeek > 0 ? `${stats.thisWeek} cette semaine — ` : ''}voir ta progression
            </p>
          </div>
        </Link>
      )}

      {/* Mes programmes */}
      {myPrograms.length > 0 && (
        <Link
          to="/programmes"
          className="mt-3 flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold">Mes programmes</h2>
            <p className="text-sm text-slate-400">
              {myPrograms.length} programme{myPrograms.length > 1 ? 's' : ''} — reprends ou modifie
            </p>
          </div>
        </Link>
      )}

      {/* Cardio + Récup */}
      <div className="mt-5 grid gap-3">
        {browseCards.map(({to, icon: Icon, title, desc}) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="text-sm text-slate-400">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
