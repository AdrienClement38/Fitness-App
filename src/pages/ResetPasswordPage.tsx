import {useState, type FormEvent} from 'react';
import {Link, useNavigate, useSearchParams} from 'react-router-dom';
import {authApi} from '../lib/api';

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-500';

/** Page ouverte depuis l'email de réinitialisation : choisir un nouveau mot de passe. */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="mx-auto mt-10 max-w-md text-center">
        <h1 className="text-xl font-bold">Lien invalide</h1>
        <p className="mt-2 text-sm text-slate-400">Le jeton est manquant. Refais une demande depuis la page de connexion.</p>
        <Link to="/compte" className="mt-5 inline-block rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400">
          Aller à la connexion
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto mt-10 max-w-md text-center">
        <h1 className="text-xl font-bold">Mot de passe réinitialisé</h1>
        <p className="mt-2 text-sm text-slate-400">Tu peux maintenant te connecter avec ton nouveau mot de passe.</p>
        <Link to="/compte" className="mt-5 inline-block rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400">
          Se connecter
        </Link>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/compte'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-6 max-w-md">
      <h1 className="text-xl font-bold">Nouveau mot de passe</h1>
      <p className="mt-1 text-sm text-slate-400">Choisis un nouveau mot de passe pour ton compte AC-KINETIK.</p>

      <form onSubmit={submit} className="mt-4 grid gap-3">
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nouveau mot de passe (8 caractères min.)"
          autoComplete="new-password"
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirme le mot de passe"
          autoComplete="new-password"
          className={inputClass}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-500/20 py-2.5 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
        >
          {busy ? '…' : 'Réinitialiser mon mot de passe'}
        </button>
      </form>
    </div>
  );
}
