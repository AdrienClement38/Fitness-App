import {useState, type FormEvent} from 'react';
import {Link, useLocation, useNavigate} from 'react-router-dom';
import {Download, LogOut, Shield, User} from 'lucide-react';
import {changePassword, deleteAccount, login, logout, register, setGender, useAuth} from '../lib/auth';
import {authApi, type Gender} from '../lib/api';
import {useSyncConnected} from '../lib/sync';
import {exportMyData} from '../lib/exportData';
import {setExplanations, setStretchSuggestions, useExplanations, useStretchSuggestions} from '../lib/settings';
import {Loading, ToggleSwitch} from '../components/ui';

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
    <ToggleSwitch
      checked={on}
      onChange={setStretchSuggestions}
      srLabel="Suggérer des étirements à la fin de mes séances"
      label="Suggérer des étirements à la fin de mes séances"
    />
  );
}

/** Mode explication : affiche (ou non) les « ? » qui expliquent les termes techniques. */
function ExplanationsPref() {
  const on = useExplanations();
  return (
    <ToggleSwitch
      checked={on}
      onChange={setExplanations}
      srLabel="Mode explication"
      label={
        <>
          Mode explication
          <span className="mt-0.5 block text-xs text-slate-500">Affiche les « ? » qui expliquent les termes techniques.</span>
        </>
      }
    />
  );
}

/** « Mot de passe oublié » : demande un lien de réinitialisation par email. */
function ForgotPasswordForm({onBack}: {onBack: () => void}) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await authApi.forgotPassword(email.trim());
    } catch {
      /* anti-énumération : même issue affichée quoi qu'il arrive */
    } finally {
      setBusy(false);
      setSent(true);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold">Mot de passe oublié</h1>
      {sent ? (
        <>
          <p className="mt-2 text-sm text-slate-400">
            Si un compte existe avec cette adresse, un email avec un lien de réinitialisation vient d'être envoyé.
            Pense à vérifier tes spams. Le lien expire dans 1 h.
          </p>
          <button onClick={onBack} className="mt-4 text-sm text-emerald-400 hover:underline">
            Retour à la connexion
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-400">
            Entre ton adresse : on t'envoie un lien pour choisir un nouveau mot de passe.
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
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-emerald-500/20 py-2.5 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {busy ? '…' : 'Envoyer le lien'}
            </button>
          </form>
          <button onClick={onBack} className="mt-3 text-sm text-emerald-400 hover:underline">
            Retour à la connexion
          </button>
        </>
      )}
    </div>
  );
}

/** Sélecteur de sexe dans « Mon compte » : sauvegarde immédiate (logo + suggestions réagissent). */
function GenderPref() {
  const {user} = useAuth();
  const [busy, setBusy] = useState(false);
  const current = user?.gender ?? null;
  const change = async (g: Gender | null) => {
    setBusy(true);
    try {
      await setGender(g);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <p className="text-sm font-medium">Profil</p>
      <p className="mt-0.5 text-xs text-slate-500">Sert à te suggérer des programmes (tout reste accessible) et au logo. Optionnel.</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {([
          {v: 'male', label: 'Homme'},
          {v: 'female', label: 'Femme'},
          {v: null, label: 'Ne pas dire'},
        ] as {v: Gender | null; label: string}[]).map((o) => (
          <button
            key={o.label}
            disabled={busy}
            onClick={() => change(o.v)}
            className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${
              current === o.v ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AccountPage() {
  const {user, loading} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<Gender | null>(null); // optionnel : null = préfère ne pas dire
  const [website, setWebsite] = useState(''); // honeypot anti-bot (reste vide pour un humain)
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

        <GenderPref />
        <ExplanationsPref />
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
      if (mode === 'register') await register(email.trim(), password, gender, website);
      else await login(email.trim(), password);
      // Connecté -> retour à la page demandée avant la redirection, sinon l'accueil.
      navigate((location.state as {from?: string} | null)?.from ?? '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'forgot') return <ForgotPasswordForm onBack={() => setMode('login')} />;

  return (
    <div>
      <h1 className="text-xl font-bold">{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h1>
      <p className="mt-1 text-sm text-slate-400">
        {mode === 'login'
          ? "L'application nécessite un compte. Connecte-toi pour accéder aux exercices, programmes et à ton suivi — synchronisés sur tous tes appareils."
          : 'Crée ton compte (gratuit) pour accéder à l’application : tes séances, programmes et favoris te suivent partout.'}
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-3">
        {/* Honeypot anti-bot : hors écran, ignoré des humains, rempli par les bots -> inscription rejetée. */}
        <div aria-hidden="true" style={{position: 'absolute', left: '-5000px'}}>
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
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
        {mode === 'register' && (
          <div>
            <p className="mb-1 text-xs font-medium text-slate-400">Tu es… <span className="text-slate-500">(optionnel — pour te proposer des programmes adaptés)</span></p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                {v: 'male', label: 'Homme'},
                {v: 'female', label: 'Femme'},
                {v: null, label: 'Ne pas dire'},
              ] as {v: Gender | null; label: string}[]).map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setGender(o.v)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    gender === o.v
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {mode === 'register' && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-300/90">
            📩 Après inscription, on t'envoie un email de confirmation. Il arrive souvent dans les{' '}
            <strong>spams / indésirables</strong> — pense à l'y chercher et à le marquer « non spam », puis active ton compte.
          </p>
        )}
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

      {mode === 'login' && (
        <button
          onClick={() => {
            setMode('forgot');
            setError('');
          }}
          className="mt-2 block text-sm text-slate-400 hover:text-slate-200 hover:underline"
        >
          Mot de passe oublié ?
        </button>
      )}

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
