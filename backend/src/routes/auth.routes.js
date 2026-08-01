import { Router } from 'express';
import {
  adminLogin,
  adminLogout,
  adminSession,
  googleLogin,
  login,
  register,
  validateToken,
} from '../controllers/authController.js';
import { requireAdminSession, requireRole, verifyToken } from '../middlewares/auth.js';
import { createRateLimiter } from '../middlewares/rateLimit.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import { body } from 'express-validator';

const router = Router();

function loginRateLimitKey(req) {
  const email = typeof req.body?.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : 'unknown';
  return `${req.ip || 'unknown'}:${email}`;
}

const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: loginRateLimitKey,
  code: 'LOGIN_RATE_LIMIT_EXCEEDED',
  message: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en unos minutos.',
});

const registerRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  code: 'REGISTER_RATE_LIMIT_EXCEEDED',
  message: 'Demasiados registros desde este origen. Intenta nuevamente más tarde.',
});

const googleRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  code: 'GOOGLE_LOGIN_RATE_LIMIT_EXCEEDED',
});

const registerValidators = [
  body('name')
    .isString().withMessage('El nombre debe ser texto')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('El nombre debe tener entre 1 y 100 caracteres'),
  body('email')
    .isString().withMessage('El correo debe ser texto')
    .trim()
    .isLength({ max: 254 }).withMessage('El correo es demasiado largo')
    .isEmail().withMessage('El correo no es válido')
    .customSanitizer((value) => value.trim().toLowerCase()),
  body('password')
    .isString().withMessage('La contraseña debe ser texto')
    .isLength({ min: 9, max: 128 }).withMessage('La contraseña debe tener entre 9 y 128 caracteres'),
  body('district')
    .optional()
    .isString().withMessage('El distrito debe ser texto')
    .trim()
    .isLength({ max: 100 }).withMessage('El distrito es demasiado largo'),
];

const loginValidators = [
  body('email')
    .isString().withMessage('El correo debe ser texto')
    .trim()
    .isLength({ max: 254 }).withMessage('El correo es demasiado largo')
    .isEmail().withMessage('El correo no es válido')
    .customSanitizer((value) => value.trim().toLowerCase()),
  body('password')
    .isString().withMessage('La contraseña debe ser texto')
    .isLength({ min: 1, max: 128 }).withMessage('La contraseña no es válida'),
];

const googleValidators = [
  body('idToken').isString().notEmpty().withMessage('idToken requerido'),
  body('isRegister').optional().isBoolean().withMessage('isRegister debe ser booleano'),
];

router.post('/register', registerRateLimit, registerValidators, validateRequest, register);
router.post('/login', loginRateLimit, loginValidators, validateRequest, login);
router.post('/admin/login', loginRateLimit, loginValidators, validateRequest, adminLogin);
router.get('/admin/session', verifyToken, requireAdminSession, requireRole('admin'), adminSession);
router.post('/admin/logout', verifyToken, requireAdminSession, requireRole('admin'), adminLogout);
router.post('/google', googleRateLimit, googleValidators, validateRequest, googleLogin);
router.get('/validate', verifyToken, validateToken);

export default router;
