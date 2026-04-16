import { Router } from 'express';
import { 
  listCategories, 
  getCategory, 
  createCategoryController, 
  updateCategoryController, 
  deleteCategoryController,
  getCategoryStatsController
} from '../controllers/categoriesController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

// Rutas públicas
router.get('/', listCategories);
router.get('/stats', getCategoryStatsController);
router.get('/:id', getCategory);

// Rutas protegidas (solo admin)
router.post('/', verifyToken, requireRole('admin'), createCategoryController);
router.put('/:id', verifyToken, requireRole('admin'), updateCategoryController);
router.delete('/:id', verifyToken, requireRole('admin'), deleteCategoryController);

export default router;