import { Router } from 'express';
import {
  listCultures,
  getCulture,
  createCultureController,
  updateCultureController,
  deleteCultureController,
  getCultureStatsController
} from '../controllers/culturesController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', listCultures);
router.get('/stats', getCultureStatsController);
router.get('/:id', getCulture);
router.post('/', verifyToken, requireRole('admin'), createCultureController);
router.put('/:id', verifyToken, requireRole('admin'), updateCultureController);
router.delete('/:id', verifyToken, requireRole('admin'), deleteCultureController);

export default router;