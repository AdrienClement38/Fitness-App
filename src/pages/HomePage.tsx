import {Activity, BookOpen, Dumbbell, HeartPulse, Leaf, Search} from 'lucide-react';
import {useState, type FormEvent} from 'react';
import {Link, useNavigate} from 'react-router-dom';

const cards = [
  {to: '/exercices', icon: Dumbbell, title: 'Exercices', desc: '873 exercices, filtrables par muscle, matériel et niveau.'},
  {to: '/cardio', icon: HeartPulse, title: 'Cardio', desc: 'Tapis, vélo, rameur — échauffement, endurance, récup active.'},
  {to: '/recuperation', icon: Leaf, title: 'Récup & Mobilité', desc: 'Étirements et automassages, pour après la séance.'},
  {to: '/muscles', icon: Activity, title: 'Muscles', desc: 'Anatomie, fonctions et exercices ciblant chaque muscle.'},
  {to: '/savoir', icon: BookOpen, title: 'Savoir', desc: 'Volume, intensité, repos, splits — appuyés sur la science.'},
];

export default function HomePage() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(`/exercices${term ? `?search=${encodeURIComponent(term)}` : ''}`);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Ta salle, dans ta poche</h1>
      <p className="mt-1 text-slate-400">Bibliothèque d'exercices et de connaissances d'entraînement.</p>

      <form onSubmit={submit} className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un exercice…"
          className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-4 text-sm outline-none placeholder:text-slate-500 focus:border-emerald-500/60"
        />
      </form>

      <div className="mt-5 grid gap-3">
        {cards.map(({to, icon: Icon, title, desc}) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700 hover:bg-slate-900"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="text-sm text-slate-400">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
