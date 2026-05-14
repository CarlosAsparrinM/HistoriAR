import { Router } from 'express';
import {
  createTourController,
  deleteTourController,
  getTourController,
  getToursByInstitutionController,
  listToursController,
  updateTourController,
} from '../controllers/toursController.js';
import { requireRole, verifyToken } from '../middlewares/auth.js';

const router = Router();

// Public routes
router.get('/', listToursController);
router.get('/institution/:institutionId', getToursByInstitutionController);
router.get('/:id', getTourController);

// Admin routes
router.post('/', verifyToken, requireRole('admin'), createTourController);
router.put('/:id', verifyToken, requireRole('admin'), updateTourController);
router.delete('/:id', verifyToken, requireRole('admin'), deleteTourController);

export default router;
