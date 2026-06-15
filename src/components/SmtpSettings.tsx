import {useCallback, useEffect, useState, type FormEvent} from 'react';
import {ChevronDown, ChevronRight, Mail, Send} from 'lucide-react';
import {adminApi, type SmtpStatus} from '../lib/api';
import {Badge, Loading} from './ui';

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-500';
const labelClass = 'mb-1 block text-xs font-medium text-slate-400';

const SOURCE_LABEL: Record<SmtpStatus['source'], {text: string; tone: 'emerald' | 'amber' | 'slate'}> = {
  db: {text: 'Connecté', tone: 'emerald'},
  env: {text: 'Actif via variables d’environnement', tone: 'amber'},
  none: {text: 'Non connecté', tone: 'slate'},
};

/**
 * Connexion email (SMTP) éditable par l'admin — neutre vis-à-vis du fournisseur
 * (Gmail, Brevo, etc.) : login + mot de passe/clé, serveur/port repliés sous
 * « Configuration avancée ». Le secret est chiffré au repos côté serveur et jamais
 * réaffiché. Module de test avec destinataire optionnel (par défaut l'émetteur).
 */
export default function SmtpSettings() {
  const [status, setStatus] = useState<SmtpStatus | null>(null);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [host, setHost] = useState('smtp.gmail.com');
  const [port, setPort] = useState(465);
  const [from, setFrom] = useState('');
  const [testTo, setTestTo] = useState('');
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState<'save' | 'test' | 'delete' | null>(null);
  const [msg, setMsg] = useState<{type: 'ok' | 'err'; text: string} | null>(null);

  const applyStatus = useCallback((s: SmtpStatus) => {
    setStatus(s);
    setUser(s.user);
    setHost(s.host || 'smtp.gmail.com');
    setPort(s.port || 465);
    setFrom(s.from);
    setPass(''); // jamais réaffiché : vide = conserver l'existant
  }, []);

  useEffect(() => {
    adminApi.smtp().then(applyStatus).catch((e) => setMsg({type: 'err', text: e instanceof Error ? e.message : 'Erreur'}));
  }, [applyStatus]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('save');
    setMsg(null);
    try {
      const s = await adminApi.saveSmtp({host, port, user, from: from || undefined, pass: pass || undefined});
      applyStatus(s);
      setMsg({type: 'ok', text: 'Connexion enregistrée.'});
    } catch (err) {
      setMsg({type: 'err', text: err instanceof Error ? err.message : 'Erreur'});
    } finally {
      setBusy(null);
    }
  };

  const test = async () => {
    setBusy('test');
    setMsg(null);
    try {
      const {to} = await adminApi.testEmail({host, port, user, from: from || undefined, pass: pass || undefined, to: testTo || undefined});
      setMsg({type: 'ok', text: `Email de test envoyé à ${to}. Vérifie la boîte de réception (et les indésirables).`});
    } catch (err) {
      setMsg({type: 'err', text: err instanceof Error ? err.message : 'Échec du test'});
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!confirm('Supprimer la connexion email ? Les emails ne partiront plus (le lien de confirmation retombera dans les logs serveur).')) return;
    setBusy('delete');
    setMsg(null);
    try {
      const s = await adminApi.deleteSmtp();
      applyStatus(s);
      setPass('');
      setMsg({type: 'ok', text: 'Connexion supprimée.'});
    } catch (err) {
      setMsg({type: 'err', text: err instanceof Error ? err.message : 'Erreur'});
    } finally {
      setBusy(null);
    }
  };

  if (status === null && !msg) return <Loading />;

  const src = status ? SOURCE_LABEL[status.source] : SOURCE_LABEL.none;
  const connected = status?.source === 'db';

  return (
    <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Mail className="h-5 w-5 text-emerald-400" />
        <h2 className="font-semibold">Connexion email (SMTP)</h2>
        {status && <Badge tone={src.tone}>{src.text}</Badge>}
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Connecte un compte d’envoi (Gmail, Brevo, ou tout autre SMTP) pour les emails de confirmation et de
        réinitialisation. Sans connexion, l’inscription marche quand même (le lien part dans les logs serveur).
      </p>

      <form onSubmit={save} className="mt-4 grid gap-3">
        <div>
          <label className={labelClass}>Utilisateur SMTP (login)</label>
          <input
            className={inputClass}
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="moncompte@gmail.com ou identifiant Brevo (xxxx@smtp-brevo.com)"
            autoComplete="off"
            required
          />
        </div>
        <div>
          <label className={labelClass}>
            Mot de passe / clé SMTP {status?.hasPass && <span className="text-slate-500">(enregistré)</span>}
          </label>
          <input
            type="password"
            className={inputClass}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder={status?.hasPass ? '•••••••• (laisser vide pour conserver)' : 'le secret de ton fournisseur'}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-slate-500">
            Pas ton mot de passe de compte habituel. Gmail →{' '}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline"
            >
              un mot de passe d’application
            </a>{' '}
            (validation en 2 étapes requise). Brevo → une <strong>clé SMTP</strong> (page « SMTP & API »).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
        >
          {advanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          Configuration avancée (serveur SMTP)
        </button>

        {advanced && (
          <div className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Serveur SMTP</label>
              <input className={inputClass} value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com / smtp-relay.brevo.com" required />
            </div>
            <div>
              <label className={labelClass}>Port</label>
              <input
                type="number"
                className={inputClass}
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                placeholder="587"
                min={1}
                max={65535}
                required
              />
              <p className="mt-1 text-xs text-slate-500">465 (TLS) ou 587 (STARTTLS)</p>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Expéditeur affiché (From)</label>
              <input
                className={inputClass}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder={user ? `AC-KINETIK <${user}>` : 'AC-KINETIK <expediteur@exemple.com>'}
              />
              <p className="mt-1 text-xs text-slate-500">
                L’adresse affichée comme expéditeur. Avec un relais (Brevo), ce doit être une adresse <strong>vérifiée</strong> dans ton compte — pas l’identifiant SMTP.
              </p>
            </div>
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy !== null}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            {busy === 'save' ? 'Enregistrement…' : 'Enregistrer la connexion'}
          </button>
          {connected && (
            <button
              type="button"
              onClick={remove}
              disabled={busy !== null}
              className="ml-auto text-xs text-red-400 hover:underline disabled:opacity-40"
            >
              {busy === 'delete' ? 'Suppression…' : 'Supprimer la configuration'}
            </button>
          )}
        </div>
      </form>

      <div className="mt-5 border-t border-slate-800 pt-4">
        <label className={labelClass}>Tester l’envoi</label>
        <div className="flex flex-wrap items-end gap-2">
          <input
            className={`${inputClass} max-w-xs flex-1`}
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="Destinataire (par défaut : l’adresse émettrice)"
          />
          <button
            type="button"
            onClick={test}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            {busy === 'test' ? 'Envoi…' : 'Envoyer un test'}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Utilise les valeurs ci-dessus (mot de passe enregistré si laissé vide). Avec un relais comme Brevo,
          mets une adresse à toi ici — sinon le test part vers l’identifiant technique, illisible.
        </p>
      </div>

      {msg && (
        <div
          className={`mt-3 rounded-lg border p-3 text-sm ${
            msg.type === 'ok'
              ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-300'
              : 'border-red-900/50 bg-red-950/30 text-red-300'
          }`}
        >
          {msg.text}
        </div>
      )}
    </section>
  );
}
