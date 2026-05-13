import { Router } from 'express';
import { login, register, validateToken, googleLogin } from '../controllers/authController.js';
import { verifyToken } from '../middlewares/auth.js';
import { body } from 'express-validator';

const router = Router();

router.post('/register', [ body('name').notEmpty(), body('email').isEmail() ], register);
router.post('/login',    [ body('email').isEmail(), body('password').notEmpty() ], login);
router.post('/google',   [ body('idToken').notEmpty() ], googleLogin);
router.get('/validate', verifyToken, validateToken);

export default router;
