import { Router } from 'express';
import { getAllUserAttemptsController } from '../controllers/quizzesController.js';
import {
  getUserPreferencesController,
  updateUserPreferencesController,
} from '../controllers/userPreferencesController.js';
import {
  createUserController,
  deleteMyAccount,
  deleteUserController,
  getMyProfile,
  getUser,
  listUsers,
  updateMyProfile,
  updateUserController,
} from '../controllers/usersController.js';
import { requireRole, verifyToken } from '../middlewares/auth.js';

const router = Router();

/**
 * 👤 Ruta para obtener el perfil del usuario autenticado
 * Disponible para cualquier usuario con token válido.
 * Endpoint: GET /api/users/me
 */
router.get('/me', verifyToken, getMyProfile);
router.put('/me', verifyToken, updateMyProfile);
router.delete('/me', verifyToken, deleteMyAccount);

/**
 * 👤 Rutas de preferencias de usuario
 * Disponibles para el propio usuario o admin
 */
router.get('/:id/preferences', verifyToken, getUserPreferencesController);
router.put('/:id/preferences', verifyToken, updateUserPreferencesController);

/**
 * 👤 Rutas de quiz attempts de usuario
 * Disponibles para el propio usuario o admin
 */
router.get('/:userId/quiz-attempts', verifyToken, getAllUserAttemptsController);

/**
 * 🔒 Rutas protegidas solo para administradores
 */
router.use(verifyToken, requireRole('admin'));

router.get('/', listUsers); // Listar todos los usuarios (solo admin)
router.get('/:id', getUser); // Obtener usuario por ID (solo admin)
router.post('/', createUserController); // Crear usuario (solo admin)
router.put('/:id', updateUserController); // Actualizar usuario (solo admin)
router.delete('/:id', deleteUserController); // Eliminar usuario (solo admin)

export default router;
