import {useState, type ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';
import {api, label, type Principle, type RepScheme, type Source, type Split, type VolumeLandmark} from '../lib/api';
import {useFetch} from '../lib/useFetch';
import {Badge, ErrorState, Loading} from '../components/ui';

type Tab = 'principles' | 'reps' | 'volumes' | 'splits' | 'sources';
const TABS: {id: Tab; label: string}[] = [
  {id: 'principles', label: 'Principes'},
  {id: 'reps', label: 'Reps'},
  {id: 'volumes', label: 'Volumes'},
  {id: 'splits', label: 'Splits'},
  {id: 'sources', label: 'Sources'},
];

const evidenceTone = (e: string | null) =>
  e === 'strong' ? 'emerald' : e === 'moderate' ? 'indigo' : 'slate';

function range(min: number | null, max: number | null, unit = '') {
  if (min == null && max == null) return '—';
  if (min === max || max == null) return `${min}${unit}`;
  if (min == null) return `${max}${unit}`;
  return `${min}–${max}${unit}`;
}

/** Carte dépliante (accordéon) : en-tête titre + badge cliquable, détail au clic. */
function Collapsible({title, badge, defaultOpen = false, children}: {title: string; badge?: ReactNode; defaultOpen?: boolean; children: ReactNode}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-900"
      >
        <span className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug">{title}</h3>
          {badge && <span className="mt-2 block">{badge}</span>}
        </span>
        <ChevronDown className={`mt-0.5 h-5 w-5 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-2 px-4 pb-4">{children}</div>}
    </div>
  );
}

function Principles({items}: {items: Principle[]}) {
  return (
    <div className="grid gap-3">
      {items.map((p, i) => (
        <Collapsible
          key={p.id}
          title={p.titleFr}
          defaultOpen={i === 0}
          badge={p.evidence ? <Badge tone={evidenceTone(p.evidence)}>{label('evidence', p.evidence)}</Badge> : undefined}
        >
          <p className="text-sm leading-relaxed text-slate-300">{p.summaryFr}</p>
          {p.practicalFr && p.practicalFr.length > 0 && (
            <ul className="space-y-1">
              {p.practicalFr.map((it, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-slate-400">
                  <span className="text-emerald-400">•</span>
                  {it}
                </li>
              ))}
            </ul>
          )}
          {p.sources.length > 0 && (
            <p className="text-xs text-slate-500">
              Sources : {p.sources.map((s) => `${s.authors ?? s.title}${s.year ? ` (${s.year})` : ''}`).join(' ; ')}
            </p>
          )}
        </Collapsible>
      ))}
    </div>
  );
}

function RepSchemes({items}: {items: RepScheme[]}) {
  return (
    <div className="grid gap-3">
      {items.map((r) => (
        <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{r.labelFr}</h3>
            <Badge tone="emerald">{label('goal', r.goal)}</Badge>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <Stat label="Répétitions" value={range(r.repsMin, r.repsMax)} />
            <Stat label="% 1RM" value={range(r.intensityPct1rmMin, r.intensityPct1rmMax, '%')} />
            <Stat label="Repos" value={range(r.restSecondsMin, r.restSecondsMax, ' s')} />
            <Stat label="RIR" value={range(r.rirMin, r.rirMax)} />
          </div>
          {r.notesFr && <p className="mt-2 text-xs text-slate-400">{r.notesFr}</p>}
        </div>
      ))}
    </div>
  );
}

function Stat({label: l, value}: {label: string; value: string}) {
  return (
    <div className="rounded-lg bg-slate-800/50 p-2 text-center">
      <div className="font-semibold text-slate-100">{value}</div>
      <div className="text-xs text-slate-500">{l}</div>
    </div>
  );
}

function Volumes({items}: {items: VolumeLandmark[]}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-900 text-xs uppercase text-slate-400">
          <tr>
            <th className="p-2 text-left">Muscle</th>
            <th className="p-2 text-center">MEV</th>
            <th className="p-2 text-center">MAV</th>
            <th className="p-2 text-center">MRV</th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr key={v.muscleId} className="border-t border-slate-800">
              <td className="p-2">{v.muscleNameFr}</td>
              <td className="p-2 text-center text-slate-300">{v.mevSets ?? '—'}</td>
              <td className="p-2 text-center text-emerald-400">{range(v.mavSetsMin, v.mavSetsMax)}</td>
              <td className="p-2 text-center text-slate-300">{v.mrvSets ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="bg-slate-900/60 p-2 text-xs text-slate-500">
        Séries dures par semaine. MEV : minimum efficace · MAV : zone optimale · MRV : maximum récupérable.
      </p>
    </div>
  );
}

function Splits({items}: {items: Split[]}) {
  return (
    <div className="grid gap-3">
      {items.map((s) => (
        <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{s.nameFr}</h3>
            <Badge>{range(s.daysPerWeekMin, s.daysPerWeekMax)} j/sem</Badge>
            {s.level && <Badge tone="emerald">{label('level', s.level)}</Badge>}
          </div>
          {s.summaryFr && <p className="mt-1 text-sm leading-relaxed text-slate-300">{s.summaryFr}</p>}
          {s.days.length > 0 && (
            <ol className="mt-2 space-y-1">
              {s.days.map((d) => (
                <li key={d.dayOrder} className="text-sm text-slate-400">
                  <span className="font-medium text-slate-200">{d.nameFr}</span>
                  {d.focusFr ? ` — ${d.focusFr}` : ''}
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}

const sourceTone = (t: string) =>
  t === 'scientific' ? 'emerald' : t === 'guideline' || t === 'book' ? 'indigo' : t === 'coach' ? 'amber' : 'slate';

function Sources({items}: {items: Source[]}) {
  return (
    <div className="grid gap-3">
      <p className="text-sm leading-relaxed text-slate-400">
        Chaque donnée chiffrée de l'app est rattachée à l'une de ces sources : méta-analyses,
        recommandations officielles, ouvrages de référence, coachs, et le jeu de données des exercices.
      </p>
      {items.map((s, i) => (
        <Collapsible
          key={s.id}
          title={s.title}
          defaultOpen={i === 0}
          badge={<Badge tone={sourceTone(s.type)}>{label('sourceType', s.type)}</Badge>}
        >
          {(s.authors || s.year) && (
            <p className="text-sm text-slate-300">
              {s.authors}
              {s.authors && s.year ? ' · ' : ''}
              {s.year ?? ''}
            </p>
          )}
          {s.notesFr && <p className="text-sm leading-relaxed text-slate-400">{s.notesFr}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            {s.license && <span className="text-slate-500">Licence : {s.license}</span>}
            {s.url && (
              <a href={s.url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                Voir la source ↗
              </a>
            )}
          </div>
        </Collapsible>
      ))}
    </div>
  );
}

export default function KnowledgePage() {
  const [tab, setTab] = useState<Tab>('principles');
  const principles = useFetch(() => api.principles(), []);
  const reps = useFetch(() => api.repSchemes(), []);
  const volumes = useFetch(() => api.volumeLandmarks(), []);
  const splits = useFetch(() => api.splits(), []);
  const sources = useFetch(() => api.sources(), []);

  const current = {principles, reps, volumes, splits, sources}[tab];

  return (
    <div>
      <h1 className="text-xl font-bold">Savoir</h1>

      <div className="mt-3 flex gap-1 rounded-xl bg-slate-900 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {current.loading && <Loading />}
        {current.error && <ErrorState message={current.error} />}
        {tab === 'principles' && principles.data && <Principles items={principles.data} />}
        {tab === 'reps' && reps.data && <RepSchemes items={reps.data} />}
        {tab === 'volumes' && volumes.data && <Volumes items={volumes.data} />}
        {tab === 'splits' && splits.data && <Splits items={splits.data} />}
        {tab === 'sources' && sources.data && <Sources items={sources.data} />}
      </div>
    </div>
  );
}
