import {ArrowLeft, ChevronRight, Dumbbell, HeartPulse} from 'lucide-react';
import {Link} from 'react-router-dom';
import {api, type ProgramListItem} from '../lib/api';
import {useAuth} from '../lib/auth';
import {useFetch} from '../lib/useFetch';
import {SectionTitle, Badge} from '../components/ui';
import FatLossFraming from '../components/FatLossFraming';
import {orderedZones, genderNote} from '../lib/affiner';

export default function AffinerHubPage() {
  const {user} = useAuth();
  const gender = user?.gender ?? null;
  const zones = orderedZones(gender);
  const note = genderNote(gender);
  const {data: programs} = useFetch(() => api.programs(), []);
  const fatLoss = (programs ?? []).filter((p) => p.theme === 'fat-loss');
  const suggested = (p: ProgramListItem) => !!gender && p.audience === gender;

  return (
    <div>
      <Link to="/" className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Accueil
      </Link>
      <h1 className="text-xl font-bold">M'affiner</h1>
      <p className="mt-1 text-sm text-slate-400">Muscle la zone que tu veux galber, révèle-la en baissant ton gras global.</p>

      <div className="mt-4">
        <FatLossFraming note={note} />
      </div>

      <SectionTitle>Choisis une zone à travailler</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        {zones.map((z) => (
          <Link
            key={z.id}
            to={`/affiner/${z.id}`}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900"
          >
            <h3 className="font-semibold leading-snug">{z.label}</h3>
            <p className="mt-0.5 text-xs text-slate-400">{z.blurb}</p>
          </Link>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Toutes les zones restent accessibles{gender ? ' — l’ordre suit ton profil' : ''}.
      </p>

      <SectionTitle>Brûler le gras (c'est ça qui dévoile tes zones)</SectionTitle>
      <div className="grid gap-2.5">
        <Link
          to="/exercices?category=cardio"
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 transition-colors hover:border-slate-700 hover:bg-slate-900"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <HeartPulse className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Cardio</span>
            <span className="block text-xs text-slate-400">Course, vélo, escaliers, corde — la dépense d'énergie.</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
        </Link>
        <Link
          to="/exercices?preset=gros-mouvements"
          className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 transition-colors hover:border-slate-700 hover:bg-slate-900"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
            <Dumbbell className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Gros mouvements dépensiers</span>
            <span className="block text-xs text-slate-400">Squat, soulevé, tractions… ils brûlent le plus et préservent le muscle.</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
        </Link>
      </div>

      {fatLoss.length > 0 && (
        <>
          <SectionTitle>Programmes pour cet objectif</SectionTitle>
          <div className="grid gap-2.5">
            {fatLoss.map((p) => (
              <Link
                key={p.id}
                to={`/programmes/${p.id}`}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 transition-colors hover:border-slate-700 hover:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{p.nameFr}</h3>
                  {suggested(p) && <Badge tone="emerald">Suggéré</Badge>}
                </div>
                {p.summaryFr && <p className="mt-1 text-xs leading-relaxed text-slate-400">{p.summaryFr}</p>}
              </Link>
            ))}
          </div>
          <Link to="/programmes" className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
            Voir aussi les programmes cardio <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </>
      )}
    </div>
  );
}
