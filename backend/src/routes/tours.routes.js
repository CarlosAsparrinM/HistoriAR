import { Router } from 'express';
import {
  createTourController,
  deleteTourController,
  getTourController,
  getToursByInstitutionController,
  listToursController,
  updateTourController,
} from '../controllers/toursController.js';
import {
  getUserTourSessionsController,
  rateTourSessionController,
  startTourSessionController,
  stopTourSessionController,
} from '../controllers/tourSessionsController.js';
import { requireRole, verifyToken } from '../middlewares/auth.js';

const router = Router();

// Public routes
router.get('/', listToursController);
router.get('/institution/:institutionId', getToursByInstitutionController);
// Session endpoints: start/stop/rate/get user sessions
router.post('/:id/start', verifyToken, startTourSessionController);
router.post('/sessions/:sessionId/stop', verifyToken, stopTourSessionController);
router.post('/sessions/:sessionId/rate', verifyToken, rateTourSessionController);
router.get('/sessions/me', verifyToken, getUserTourSessionsController);
router.get('/:id', getTourController);

// Admin routes
router.post('/', verifyToken, requireRole('admin'), createTourController);
router.put('/:id', verifyToken, requireRole('admin'), updateTourController);
router.delete('/:id', verifyToken, requireRole('admin'), deleteTourController);

export default router;
