import {Router} from 'express';
import {getProgramById, listPrograms} from '../repositories/programRepository';

const router = Router();

// GET /api/programs — liste des programmes.
router.get('/', async (_req, res) => {
  try {
    res.json(await listPrograms());
  } catch (err) {
    console.error('[programs]', err);
    res.status(500).json({error: 'Erreur serveur.'});
  }
});

// GET /api/programs/:id — programme détaillé (séances + exercices).
router.get('/:id', async (req, res) => {
  try {
    const program = await getProgramById(req.params.id);
    if (!program) {
      res.status(404).json({error: 'Programme introuvable.'});
      return;
    }
    res.json(program);
  } catch (err) {
    console.error('[programs/:id]', err);
    res.status(500).json({error: 'Erreur serveur.'});
  }
});

export default router;
