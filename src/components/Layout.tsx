import {Activity, BookOpen, ClipboardList, Dumbbell, Home, LineChart, User} from 'lucide-react';
import {NavLink, Outlet} from 'react-router-dom';
import {useAuth} from '../lib/auth';
import Logo from './Logo';

const tabs = [
  {to: '/', label: 'Accueil', icon: Home, end: true},
  {to: '/exercices', label: 'Exercices', icon: Dumbbell, end: false},
  {to: '/programmes', label: 'Programmes', icon: ClipboardList, end: false},
  {to: '/suivi', label: 'Suivi', icon: LineChart, end: false},
  {to: '/muscles', label: 'Muscles', icon: Activity, end: false},
  {to: '/savoir', label: 'Savoir', icon: BookOpen, end: false},
];

export default function Layout() {
  const {user} = useAuth();
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <NavLink to="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight">Salle de sport</span>
        </NavLink>
        <NavLink
          to="/compte"
          title={user ? user.email : 'Se connecter'}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-400 hover:text-slate-200"
        >
          <User className={`h-5 w-5 ${user ? 'text-emerald-400' : ''}`} />
          <span className="hidden sm:inline">{user ? 'Mon compte' : 'Se connecter'}</span>
        </NavLink>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>

      {user && (
        <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl">
            {tabs.map(({to, label, icon: Icon, end}) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({isActive}) =>
                  `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                    isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
