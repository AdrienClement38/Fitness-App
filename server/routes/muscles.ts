import {Router} from 'express';
import {getMuscleById, listMuscles} from '../repositories/muscleRepository';

const router = Router();

// GET /api/muscles — liste (avec groupe).
router.get('/', async (_req, res) => {
  try {
    res.json(await listMuscles());
  } catch (err) {
    console.error('[muscles]', err);
    res.status(500).json({error: 'Erreur serveur.'});
  }
});

// GET /api/muscles/:id — fiche muscle + exercices ciblant ce muscle.
router.get('/:id', async (req, res) => {
  try {
    const muscle = await getMuscleById(req.params.id);
    if (!muscle) {
      res.status(404).json({error: 'Muscle introuvable.'});
      return;
    }
    res.json(muscle);
  } catch (err) {
    console.error('[muscles/:id]', err);
    res.status(500).json({error: 'Erreur serveur.'});
  }
});

export default router;
