import {useEffect} from 'react';
import {Navigate, Outlet, Route, Routes, useLocation} from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ExercisesPage from './pages/ExercisesPage';
import ExerciseDetailPage from './pages/ExerciseDetailPage';
import MusclesPage from './pages/MusclesPage';
import MuscleDetailPage from './pages/MuscleDetailPage';
import ProgramsPage from './pages/ProgramsPage';
import ProgramDetailPage from './pages/ProgramDetailPage';
import MyProgramPage from './pages/MyProgramPage';
import MyProgramDetailPage from './pages/MyProgramDetailPage';
import SuiviPage from './pages/SuiviPage';
import WorkoutPage from './pages/WorkoutPage';
import PostSessionPage from './pages/PostSessionPage';
import KnowledgePage from './pages/KnowledgePage';
import AccountPage from './pages/AccountPage';
import PrivacyPage from './pages/PrivacyPage';
import LegalPage from './pages/LegalPage';
import TermsPage from './pages/TermsPage';
import CategoryBrowse from './components/CategoryBrowse';
import {Loading} from './components/ui';
import {useAuth} from './lib/auth';
import {connect, disconnect} from './lib/sync';
// Import à effet : chaque store enregistre sa collection synchronisable au chargement.
import './lib/workoutLogs';
import './lib/myPrograms';
import './lib/favorites';
import './lib/records';

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
                title="Récup & Mobilité"
                intro="À faire après ta séance : étirements pour gagner en souplesse, et automassages (foam rolling) pour relâcher les tensions et accélérer la récupération."
              />
            }
          />
          <Route path="/savoir" element={<KnowledgePage />} />
        </Route>
      </Route>
    </Routes>
  );
}
