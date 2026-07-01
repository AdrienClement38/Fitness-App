import {useEffect, useState} from 'react';
import {adminApi, type AdminStats} from '../lib/api';
import {Badge, Loading} from './ui';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'});

function Stat({label, value, hint}: {label: string; value: number; hint?: string}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

/** Tableau de bord admin : agrégats d'usage (comptes + contenu synchronisé). */
export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState(false);

  // Mise à jour automatique (comme la liste des comptes) : au montage, toutes les 15 s (onglet
  // visible) et au retour d'onglet. Un échec ponctuel du polling ne masque pas le tableau déjà
  // chargé (on garde les dernières stats).
  useEffect(() => {
    let loaded = false;
    const load = (silent: boolean) => {
      adminApi
        .stats()
        .then((s) => {
          setStats(s);
          loaded = true;
        })
        .catch(() => {
          if (!silent && !loaded) setError(true);
        });
    };
    load(false);
    const tick = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    const id = window.setInterval(tick, 15000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  if (error) return null; // non bloquant : si les stats échouent, on n'affiche rien
  if (!stats) return <div className="mt-4"><Loading /></div>;

  return (
    <section className="mt-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Comptes" value={stats.users.total} hint={`${stats.users.verified} vérifié${stats.users.verified > 1 ? 's' : ''}`} />
        <Stat label="Non vérifiés" value={stats.users.unverified} />
        <Stat label="Admins" value={stats.users.admins} />
        <Stat label="Nouveaux (7 j)" value={stats.users.last7} hint={`${stats.users.last30} sur 30 j`} />
        <Stat label="Séances" value={stats.content.workoutLogs} />
        <Stat label="Programmes" value={stats.content.myPrograms} />
        <Stat label="Favoris" value={stats.content.favorites} />
      </div>

      {stats.recentSignups.length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <p className="mb-2 text-xs font-medium text-slate-400">Derniers inscrits</p>
          <ul className="grid gap-1.5 text-sm">
            {stats.recentSignups.map((s) => (
              <li key={s.email} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{s.email}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
                  {s.role === 'admin' && <Badge tone="emerald">admin</Badge>}
                  {!s.emailVerified && <Badge tone="amber">non vérifié</Badge>}
                  {fmtDate(s.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
