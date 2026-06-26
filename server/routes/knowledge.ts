import {Router} from 'express';
import {
  getPrinciples,
  getRepSchemes,
  getSources,
  getSplits,
  getVolumeLandmarks,
} from '../repositories/knowledgeRepository';
import {cacheStatic} from '../cache';

const router = Router();

const handle = (fn: () => Promise<unknown>, label: string) => async (_req: unknown, res: import('express').Response) => {
  try {
    res.json(await fn());
  } catch (err) {
    console.error(`[knowledge/${label}]`, err);
    res.status(500).json({error: 'Erreur serveur.'});
  }
};

router.get('/principles', cacheStatic(), handle(getPrinciples, 'principles'));
router.get('/rep-schemes', cacheStatic(), handle(getRepSchemes, 'rep-schemes'));
router.get('/volume-landmarks', cacheStatic(), handle(getVolumeLandmarks, 'volume-landmarks'));
router.get('/splits', cacheStatic(), handle(getSplits, 'splits'));
router.get('/sources', cacheStatic(), handle(getSources, 'sources'));

export default router;
