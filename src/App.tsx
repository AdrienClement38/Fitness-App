import {Route, Routes} from 'react-router-dom';
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
import KnowledgePage from './pages/KnowledgePage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
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
        <Route path="/savoir" element={<KnowledgePage />} />
      </Route>
    </Routes>
  );
}
