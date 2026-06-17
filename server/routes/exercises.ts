import {Router} from 'express';
import {getExerciseById, getFacets, listExercises, stretchSuggestionsFor} from '../repositories/exerciseRepository';
import {getUserFromRequest} from '../auth';
import {hasEquipmentPref} from '../../src/lib/equipment';

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

// GET /api/exercises/stretch-suggestions?ids=... — étirements ciblant les muscles travaillés.
router.get('/stretch-suggestions', async (req, res) => {
  try {
    const ids = q(req.query.ids)?.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 60) ?? [];
    res.json({items: await stretchSuggestionsFor(ids)});
  } catch (err) {
    console.error('[exercises/stretch-suggestions]', err);
    res.status(500).json({error: 'Erreur serveur.'});
  }
});

// GET /api/exercises — liste filtrée + paginée.
router.get('/', async (req, res) => {
  try {
    // Matériel de l'utilisateur connecté (cookie de session) : si renseigné, la liste
    // remonte les exercices faisables en premier (mise en avant). Sinon liste neutre.
    const user = await getUserFromRequest(req);
    // Préférence renseignée (tableau présent, MÊME vide) -> mise en avant active. Une liste
    // vide est une vraie préférence « zéro matériel » : on met alors en avant le poids du
    // corps / étirements / cardio extérieur (canDoExercise gère owned=[]). Non renseignée
    // (null/undefined) -> liste neutre.
    const owned = user && hasEquipmentPref(user.equipment) ? user.equipment : undefined;
    const result = await listExercises({
      search: q(req.query.search),
      muscle: q(req.query.muscle),
      equipment: q(req.query.equipment),
      level: q(req.query.level),
      category: q(req.query.category),
      force: q(req.query.force),
      ids: q(req.query.ids)?.split(',').filter(Boolean),
      page: req.query.page ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      owned,
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
