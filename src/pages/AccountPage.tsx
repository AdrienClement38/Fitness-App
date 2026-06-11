import {useState, type FormEvent} from 'react';
import {LogOut, User} from 'lucide-react';
import {login, logout, register, useAuth} from '../lib/auth';
import {Loading} from '../components/ui';

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-500';

export default function AccountPage() {
  const {user, loading} = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;

  if (user) {
    return (
      <div>
        <h1 className="text-xl font-bold">Mon compte</h1>
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-slate-400">Connecté en tant que</p>
              <p className="truncate font-semibold">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Bientôt : tes séances, programmes et favoris synchronisés sur tous tes appareils.
        </p>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'register') await register(email.trim(), password);
      else await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold">{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {mode === 'login'
          ? 'Connecte-toi pour synchroniser tes données sur tous tes appareils.'
          : 'Un compte pour retrouver tes séances, programmes et favoris partout.'}
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe (8 caractères min.)"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          className={inputClass}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-emerald-500/20 py-2.5 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
        >
          {busy ? '…' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError('');
        }}
        className="mt-3 text-sm text-emerald-400 hover:underline"
      >
        {mode === 'login' ? 'Pas de compte ? En créer un' : 'Déjà un compte ? Se connecter'}
      </button>
    </div>
  );
}
