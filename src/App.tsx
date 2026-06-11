import {Route, Routes} from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ExercisesPage from './pages/ExercisesPage';
import ExerciseDetailPage from './pages/ExerciseDetailPage';
import MusclesPage from './pages/MusclesPage';
import MuscleDetailPage from './pages/MuscleDetailPage';
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
        <Route path="/savoir" element={<KnowledgePage />} />
      </Route>
    </Routes>
  );
}
