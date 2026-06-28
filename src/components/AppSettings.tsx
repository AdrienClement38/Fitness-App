import {useEffect, useState} from 'react';
import {Megaphone, Wrench} from 'lucide-react';
import {adminApi, type AdminAppStatus} from '../lib/api';
import {Badge, Loading} from './ui';

const inputClass =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-500';
const labelClass = 'mb-1 block text-xs font-medium text-slate-400';

/** Réglages d'état applicatif (admin) : bandeau d'annonce + mode maintenance. */
export default function AppSettings() {
  const [status, setStatus] = useState<AdminAppStatus | null>(null);
  const [annMsg, setAnnMsg] = useState('');
  const [annTone, setAnnTone] = useState<'info' | 'warn'>('info');
  const [annActive, setAnnActive] = useState(false);
  const [maintActive, setMaintActive] = useState(false);
  const [maintMsg, setMaintMsg] = useState('');
  const [busy, setBusy] = useState<'ann' | 'maint' | null>(null);
  const [msg, setMsg] = useState<{type: 'ok' | 'err'; text: string} | null>(null);

  const apply = (s: AdminAppStatus) => {
    setStatus(s);
    setAnnMsg(s.announcement.message);
    setAnnTone(s.announcement.tone);
    setAnnActive(s.announcement.active);
    setMaintActive(s.maintenance.active);
    setMaintMsg(s.maintenance.message);
  };

  useEffect(() => {
    adminApi.appStatus().then(apply).catch((e) => setMsg({type: 'err', text: e instanceof Error ? e.message : 'Erreur'}));
  }, []);

  const saveAnn = async () => {
    setBusy('ann');
    setMsg(null);
    try {
      apply(await adminApi.setAnnouncement({message: annMsg, tone: annTone, active: annActive}));
      setMsg({type: 'ok', text: 'Annonce enregistrée.'});
    } catch (e) {
      setMsg({type: 'err', text: e instanceof Error ? e.message : 'Erreur'});
    } finally {
      setBusy(null);
    }
  };

  const saveMaint = async () => {
    // Confirmation à l'activation : ça coupe l'app pour tous les non-admins.
    if (maintActive && !status?.maintenance.active && !confirm("Activer le mode maintenance ? L'app sera coupée pour tous les utilisateurs (sauf toi).")) {
      return;
    }
    setBusy('maint');
    setMsg(null);
    try {
      apply(await adminApi.setMaintenance({active: maintActive, message: maintMsg}));
      setMsg({type: 'ok', text: maintActive ? 'Mode maintenance ACTIVÉ.' : 'Mode maintenance désactivé.'});
    } catch (e) {
      setMsg({type: 'err', text: e instanceof Error ? e.message : 'Erreur'});
    } finally {
      setBusy(null);
    }
  };

  if (status === null && !msg) return <Loading />;

  return (
    <>
      {/* Bandeau d'annonce */}
      <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Megaphone className="h-5 w-5 text-sky-400" />
          <h2 className="font-semibold">Bandeau d'annonce</h2>
          {status?.announcement.active && <Badge tone="emerald">Affiché</Badge>}
          {status?.announcement.active && status.announcement.totalCount !== undefined && (
            <span className="text-xs font-medium">
              {status.announcement.seenCount === status.announcement.totalCount ? (
                <span className="text-emerald-400">Terminé — tous les utilisateurs ({status.announcement.seenCount}/{status.announcement.totalCount}) l'ont vu</span>
              ) : (
                <span className="text-amber-400">Toujours en cours ({status.announcement.seenCount}/{status.announcement.totalCount} vus, encore au moins une personne ne l'a pas vu)</span>
              )}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-400">Un message affiché en haut de l'app pour tous les utilisateurs.</p>

        <div className="mt-4 grid gap-3">
          <div>
            <label className={labelClass}>Message</label>
            <textarea
              className={`${inputClass} min-h-[64px] resize-y`}
              value={annMsg}
              maxLength={500}
              onChange={(e) => setAnnMsg(e.target.value)}
              placeholder="Ex. Nouvelle fonctionnalité dispo : le suivi par graphique !"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className={labelClass}>Style</label>
              <select className={inputClass} value={annTone} onChange={(e) => setAnnTone(e.target.value as 'info' | 'warn')}>
                <option value="info">Info (bleu)</option>
                <option value="warn">Attention (orange)</option>
              </select>
            </div>
            <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={annActive} onChange={(e) => setAnnActive(e.target.checked)} className="h-5 w-5 accent-emerald-500" />
              Afficher l'annonce
            </label>
          </div>
          <div>
            <button
              onClick={saveAnn}
              disabled={busy !== null}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {busy === 'ann' ? 'Enregistrement…' : "Enregistrer l'annonce"}
            </button>
          </div>
        </div>
      </section>

      {/* Mode maintenance */}
      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Wrench className="h-5 w-5 text-orange-400" />
          <h2 className="font-semibold">Mode maintenance</h2>
          {status?.maintenance.active && <Badge tone="amber">Actif</Badge>}
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Coupe l'app pour tous les utilisateurs sauf toi (admin) — utile le temps d'une opération.
        </p>

        <div className="mt-4 grid gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={maintActive} onChange={(e) => setMaintActive(e.target.checked)} className="h-5 w-5 accent-orange-500" />
            Activer le mode maintenance
          </label>
          <div>
            <label className={labelClass}>Message affiché aux utilisateurs (optionnel)</label>
            <input
              className={inputClass}
              value={maintMsg}
              maxLength={500}
              onChange={(e) => setMaintMsg(e.target.value)}
              placeholder="Maintenance en cours, on revient très vite."
            />
          </div>
          <div>
            <button
              onClick={saveMaint}
              disabled={busy !== null}
              className="rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-300 hover:bg-orange-500/20 disabled:opacity-40"
            >
              {busy === 'maint' ? 'Application…' : 'Appliquer'}
            </button>
          </div>
        </div>
      </section>

      {msg && (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            msg.type === 'ok'
              ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-300'
              : 'border-red-900/50 bg-red-950/30 text-red-300'
          }`}
        >
          {msg.text}
        </div>
      )}
    </>
  );
}
