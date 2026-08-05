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
  getQuizAttemptsController,
  getMyAttemptsController,
} from '../controllers/quizzesController.js';
import { verifyToken, requireRole } from '../middlewares/auth.js';
import createRateLimiter from '../middlewares/rateLimit.js';

const router = Router();

const quizSubmitLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) =>
    `${req.user?.id || 'anon'}_${req.ip || req.socket?.remoteAddress || 'unknown'}`,
  message: 'Demasiados intentos de quiz. Intenta nuevamente en un minuto.',
});

router.get('/admin', verifyToken, requireRole('admin'), listQuizAdmin);
router.get('/admin/:id', verifyToken, requireRole('admin'), getQuizAdmin);
router.get('/my-attempts', verifyToken, getMyAttemptsController);
router.get('/', listQuiz);
router.get('/:id', getQuiz);
router.post('/', verifyToken, requireRole('admin'), createQuizController);
router.put('/:id', verifyToken, requireRole('admin'), updateQuizController);
router.delete('/:id', verifyToken, requireRole('admin'), deleteQuizController);

// Quiz attempts endpoints
router.post('/:id/submit', verifyToken, quizSubmitLimiter, submitQuizAttemptController);
router.get('/:id/attempts', verifyToken, requireRole('admin'), getQuizAttemptsController);

export default router;
