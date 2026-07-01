import {useState} from 'react';
import {CalendarDays, Check, ChevronDown, ChevronUp, Dumbbell, Footprints, Lock, Trophy, type LucideIcon} from 'lucide-react';
import {achievements, lifetimeTotals, type CategoryView} from '../lib/achievements';
import {useWorkoutHistory} from '../lib/workoutLogs';
import {useCarryEntries} from '../lib/lifetimeTotals';

const ICONS: Record<string, LucideIcon> = {dumbbell: Dumbbell, run: Footprints, calendar: CalendarDays};

function Tier({label, reached, isNext, Icon}: {label: string; reached: boolean; isNext: boolean; Icon: LucideIcon}) {
  const box = reached
    ? 'border-emerald-500/30 bg-emerald-500/10'
    : isNext
      ? 'border-dashed border-emerald-500/50 bg-slate-900'
      : 'border-slate-800 bg-slate-900';
  const tint = reached || isNext ? 'text-emerald-400' : 'text-slate-600';
  const val = reached || isNext ? 'text-emerald-200' : 'text-slate-400';
  return (
    <div className={`w-20 shrink-0 snap-start rounded-xl border px-1 py-2.5 text-center ${box}`}>
      <Icon className={`mx-auto h-5 w-5 ${tint}`} />
      <div className={`mt-1 whitespace-nowrap text-sm font-medium ${val}`}>{label}</div>
      <div className="mt-0.5 text-[11px]">
        {reached ? (
          <span className="flex items-center justify-center gap-0.5 text-emerald-500/80">
            <Check className="h-3 w-3" /> atteint
          </span>
        ) : isNext ? (
          <span className="text-emerald-400/80">en cours</span>
        ) : (
          <span className="flex items-center justify-center gap-0.5 text-slate-500">
            <Lock className="h-2.5 w-2.5" /> à venir
          </span>
        )}
      </div>
    </div>
  );
}

function Category({cat}: {cat: CategoryView}) {
  const Icon = ICONS[cat.icon] ?? Dumbbell;
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <Icon className="h-4 w-4 text-emerald-400" /> {cat.nameFr}
        </span>
        <span className="whitespace-nowrap text-xs text-slate-500">{cat.totalLabel} au total</span>
      </div>
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1.5">
        {cat.tiers.map((t, i) => (
          <Tier key={i} label={t.label} reached={t.reached} isNext={t.isNext} Icon={Icon} />
        ))}
      </div>
      {cat.nextLabel ? (
        <>
          <div className="mb-1 mt-1 flex justify-between gap-2 text-[11px] text-slate-500">
            <span className="whitespace-nowrap">Prochain : {cat.nextLabel}</span>
            <span className="whitespace-nowrap">
              {cat.currentLabel} / {cat.targetLabel}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500" style={{width: `${cat.pct}%`}} />
          </div>
        </>
      ) : (
        <p className="mt-1 text-[11px] font-medium text-emerald-400">Tous les paliers atteints.</p>
      )}
    </div>
  );
}

/**
 * « Trophées » (page compte) : paliers cumulatifs à vie (fonte, cardio, séances),
 * repliable, un carrousel horizontal par catégorie. 100% client (cf. achievements.ts).
 */
export default function TrophySection() {
  const history = useWorkoutHistory();
  const carry = useCarryEntries();
  const [open, setOpen] = useState(false); // replié par défaut (n'encombre pas la page compte)

  const totals = lifetimeTotals(history, carry);
  const cats = achievements(totals);
  const nothing = totals.tonnageKg === 0 && totals.cardioMin === 0 && totals.sessions === 0;
  const earned = cats.reduce((n, c) => n + c.tiers.filter((t) => t.reached).length, 0);
  const totalTiers = cats.reduce((n, c) => n + c.tiers.length, 0);

  return (
    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between">
        <span className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <span className="font-semibold">Trophées</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${earned > 0 ? 'bg-amber-400/15 text-amber-300' : 'bg-slate-800 text-slate-500'}`}
            title={`${earned} trophée${earned > 1 ? 's' : ''} débloqué${earned > 1 ? 's' : ''} sur ${totalTiers}`}
          >
            {earned}
          </span>
        </span>
        {open ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
      </button>
      {open && (
        <div>
          <p className="mt-1.5 text-xs text-slate-500">
            {nothing
              ? 'Fais ta première séance pour débloquer tes premiers trophées.'
              : 'Tes paliers franchis. Rien à tenir, juste du cumul. Glisse pour voir les suivants.'}
          </p>
          {!nothing && cats.map((c) => <Category key={c.key} cat={c} />)}
        </div>
      )}
    </div>
  );
}
