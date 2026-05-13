import { Router } from 'express';
import { getDashboardStats } from '../controllers/statsController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

// Todas las estadísticas requieren ser admin
router.get('/dashboard', verifyToken, requireRole('admin'), getDashboardStats);

export default router;
