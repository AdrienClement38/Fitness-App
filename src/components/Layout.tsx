import {Suspense, useLayoutEffect} from 'react';
import {Activity, BookOpen, ClipboardList, Dumbbell, Home, LineChart, User, Wrench} from 'lucide-react';
import {NavLink, Outlet, useLocation, useNavigationType} from 'react-router-dom';
import {useAuth} from '../lib/auth';
import {useAppStatus} from '../lib/appStatus';
import {useOnline} from '../lib/useOnline';
import {Loading} from './ui';
import EmailVerifyBanner from './EmailVerifyBanner';
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
  const online = useOnline();
  const {announcement, maintenance} = useAppStatus();
  const {pathname} = useLocation();
  const navType = useNavigationType();
  const isAdmin = user?.role === 'admin';
  // Maintenance : on coupe l'app pour les non-admins, mais on laisse /compte ouvert
  // pour que l'admin (ou qui que ce soit) puisse se connecter et désactiver.
  const blockForMaintenance = maintenance.active && !isAdmin && pathname !== '/compte';
  // Remet la vue en haut sur une navigation « avant » (ex. ouvrir une fiche exercice
  // depuis une liste scrollée). On laisse le navigateur restaurer la position sur
  // retour/avance (POP) pour ne pas perdre l'endroit où on en était dans une liste.
  useLayoutEffect(() => {
    if (navType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navType]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-4 py-3 backdrop-blur">
        <NavLink to="/" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <span className="font-display text-lg font-bold tracking-wide">AC-KINETIK</span>
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

      {!online && (
        <div className="bg-amber-500/15 px-4 py-1.5 text-center text-xs font-medium text-amber-300">
          Hors ligne — tes données et les pages déjà ouvertes restent disponibles.
        </div>
      )}
      {maintenance.active && isAdmin && (
        <div className="flex items-center justify-center gap-1.5 bg-orange-500/20 px-4 py-1.5 text-center text-xs font-medium text-orange-300">
          <Wrench className="h-3.5 w-3.5" /> Mode maintenance ACTIF — l'app est coupée pour les non-admins (toi tu la vois).
        </div>
      )}
      {announcement && (
        <div
          className={`px-4 py-1.5 text-center text-xs font-medium ${
            announcement.tone === 'warn' ? 'bg-amber-500/15 text-amber-300' : 'bg-sky-500/15 text-sky-300'
          }`}
        >
          {announcement.message}
        </div>
      )}
      <EmailVerifyBanner />

      <main className="flex-1 px-4 pb-24 pt-4">
        {blockForMaintenance ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <Wrench className="h-10 w-10 text-orange-400" />
            <h1 className="text-xl font-bold">Maintenance en cours</h1>
            <p className="max-w-sm text-sm text-slate-400">{maintenance.message}</p>
          </div>
        ) : (
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        )}
      </main>

      {user && !blockForMaintenance && (
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
