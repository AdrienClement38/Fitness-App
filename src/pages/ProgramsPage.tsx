import {useEffect, useState} from 'react';
import {Check, Minus, Plus} from 'lucide-react';
import {Link, useNavigate} from 'react-router-dom';
import {api, label, type Gender, type ProgramListItem} from '../lib/api';
import {createEmptyProgram, useMyPrograms} from '../lib/myPrograms';
import {useFetch} from '../lib/useFetch';
import {useAuth} from '../lib/auth';
import {Badge, Empty, ErrorState, Loading, SectionTitle} from '../components/ui';

const LEVELS = [
  {id: 'beginner', label: 'Débutant'},
  {id: 'intermediate', label: 'Intermédiaire'},
  {id: 'advanced', label: 'Avancé'},
];

// Mise en avant PAR OBJECTIF/PRÉFÉRENCE (pas une nécessité physiologique : cf. recherche
// — les programmes marchent pareil pour tous, la charge est individuelle). Le programme
// porte un `audience` curé ; on remonte ceux du sexe + badge « Suggéré ». Tout reste
// accessible ; 'all' = neutre ; 'préfère ne pas dire' (gender null) -> aucun tri.
const isSuggested = (audience: ProgramListItem['audience'], gender: Gender | null | undefined): boolean =>
  !!gender && audience === gender;

/** État replié d'une section, mémorisé (l'utilisateur retrouve sa mise en page). */
function useCollapsed(key: string): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(key) === '1';
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(key, next ? '1' : '0');
      } catch {
        /* quota / mode privé */
      }
      return next;
    });
  return [collapsed, toggle];
}

export default function ProgramsPage() {
  const {user} = useAuth();
  // Signature du matériel : refetch en direct quand il change (autre appareil via WebSocket,
  // ou retour depuis « Mon compte ») -> les programmes compatibles se mettent à jour live.
  // Distingue null (non renseigné) de [] (« zéro matériel ») pour refetcher sur la transition.
  const equip = user && Array.isArray(user.equipment) ? user.equipment : null;
  const equipSig = equip ? `set:${equip.join(',')}` : '∅';
  const {data, error, loading} = useFetch(() => api.programs(), [equipSig]);
  const mine = useMyPrograms();
  const navigate = useNavigate();
  const gender = user?.gender ?? null;
  // Niveau choisi, mémorisé (l'utilisateur retrouve son niveau).
  const [level, setLevel] = useState(() => localStorage.getItem('program-level') || 'beginner');
  useEffect(() => {
    localStorage.setItem('program-level', level);
  }, [level]);
  const [muscuCollapsed, toggleMuscu] = useCollapsed('programs-collapse-musculation');
  const [cardioCollapsed, toggleCardio] = useCollapsed('programs-collapse-cardio');

  const filtered = (data ?? []).filter((p) => p.level === level);
  // Tri : (1) les programmes 100 % compatibles d'abord (tu peux TOUT faire) — entre eux,
  // ordre alphabétique (même compatibilité) ; (2) puis les partiels, du PLUS au MOINS
  // d'exercices faisables ; (3) alphabétique à égalité. (Sans préférence / salle : tout en alpha.)
  const byName = (a: ProgramListItem, b: ProgramListItem) => (a.nameFr || '').localeCompare(b.nameFr || '', 'fr');
  const order = (arr: ProgramListItem[]) =>
    [...arr].sort((a, b) => {
      if (!!a.canDo !== !!b.canDo) return a.canDo ? -1 : 1; // full compatibles d'abord
      if (!a.canDo) {
        const byCount = (b.doableCount ?? 0) - (a.doableCount ?? 0); // partiels : plus de faisables d'abord
        if (byCount) return byCount;
      }
      return byName(a, b);
    });
  const muscu = order(filtered.filter((p) => p.theme !== 'cardio'));
  const cardio = order(filtered.filter((p) => p.theme === 'cardio'));

  return (
    <div>
      <h1 className="text-xl font-bold">Programmes</h1>
      <p className="mt-1 text-sm text-slate-400">
        Choisis ton niveau, puis un programme prêt à suivre. Chaque exercice renvoie à sa fiche.
      </p>

      <section className="mt-4">
        <div className="mb-2 mt-6 flex items-center justify-between">
          <h2 className="font-heading text-lg uppercase tracking-wider text-slate-300">Mes programmes</h2>
          <button
            onClick={() => navigate(`/mes-programmes/${createEmptyProgram()}/modifier`)}
            className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
          >
            <Plus className="h-4 w-4" /> Créer
          </button>
        </div>
        {mine.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 p-4 text-sm text-slate-500">
            Aucun programme perso. Crée-en un de zéro avec « Créer », ou ouvre un programme du catalogue et clique « Dupliquer / personnaliser ».
          </p>
        ) : (
          <div className="grid gap-3">
            {mine.map((mp) => (
              <Link
                key={mp.id}
                to={`/mes-programmes/${mp.id}`}
                className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 transition-colors hover:border-emerald-800 hover:bg-emerald-950/30"
              >
                <h3 className="font-semibold leading-snug">{mp.nameFr}</h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {mp.level && <Badge tone="emerald">{label('level', mp.level)}</Badge>}
                  <Badge>Perso</Badge>
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {mp.sessions.length} séance{mp.sessions.length > 1 ? 's' : ''}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <SectionTitle>Catalogue par niveau</SectionTitle>

      <div className="mt-3 flex gap-1 rounded-xl bg-slate-900 p-1">
        {LEVELS.map((lv) => (
          <button
            key={lv.id}
            onClick={() => setLevel(lv.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              level === lv.id ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lv.label}
          </button>
        ))}
      </div>

      {loading && <Loading />}
      {error && <ErrorState message={error} />}
      {data &&
        (filtered.length === 0 ? (
          <div className="mt-4">
            <Empty label="Aucun programme à ce niveau pour l'instant." />
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {/* Cardio en premier : presque toujours compatible (délocalisable) → le plus accessible. */}
            <ProgramGroup
              title="Cardio"
              subtitle="course, vélo, escaliers, corde…"
              programs={cardio}
              gender={gender}
              hideTheme
              collapsed={cardioCollapsed}
              onToggle={toggleCardio}
            />
            <ProgramGroup
              title="Musculation"
              programs={muscu}
              gender={gender}
              collapsed={muscuCollapsed}
              onToggle={toggleMuscu}
            />
          </div>
        ))}
    </div>
  );
}

/** Une carte programme du catalogue. */
function ProgramCard({p, gender, hideTheme}: {p: ProgramListItem; gender: Gender | null; hideTheme?: boolean}) {
  return (
    <Link
      to={`/programmes/${p.id}`}
      className={`block rounded-xl border p-4 transition-colors ${
        p.canDo
          ? 'border-emerald-700/40 bg-emerald-950/20 hover:border-emerald-600/60 hover:bg-emerald-950/30'
          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
      }`}
    >
      <h3 className="font-semibold leading-snug">{p.nameFr}</h3>
      {/* Tags TOUJOURS sous le titre, ordre fixe : compatibilité · type · fréquence · suggéré. */}
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {p.canDo ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-xs font-semibold text-emerald-300">
            <Check className="h-3 w-3" /> Compatible
          </span>
        ) : (
          typeof p.doableCount === 'number' &&
          !!p.exerciseCount && (
            <span className="inline-flex items-center rounded-md bg-slate-800 px-1.5 py-0.5 text-xs font-medium text-slate-300">
              {p.doableCount}/{p.exerciseCount} compatibles
            </span>
          )
        )}
        {!hideTheme && p.theme && <Badge tone="indigo">{label('theme', p.theme)}</Badge>}
        {p.daysPerWeek && <Badge>{p.daysPerWeek} j/sem</Badge>}
        {isSuggested(p.audience, gender) && <Badge tone="emerald">Suggéré</Badge>}
      </div>
      {p.summaryFr && <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{p.summaryFr}</p>}
    </Link>
  );
}

/**
 * Un bloc du catalogue (Musculation / Cardio), repliable. Liste à plat déjà triée par le
 * parent (du plus au moins compatible, puis alphabétique). Le bouton +/− est à DROITE.
 */
function ProgramGroup({
  title,
  subtitle,
  programs,
  gender,
  hideTheme,
  collapsed,
  onToggle,
}: {
  title: string;
  subtitle?: string;
  programs: ProgramListItem[];
  gender: Gender | null;
  hideTheme?: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (programs.length === 0) return null;
  return (
    <section>
      <button
        onClick={onToggle}
        aria-expanded={!collapsed}
        className="mb-2 flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-baseline gap-2">
          <h3 className="font-heading text-sm uppercase tracking-wider text-slate-400">{title}</h3>
          <span className="text-xs text-slate-600">
            {programs.length}
            {subtitle ? ` · ${subtitle}` : ''}
          </span>
        </span>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-700 text-slate-400">
          {collapsed ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
        </span>
      </button>

      {!collapsed && (
        <div className="grid gap-3">
          {programs.map((p) => (
            <ProgramCard key={p.id} p={p} gender={gender} hideTheme={hideTheme} />
          ))}
        </div>
      )}
    </section>
  );
}
