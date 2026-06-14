import {useState, type FormEvent} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {Download, LogOut, Shield, User} from 'lucide-react';
import {changePassword, deleteAccount, login, logout, register, useAuth} from '../lib/auth';
import {useSyncConnected} from '../lib/sync';
import {exportMyData} from '../lib/exportData';
import {setStretchSuggestions, useStretchSuggestions} from '../lib/settings';
import {Loading} from '../components/ui';

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-500';

function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{type: 'ok' | 'err'; text: string} | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setOpen(false);
    setMsg(null);
    setCurrent('');
    setNext('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      await changePassword(current, next);
      setMsg({type: 'ok', text: 'Mot de passe changé. Tes autres appareils ont été déconnectés.'});
      setCurrent('');
      setNext('');
    } catch (err) {
      setMsg({type: 'err', text: err instanceof Error ? err.message : 'Une erreur est survenue.'});
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 text-sm text-emerald-400 hover:underline">
        Changer de mot de passe
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <p className="text-sm font-semibold">Changer de mot de passe</p>
      <input
        type="password"
        required
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder="Mot de passe actuel"
        autoComplete="current-password"
        className={inputClass}
      />
      <input
        type="password"
        required
        minLength={8}
        value={next}
        onChange={(e) => setNext(e.target.value)}
        placeholder="Nouveau mot de passe (8 caractères min.)"
        autoComplete="new-password"
        className={inputClass}
      />
      {msg && <p className={`text-sm ${msg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-lg bg-emerald-500/20 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
        >
          {busy ? '…' : 'Valider'}
        </button>
        <button type="button" onClick={reset} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
          Annuler
        </button>
      </div>
    </form>
  );
}

function DeleteAccountForm() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await deleteAccount(password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 block text-sm text-red-400 hover:underline">
        Supprimer mon compte
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 rounded-xl border border-red-900/50 bg-red-950/20 p-4">
      <p className="text-sm font-semibold text-red-300">Supprimer définitivement mon compte</p>
      <p className="text-xs text-slate-400">
        Efface ton compte et tes données côté serveur. Action irréversible. Confirme avec ton mot de passe.
      </p>
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        autoComplete="current-password"
        className={inputClass}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-lg bg-red-500/20 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-50"
        >
          {busy ? '…' : 'Supprimer définitivement'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError('');
            setPassword('');
          }}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function LegalLinks() {
  return (
    <p className="mt-6 border-t border-slate-800 pt-4 text-xs text-slate-500">
      <Link to="/confidentialite" className="hover:text-slate-300">
        Confidentialité
      </Link>
      {' · '}
      <Link to="/mentions-legales" className="hover:text-slate-300">
        Mentions légales
      </Link>
      {' · '}
      <Link to="/cgu" className="hover:text-slate-300">
        CGU
      </Link>
    </p>
  );
}

function SyncStatus() {
  const connected = useSyncConnected();
  return (
    <p className={`mt-1 flex items-center gap-1.5 text-xs ${connected ? 'text-emerald-400' : 'text-slate-500'}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
      {connected ? 'Synchronisé sur tes appareils' : 'Synchronisation…'}
    </p>
  );
}

function StretchPref() {
  const on = useStretchSuggestions();
  return (
    <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <span className="text-sm text-slate-300">Suggérer des étirements à la fin de mes séances</span>
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => setStretchSuggestions(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-emerald-500"
      />
    </label>
  );
}

export default function AccountPage() {
  const {user, loading} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
              <SyncStatus />
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </div>

        {user.role === 'admin' && (
          <Link
            to="/admin"
            className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
          >
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" /> Administration
            </span>
            <span className="text-xs font-normal text-emerald-300/70">Gérer les comptes</span>
          </Link>
        )}

        <StretchPref />

        <button
          onClick={() => exportMyData(user.email)}
          className="mt-3 flex items-center gap-1.5 text-sm text-emerald-400 hover:underline"
        >
          <Download className="h-4 w-4" /> Exporter mes données (JSON)
        </button>

        <ChangePasswordForm />
        <DeleteAccountForm />

        <p className="mt-3 text-xs text-slate-500">
          Tes séances, programmes et favoris sont synchronisés sur tous tes appareils.
        </p>
        <LegalLinks />
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
      // Connecté -> retour à la page demandée avant la redirection, sinon l'accueil.
      navigate((location.state as {from?: string} | null)?.from ?? '/');
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
          ? "L'application nécessite un compte. Connecte-toi pour accéder aux exercices, programmes et à ton suivi — synchronisés sur tous tes appareils."
          : 'Crée ton compte (gratuit) pour accéder à l’application : tes séances, programmes et favoris te suivent partout.'}
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

      {mode === 'register' && (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          En créant un compte, tu acceptes les{' '}
          <Link to="/cgu" className="text-emerald-400 hover:underline">
            conditions d'utilisation
          </Link>{' '}
          et la{' '}
          <Link to="/confidentialite" className="text-emerald-400 hover:underline">
            politique de confidentialité
          </Link>
          , et tu reconnais que l'app ne remplace pas un avis médical (
          <Link to="/mentions-legales" className="text-emerald-400 hover:underline">
            avertissement santé
          </Link>
          ).
        </p>
      )}
      <LegalLinks />
    </div>
  );
}
