import {Router} from 'express';
import {getProgramById, listPrograms} from '../repositories/programRepository';
import {getUserFromRequest} from '../auth';
import {hasEquipmentPref} from '../../src/lib/equipment';

const router = Router();

// GET /api/programs — liste des programmes (+ drapeau « faisable » si matériel renseigné).
router.get('/', async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    // Préférence renseignée (même vide = « zéro matériel ») -> faisabilité calculée ; sinon neutre.
    const owned = user && hasEquipmentPref(user.equipment) ? user.equipment : undefined;
    res.json(await listPrograms(owned));
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
