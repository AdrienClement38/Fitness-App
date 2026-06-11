import {Router} from 'express';
import {
  getPrinciples,
  getRepSchemes,
  getSources,
  getSplits,
  getVolumeLandmarks,
} from '../repositories/knowledgeRepository';

const router = Router();

const handle = (fn: () => Promise<unknown>, label: string) => async (_req: unknown, res: import('express').Response) => {
  try {
    res.json(await fn());
  } catch (err) {
    console.error(`[knowledge/${label}]`, err);
    res.status(500).json({error: 'Erreur serveur.'});
  }
};

router.get('/principles', handle(getPrinciples, 'principles'));
router.get('/rep-schemes', handle(getRepSchemes, 'rep-schemes'));
router.get('/volume-landmarks', handle(getVolumeLandmarks, 'volume-landmarks'));
router.get('/splits', handle(getSplits, 'splits'));
router.get('/sources', handle(getSources, 'sources'));

export default router;
