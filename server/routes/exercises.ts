import {Router} from 'express';
import {getExerciseById, getFacets, listExercises} from '../repositories/exerciseRepository';

const router = Router();

/** Coerce un paramètre de requête en string simple (ignore les tableaux). */
const q = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);

// GET /api/exercises/facets — valeurs disponibles pour les filtres.
router.get('/facets', async (_req, res) => {
  try {
    res.json(await getFacets());
  } catch (err) {
    console.error('[exercises/facets]', err);
    res.status(500).json({error: 'Erreur serveur.'});
  }
});

// GET /api/exercises — liste filtrée + paginée.
router.get('/', async (req, res) => {
  try {
    const result = await listExercises({
      search: q(req.query.search),
      muscle: q(req.query.muscle),
      equipment: q(req.query.equipment),
      level: q(req.query.level),
      category: q(req.query.category),
      force: q(req.query.force),
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('[exercises]', err);
    res.status(500).json({error: 'Erreur serveur.'});
  }
});

// GET /api/exercises/:id — fiche détaillée.
router.get('/:id', async (req, res) => {
  try {
    const exercise = await getExerciseById(req.params.id);
    if (!exercise) {
      res.status(404).json({error: 'Exercice introuvable.'});
      return;
    }
    res.json(exercise);
  } catch (err) {
    console.error('[exercises/:id]', err);
    res.status(500).json({error: 'Erreur serveur.'});
  }
});

export default router;
