import { Router } from 'express';
import {
  listQuiz,
  getQuiz,
  listQuizAdmin,
  getQuizAdmin,
  createQuizController, 
  updateQuizController, 
  deleteQuizController, 
  submitQuizAttemptController,
  getQuizAttemptsController
} from '../controllers/quizzesController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/admin', verifyToken, requireRole('admin'), listQuizAdmin);
router.get('/admin/:id', verifyToken, requireRole('admin'), getQuizAdmin);
router.get('/', listQuiz);
router.get('/:id', getQuiz);
router.post('/', verifyToken, requireRole('admin'), createQuizController);
router.put('/:id', verifyToken, requireRole('admin'), updateQuizController);
router.delete('/:id', verifyToken, requireRole('admin'), deleteQuizController);

// Quiz attempts endpoints
router.post('/:id/submit', verifyToken, submitQuizAttemptController);
router.get('/:id/attempts', verifyToken, requireRole('admin'), getQuizAttemptsController);

export default router;
