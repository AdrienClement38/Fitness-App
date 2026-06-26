import {CalendarDays, ChevronRight, ClipboardList, Flame, Leaf, Play, Search} from 'lucide-react';
import {useMemo, useState, type FormEvent} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useActiveWorkout, useWorkoutHistory} from '../lib/workoutLogs';
import {useMyPrograms} from '../lib/myPrograms';
import {summary} from '../lib/stats';
import {useProfile} from '../lib/userProfile';
import {DAY_LABELS, nextPlanned, useWeeklyPlan} from '../lib/weeklyPlan';
import {defaultWeightKg, kcalSince, startOfMonthIso, startOfWeekIso, totalMinutes} from '../lib/calories';
import {humanMinutes} from '../lib/time';
import {useAuth} from '../lib/auth';
import {StatCard} from '../components/ui';
import Logo from '../components/Logo';

// Accès unique à l'accueil (le cardio, lui, est un exercice -> onglet Exercices).
const browseCards = [
  {to: '/affiner', icon: Flame, title: 'Me sculpter', desc: 'Galbe le muscle de tes zones — révèle-les en perdant du gras.'},
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
  // Temps total passé en séance (chrono si dispo, sinon estimé depuis les séries).
  const totalMin = useMemo(() => totalMinutes(history), [history]);
  // Calories estimées (METs) : poids saisi sinon gabarit moyen par sexe. Semaine + mois.
  const profile = useProfile();
  const weightKg = profile.weightKg ?? defaultWeightKg(user?.gender);
  const kcalWeek = useMemo(() => kcalSince(history, startOfWeekIso(), weightKg), [history, weightKg]);
  const kcalMonth = useMemo(() => kcalSince(history, startOfMonthIso(), weightKg), [history, weightKg]);
  // Planning hebdo : prochaine séance planifiée (carte d'accès -> /planning).
  const plan = useWeeklyPlan();
  const nextSess = useMemo(() => nextPlanned(plan), [plan]);
  const whenNext = nextSess ? (nextSess.inDays === 0 ? " · aujourd'hui" : nextSess.inDays === 1 ? ' · demain' : '') : '';

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

      {/* Planning hebdo : prochaine séance, ou invitation à planifier sa semaine. */}
      {nextSess ? (
        <Link
          to="/planning"
          className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-emerald-700/50"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" /> Prochaine séance
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-slate-200">{nextSess.slot.sessionName}</span>
            <span className="block truncate text-xs text-slate-500">
              {DAY_LABELS[nextSess.day]}
              {whenNext} · {nextSess.slot.programName}
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
        </Link>
      ) : (
        <Link
          to="/planning"
          className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-4 text-slate-400 transition-colors hover:border-emerald-700/50 hover:text-slate-200"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4" /> Planifie ta semaine
          </span>
          <ChevronRight className="h-5 w-5 shrink-0" />
        </Link>
      )}

      {/* Aperçu suivi : 3 stats clés (tap -> /suivi). Le bouton « Suivi » est déjà dans la nav,
          donc ici on montre de la valeur (stats) plutôt qu'un second lien redondant. */}
      {stats.sessions > 0 && (
        <Link to="/suivi" className="mt-4 grid grid-cols-3 gap-2" aria-label="Voir mon suivi">
          <StatCard label="Séances" value={stats.sessions} />
          <StatCard label="Cette semaine" value={stats.thisWeek} />
          <StatCard label="Temps total" value={humanMinutes(totalMin)} />
        </Link>
      )}

      {/* Calories brûlées (estimation METs) : semaine + mois. */}
      {stats.sessions > 0 && (
        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
              <Flame className="h-5 w-5" />
            </span>
            <h2 className="font-semibold">
              Calories brûlées <span className="text-xs font-normal text-slate-500">· estimation</span>
            </h2>
          </div>
          <div className="mt-3 flex gap-3">
            <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center">
              <div className="text-lg font-bold tabular-nums text-orange-300">≈ {kcalWeek.toLocaleString('fr-FR')}</div>
              <div className="mt-0.5 text-xs text-slate-500">kcal cette semaine</div>
            </div>
            <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-center">
              <div className="text-lg font-bold tabular-nums text-orange-300">≈ {kcalMonth.toLocaleString('fr-FR')}</div>
              <div className="mt-0.5 text-xs text-slate-500">kcal ce mois</div>
            </div>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
            {profile.weightKg ? (
              `Estimation selon ton poids (${profile.weightKg} kg), `
            ) : (
              <>
                Estimation selon un gabarit moyen{user?.gender === 'female' ? ' femme' : user?.gender === 'male' ? ' homme' : ''} (~{weightKg} kg) —{' '}
                <Link to="/compte" className="font-medium text-emerald-400 hover:underline">
                  renseigne ton poids
                </Link>{' '}
                pour affiner. Indicative,{' '}
              </>
            )}
            ±25 %, hors intensité réelle.
          </p>
        </div>
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
