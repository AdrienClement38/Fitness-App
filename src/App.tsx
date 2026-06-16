import {lazy, useEffect} from 'react';
import {Navigate, Outlet, Route, Routes, useLocation} from 'react-router-dom';
import Layout from './components/Layout';
import {Loading} from './components/ui';
import {useAuth} from './lib/auth';
import {connect, disconnect} from './lib/sync';
// Import à effet : chaque store enregistre sa collection synchronisable au chargement.
import './lib/workoutLogs';
import './lib/myPrograms';
import './lib/favorites';
import './lib/records';

// Pages en chargement différé (code-splitting) : le bundle initial = la coquille
// (Layout, router, auth). Chaque page — et ses libs lourdes, ex. le body-map — arrive
// dans son propre chunk au 1er accès. Le <Suspense> est dans Layout : la coquille reste.
const HomePage = lazy(() => import('./pages/HomePage'));
const ExercisesPage = lazy(() => import('./pages/ExercisesPage'));
const ExerciseDetailPage = lazy(() => import('./pages/ExerciseDetailPage'));
const MusclesPage = lazy(() => import('./pages/MusclesPage'));
const MuscleDetailPage = lazy(() => import('./pages/MuscleDetailPage'));
const ProgramsPage = lazy(() => import('./pages/ProgramsPage'));
const ProgramDetailPage = lazy(() => import('./pages/ProgramDetailPage'));
const MyProgramPage = lazy(() => import('./pages/MyProgramPage'));
const MyProgramDetailPage = lazy(() => import('./pages/MyProgramDetailPage'));
const SuiviPage = lazy(() => import('./pages/SuiviPage'));
const WorkoutPage = lazy(() => import('./pages/WorkoutPage'));
const PostSessionPage = lazy(() => import('./pages/PostSessionPage'));
const KnowledgePage = lazy(() => import('./pages/KnowledgePage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const CategoryBrowse = lazy(() => import('./components/CategoryBrowse'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

/** Garde d'accès : l'app exige d'être connecté (sauf /compte + pages légales). */
function Protected() {
  const {user, loading} = useAuth();
  const location = useLocation();
  if (!user) {
    if (loading) return <Loading />; // session en cours de résolution
    return <Navigate to="/compte" replace state={{from: location.pathname}} />;
  }
  return <Outlet />;
}

export default function App() {
  const {user} = useAuth();
  useEffect(() => {
    if (user) connect();
    else disconnect();
  }, [user]);

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public : connexion + légal (lié depuis le formulaire d'inscription). */}
        <Route path="/compte" element={<AccountPage />} />
        <Route path="/confidentialite" element={<PrivacyPage />} />
        <Route path="/mentions-legales" element={<LegalPage />} />
        <Route path="/cgu" element={<TermsPage />} />
        <Route path="/verifier-email" element={<VerifyEmailPage />} />
        <Route path="/reinitialiser-mot-de-passe" element={<ResetPasswordPage />} />

        {/* Tout le reste exige un compte. */}
        <Route element={<Protected />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/exercices" element={<ExercisesPage />} />
          <Route path="/exercices/:id" element={<ExerciseDetailPage />} />
          <Route path="/muscles" element={<MusclesPage />} />
          <Route path="/muscles/:id" element={<MuscleDetailPage />} />
          <Route path="/programmes" element={<ProgramsPage />} />
          <Route path="/programmes/:id" element={<ProgramDetailPage />} />
          <Route path="/mes-programmes/:id" element={<MyProgramDetailPage />} />
          <Route path="/mes-programmes/:id/modifier" element={<MyProgramPage />} />
          <Route path="/suivi" element={<SuiviPage />} />
          <Route path="/seance" element={<WorkoutPage />} />
          <Route path="/seance/fin" element={<PostSessionPage />} />
          <Route
            path="/cardio"
            element={
              <CategoryBrowse
                category="cardio"
                title="Cardio"
                intro="Tapis, vélo, rameur, elliptique, corde à sauter. Pour t'échauffer, travailler l'endurance, ou récupérer activement — en continu (faible intensité, longue durée) ou en fractionné (efforts courts et intenses)."
              />
            }
          />
          <Route
            path="/recuperation"
            element={
              <CategoryBrowse
                category="stretching"
                title="Récupération & étirements"
                intro="À faire après ta séance : étirements pour gagner en souplesse, et automassages (foam rolling) pour relâcher les tensions et accélérer la récupération."
              />
            }
          />
          <Route path="/savoir" element={<KnowledgePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
