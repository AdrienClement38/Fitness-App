import {useCallback, useEffect, useState} from 'react';
import {Navigate} from 'react-router-dom';
import {adminApi, type AdminUser} from '../lib/api';
import {useAuth} from '../lib/auth';
import {Badge, ErrorState, Loading} from '../components/ui';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short', year: 'numeric'});

export default function AdminPage() {
  const {user, loading: authLoading} = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // id du compte en cours d'action
  const [temp, setTemp] = useState<{email: string; password: string} | null>(null);

  const load = useCallback(() => {
    adminApi.users().then(setUsers).catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
  }, []);
  useEffect(() => {
    if (user?.role === 'admin') load();
  }, [user, load]);

  // Garde client (le serveur garde aussi sur /api/admin). Attendre la résolution de session.
  if (authLoading) return <Loading />;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    setError(null);
    try {
      await fn();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(null);
    }
  };

  const onDelete = (u: AdminUser) => {
    if (confirm(`Supprimer le compte ${u.email} et TOUTES ses données ? Action définitive.`)) {
      act(u.id, () => adminApi.deleteUser(u.id));
    }
  };
  const onRole = (u: AdminUser) => {
    const next = u.role === 'admin' ? 'user' : 'admin';
    if (confirm(`Passer ${u.email} en « ${next} » ?`)) act(u.id, () => adminApi.setRole(u.id, next));
  };
  const onReset = (u: AdminUser) => {
    if (confirm(`Réinitialiser le mot de passe de ${u.email} ? La personne sera déconnectée.`)) {
      act(u.id, async () => {
        const {tempPassword} = await adminApi.resetPassword(u.id);
        setTemp({email: u.email, password: tempPassword});
      });
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold">Administration</h1>
      <p className="mt-1 text-sm text-slate-400">
        Gestion des comptes inscrits. Tu vois les infos de compte, jamais les données privées des utilisateurs.
      </p>

      {error && <div className="mt-4"><ErrorState message={error} /></div>}

      {temp && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-300">Mot de passe temporaire — {temp.email}</p>
          <p className="mt-1 select-all font-mono text-base tracking-wide text-amber-100">{temp.password}</p>
          <p className="mt-1 text-xs text-amber-300/80">
            Transmets-le à la personne ; elle pourra le changer depuis « Mon compte ». Il ne sera plus réaffiché.
          </p>
          <button onClick={() => setTemp(null)} className="mt-2 text-xs text-amber-300 underline">Masquer</button>
        </div>
      )}

      {users === null ? (
        !error && <Loading />
      ) : (
        <div className="mt-4 grid gap-3">
          <p className="text-xs text-slate-500">{users.length} compte{users.length > 1 ? 's' : ''}</p>
          {users.map((u) => (
            <div key={u.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  <span className="min-w-0 break-all">{u.email}</span>
                  {u.role === 'admin' && <Badge tone="emerald">Admin</Badge>}
                  {u.id === user.id && <Badge>toi</Badge>}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Inscrit le {fmtDate(u.createdAt)}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge>{u.workoutLogs} séance{u.workoutLogs > 1 ? 's' : ''}</Badge>
                <Badge>{u.myPrograms} programme{u.myPrograms > 1 ? 's' : ''}</Badge>
              </div>
              {u.id !== user.id && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    disabled={busy === u.id}
                    onClick={() => onRole(u)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                  >
                    {u.role === 'admin' ? 'Retirer admin' : 'Passer admin'}
                  </button>
                  <button
                    disabled={busy === u.id}
                    onClick={() => onReset(u)}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                  >
                    Réinit. mot de passe
                  </button>
                  <button
                    disabled={busy === u.id}
                    onClick={() => onDelete(u)}
                    className="rounded-lg border border-red-900/50 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/40 disabled:opacity-40"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
